# gracechen.io

Grace Chen's portfolio — migrated off Webflow into a clean, self-contained
[Next.js](https://nextjs.org) (App Router + TypeScript) project. No Webflow
runtime, no Webflow-hosted assets, no `w-*` class coupling. Deploys on Vercel
with zero extra configuration.

## What this is

- **Live site** — three pages that make up the public portfolio:
  - `/` — Work / home
  - `/play` — Playground
  - `/about` — About
- **Archive** — every older/unlinked page from the original Webflow project is
  preserved (verbatim, but cleaned) under `/archive/<original-filename>` so old
  deep links keep working. Browse them at [`/archive`](/archive). Archived pages
  are excluded from the sitemap and marked `noindex`, but remain directly
  reachable.

## Tech stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Plain CSS: the Webflow design system was **kept and cleaned** (renamed,
  de-coupled) rather than re-authored, to stay faithful to the original visuals.
  It lives in [`src/styles/main.css`](src/styles/main.css).
- [`gsap`](https://gsap.com) + [`lenis`](https://lenis.darkroom.engineering) —
  the only two runtime libraries (self-hosted via npm, previously loaded from a
  CDN). They power the home scroll animation and smooth scrolling.

## How the migration works

Because these are design-heavy Webflow pages with thousands of inline styles,
each page's cleaned markup is stored as a static HTML fragment in
[`src/content/`](src/content) and injected by a small server component
([`PageShell`](src/components/PageShell.tsx)). This keeps every page
pixel-faithful to the export. The interactivity Webflow's runtime used to provide
(custom cursor, mobile nav, tabs, smooth scroll, scroll/hover animations, sparkle
trail) is re-authored as a handful of clean client behaviors in
[`PageBehaviors`](src/components/PageBehaviors.tsx).

The one-time cleaning pipeline is [`scripts/migrate.mjs`](scripts/migrate.mjs).
It strips all Webflow coupling, renames the forbidden `w-*` utility classes,
rewrites every asset reference to a root-relative `/assets/…` path, remaps
internal links to Next routes, and copies only the assets actually referenced by
the migrated pages into `public/assets/`. You do not need to run it again — its
output is committed. (It expects the original export at the path passed as its
first argument.)

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build

```bash
npm run build
npm run start
```

## Deploying to GitHub + Vercel

### 1. Push to GitHub

Create an empty repository on GitHub (no README/…/.gitignore), then:

```bash
git remote add origin https://github.com/<your-username>/gracechen.io.git
git push -u origin main
```

### 2. Import into Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub repo.
2. Vercel auto-detects Next.js — **no configuration needed**. Framework preset
   "Next.js", build command `next build`, output handled automatically.
3. Click **Deploy**. You'll get a `*.vercel.app` URL.

### 3. Attach the custom domain `gracechen.io` (registered at Squarespace)

1. In the Vercel project: **Settings → Domains → Add** and enter `gracechen.io`
   (add `www.gracechen.io` too if you want the `www` variant).
2. Vercel will show the exact DNS records to create. They are typically:
   - **Apex `gracechen.io`** → an **A** record pointing to `76.76.21.21`
   - **`www`** → a **CNAME** record pointing to `cname.vercel-dns.com`
3. In **Squarespace → Settings → Domains → gracechen.io → DNS settings**, add the
   records Vercel showed you:
   - A record: Host `@`, Value `76.76.21.21`
   - CNAME: Host `www`, Value `cname.vercel-dns.com`
   Remove any conflicting default A/CNAME records for the same hosts.
4. Back in Vercel, wait for the domain to verify (DNS can take up to ~48h, usually
   minutes). Vercel provisions the SSL certificate automatically.

> Always follow the exact records Vercel displays for your project — the apex IP
> and CNAME target above are the current Vercel defaults and may change.

## Project structure

```
src/
  app/
    page.tsx              # /            (home)
    play/page.tsx         # /play
    about/page.tsx        # /about
    not-found.tsx         # 404
    archive/page.tsx      # /archive     (index of archived pages)
    archive/[slug]/page.tsx  # /archive/<original-filename>
    robots.ts             # disallows /archive
    sitemap.ts            # live pages only
    layout.tsx            # metadata, fonts, favicon, global CSS
  components/
    PageShell.tsx         # injects a cleaned page fragment + its behaviors
    PageBehaviors.tsx     # re-authored client interactivity
  content/                # cleaned, self-contained HTML fragments + manifest.json
  lib/                    # content loader + per-page behavior config
  styles/main.css         # cleaned Webflow design system
public/assets/            # images, videos, fonts, documents (referenced only)
scripts/migrate.mjs       # one-time Webflow → clean-code pipeline
```
