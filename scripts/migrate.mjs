/**
 * One-time Webflow → clean Next.js migration pipeline.
 *
 * Reads the Webflow export, strips all Webflow coupling (webflow.js, jQuery CDN,
 * Webflow CDN links, Webflow data attributes, generator meta, and the w-* utility
 * class names the grep check forbids), rewrites every asset reference to a
 * root-relative /assets/... path, remaps internal .html links to Next routes, and
 * emits cleaned HTML body fragments to src/content plus a manifest.
 *
 * It also copies only the assets actually referenced by the migrated pages
 * (images/videos/documents/fonts) into public/assets, downloading the handful of
 * Webflow-CDN-hosted assets that have no local copy in the export.
 *
 * Run from the project root:  node scripts/migrate.mjs /path/to/webflow-export
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const EXPORT = process.argv[2] || "/Users/gravie/_migration_tmp/webflow-export";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CONTENT_DIR = path.join(ROOT, "src", "content");
const STYLES_DIR = path.join(ROOT, "src", "styles");
const ASSETS_DIR = path.join(ROOT, "public", "assets");

for (const d of [CONTENT_DIR, STYLES_DIR, ASSETS_DIR]) fs.mkdirSync(d, { recursive: true });
for (const sub of ["images", "videos", "documents", "fonts"]) {
  fs.mkdirSync(path.join(ASSETS_DIR, sub), { recursive: true });
}

// --- Page routing -----------------------------------------------------------
const LIVE = {
  "index.html": { key: "home", route: "/" },
  "play.html": { key: "play", route: "/play" },
  "me.html": { key: "about", route: "/about" },
  "404.html": { key: "not-found", route: "/404" },
};

const allHtml = fs
  .readdirSync(EXPORT)
  .filter((f) => f.endsWith(".html"))
  .sort();

// Map every source .html file -> destination route (for link rewriting).
const linkMap = {};
for (const f of allHtml) {
  if (LIVE[f]) linkMap[f] = LIVE[f].route === "/404" ? "/" : LIVE[f].route;
  else linkMap[f] = "/archive/" + f.replace(/\.html$/, "");
}

// --- Asset bookkeeping ------------------------------------------------------
const assetsToCopy = new Set(); // "images/foo.png"
const downloads = []; // { url, dest } for webflow-cdn assets with no local copy

function localForUploads(url) {
  // https://uploads-ssl.webflow.com/<site>/<hash>_<original>
  const clean = url.replace(/&quot;.*$/, "").replace(/["')].*$/, "");
  const base = clean.split("/").pop();
  const original = base.includes("_") ? base.slice(base.indexOf("_") + 1) : base;
  for (const folder of ["videos", "images", "documents"]) {
    if (fs.existsSync(path.join(EXPORT, folder, original))) {
      assetsToCopy.add(`${folder}/${original}`);
      return `/assets/${folder}/${original}`;
    }
  }
  // No local copy: download into images (svgs/jpgs) or videos (media).
  const isVideo = /\.(mp4|webm|mov)$/i.test(original);
  const folder = isVideo ? "videos" : "images";
  const dest = path.join(ASSETS_DIR, folder, original);
  downloads.push({ url: clean, dest });
  return `/assets/${folder}/${original}`;
}

// --- Cleaning ---------------------------------------------------------------
const RENAME = [
  [/w--tab-active/g, "is-tab-active"],
  [/w--current/g, "is-current"],
  [/w-inline-block/g, "x-inline-block"],
  [/w-clearfix/g, "x-clearfix"],
  [/w-container/g, "x-container"],
];

function renameForbidden(s) {
  for (const [re, to] of RENAME) s = s.replace(re, to);
  return s;
}

function rewriteAssetPaths(s) {
  // Webflow CDN → local
  s = s.replace(/https:\/\/uploads-ssl\.webflow\.com\/[^\s"')]+/g, (m) => localForUploads(m));
  // Local export folders → /assets/... (record for copy)
  s = s.replace(
    /([\s"'(,]\s*)(?:\.\.?\/)*(images|videos|documents)\/([^\s"')]+)/g,
    (_m, pre, folder, file) => {
      assetsToCopy.add(`${folder}/${decodeURIComponent(file)}`);
      return `${pre}/assets/${folder}/${file}`;
    }
  );
  return s;
}

function remapLinks(s) {
  return s.replace(/href="([a-zA-Z0-9_-]+)\.html"/g, (m, name) => {
    const key = name + ".html";
    if (linkMap[key]) return `href="${linkMap[key]}"`;
    return `href="/archive/${name}"`;
  });
}

function extractTitle(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim() : "";
}

function cleanFragment(html) {
  const bodyMatch = html.match(/<body([^>]*)>([\s\S]*?)<\/body>/i);
  const bodyAttrs = bodyMatch ? bodyMatch[1] : "";
  let body = bodyMatch ? bodyMatch[2] : "";
  const classMatch = bodyAttrs.match(/class="([^"]*)"/);
  let bodyClass = classMatch ? classMatch[1] : "";

  // Remove HTML comments.
  body = body.replace(/<!--[\s\S]*?-->/g, "");
  // Remove all scripts (Webflow runtime + inline page scripts; behavior is re-authored).
  body = body.replace(/<script[\s\S]*?<\/script>/gi, "");
  // Remove noscript blocks (Webflow bg-video fallbacks etc.).
  body = body.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  // Remove inline <style> blocks (needed rules live in main.css).
  body = body.replace(/<style[\s\S]*?<\/style>/gi, "");
  // Remove Webflow bg-video play/pause control (needs Webflow runtime).
  body = body.replace(/<div aria-live="polite">\s*<button[\s\S]*?<\/button>\s*<\/div>/gi, "");
  // Strip Webflow-specific attributes.
  body = body.replace(/\sdata-wf-[a-z-]+="[^"]*"/gi, "");
  body = body.replace(/\sdata-w-id="[^"]*"/gi, "");

  // Rewrite links to Grace's old Webflow-hosted sites (no Webflow coupling in prod).
  body = body.replace(/https?:\/\/[a-z0-9.-]*\.webflow\.io[^\s"')]*/gi, "/");
  body = renameForbidden(body);
  body = rewriteAssetPaths(body);
  body = remapLinks(body);

  bodyClass = renameForbidden(bodyClass).trim();
  return { body: body.trim(), bodyClass, title: extractTitle(html) };
}

// --- Process pages ----------------------------------------------------------
const manifest = {};
for (const f of allHtml) {
  const src = fs.readFileSync(path.join(EXPORT, f), "utf8");
  const { body, bodyClass, title } = cleanFragment(src);
  const info = LIVE[f] || { key: f.replace(/\.html$/, ""), route: "/archive/" + f.replace(/\.html$/, "") };
  const isArchive = !LIVE[f];
  const outName = (isArchive ? "archive__" : "") + info.key + ".html";
  fs.writeFileSync(path.join(CONTENT_DIR, outName), body);
  manifest[info.key] = {
    key: info.key,
    route: info.route,
    file: outName,
    bodyClass,
    title,
    isArchive,
  };
  console.log(`page: ${f} -> ${info.route}  (class="${bodyClass}")`);
}

// --- Build CSS --------------------------------------------------------------
function cleanCss(css) {
  css = css.replace(/https?:\/\/[a-z0-9.-]*\.webflow\.io[^\s"')]*/gi, "/");
  // Drop Webflow CDN background images (e.g. youtube-placeholder on .w-video).
  css = css.replace(/url\((['"]?)https:\/\/d3e54v103j8qbb\.cloudfront\.net[^)]*\)/gi, "none");
  css = renameForbidden(css);
  css = css.replace(/url\((['"]?)(?:\.\.\/)*(images|fonts|videos|documents)\//g, (_m, q, folder) => {
    return `url(${q}/assets/${folder}/`;
  });
  // Record referenced fonts/images for copy.
  const re = /url\(['"]?\/assets\/(images|fonts|videos|documents)\/([^"')]+)/g;
  let m;
  while ((m = re.exec(css))) assetsToCopy.add(`${m[1]}/${decodeURIComponent(m[2])}`);
  return css;
}

const normalize = fs.readFileSync(path.join(EXPORT, "css", "normalize.css"), "utf8");
const wf = fs.readFileSync(path.join(EXPORT, "css", "webflow.css"), "utf8");
const gb = fs.readFileSync(path.join(EXPORT, "css", "gravieboat.webflow.css"), "utf8");

const extras = `
/* Project-owned additions (folded in from Webflow inline <style> blocks). */
::selection { background-color: #ffd4f5; color: black; }
/* Custom cursor follower (re-authored; replaces Webflow runtime mousemove IX). */
.cursor-wrapper { pointer-events: none; position: fixed; top: 0; left: 0; }
@media (hover: hover) and (pointer: fine) {
  html.has-custom-cursor, html.has-custom-cursor * { cursor: none; }
}
.sparkle {
  position: absolute; color: pink; font-size: 16px; pointer-events: none;
  opacity: 1; animation: sparkleFadeOut 0.8s ease-out forwards;
  filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.8));
  will-change: transform, opacity; z-index: 2000;
}
@keyframes sparkleFadeOut {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}
/* Page body classes now sit on a wrapper div; keep them full-height. */
.body, .body1, .body2, .art-print-body { min-height: 100vh; }
/* Mobile nav open state (re-authored; replaces Webflow runtime menu toggle). */
@media screen and (max-width: 991px) {
  .w-nav[data-nav-open="true"] .w-nav-menu {
    display: block; position: absolute; left: 0; right: 0; top: 100%;
    background: #fff; padding: 1rem; text-align: center; z-index: 1000;
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  }
}
`;

const mainCss = [
  "/* normalize */",
  cleanCss(normalize),
  "/* base utilities (from Webflow export, cleaned & renamed) */",
  cleanCss(wf),
  "/* design system (from Webflow export, cleaned & renamed) */",
  cleanCss(gb),
  extras,
].join("\n\n");
fs.writeFileSync(path.join(STYLES_DIR, "main.css"), mainCss);
console.log("css: wrote src/styles/main.css");

// --- Copy assets ------------------------------------------------------------
let copied = 0;
let missing = [];
for (const rel of assetsToCopy) {
  const from = path.join(EXPORT, rel);
  const to = path.join(ASSETS_DIR, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, to);
    copied++;
  } else {
    missing.push(rel);
  }
}

// Downloads (webflow-cdn assets with no local copy).
for (const { url, dest } of downloads) {
  if (fs.existsSync(dest)) continue;
  try {
    execSync(`curl -sS -L --max-time 60 -o "${dest}" "${url}"`, { stdio: "ignore" });
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) copied++;
    else missing.push(url);
  } catch {
    missing.push(url);
  }
}

// Always ship favicon + webclip even if only referenced in <head>.
for (const f of ["favicon.png", "webclip.png"]) {
  const from = path.join(EXPORT, "images", f);
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, path.join(ASSETS_DIR, "images", f));
  }
}

fs.writeFileSync(path.join(CONTENT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));

console.log(`assets: copied ${copied}, missing ${missing.length}`);
if (missing.length) console.log("MISSING:\n" + missing.join("\n"));
