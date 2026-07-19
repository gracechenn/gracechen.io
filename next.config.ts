import type { NextConfig } from "next";

// Old → new archive slugs after normalizing to the `[title]-[year]` convention.
// Each entry keeps a previously-published `/archive/<old>` URL resolving by
// redirecting it to its renamed `/archive/<new>` page.
const ARCHIVE_REDIRECTS: Record<string, string> = {
  "about-old": "about-2022",
  "play-old": "play-2022",
  "readly-old": "readly-2022",
  read: "readly-2023",
  "bwxd-old": "bwxd-2022",
  "better-world": "bwxd-2023",
  "brown-opp": "brown-opportunities-2022",
  "brown-opportunity": "brown-opportunities-2023",
  hackatbrown: "hackatbrown-2022",
  "art-prints": "art-prints-2022",
  roblox: "roblox-moments-2024",
  "roblox-growth": "roblox-moments-2023",
  hab: "hackatbrown-2023",
  "roblox-2023-old": "roblox-talent-hub-2022",
  // Intermediate names from the first rename pass, corrected here.
  "roblox-2023-social": "hackatbrown-2023",
  "roblox-2022": "roblox-talent-hub-2023",
  "roblox-2022-old": "roblox-talent-hub-2022",
  // Renamed the two 2023 Roblox pages to the "moments" line (growth → 2023,
  // reimagining-discovery → 2024); keep the prior `[title]-[year]` slugs resolving.
  "roblox-2023-growth": "roblox-moments-2023",
  "roblox-2023": "roblox-moments-2024",
};

const nextConfig: NextConfig = {
  // Archived pages are the raw, verbatim Webflow export served as static files
  // from `public/archive/` (self-contained: Webflow's own CSS + webflow.js/jQuery
  // runtime + assets). Their canonical URLs are extensionless (`/archive/<slug>`),
  // so map those to the underlying static `.html` file. The pages' own relative
  // asset/cross-links (`css/…`, `js/…`, `images/…`, `<slug>.html`) resolve under
  // `/archive/` natively from `public/`.
  async rewrites() {
    return [{ source: "/archive/:slug", destination: "/archive/:slug.html" }];
  },
  // Preserve old archive URLs after the `[title]-[year]` slug rename. Redirects
  // run before rewrites, so `/archive/<old>` → `/archive/<new>` → `<new>.html`.
  async redirects() {
    return Object.entries(ARCHIVE_REDIRECTS).map(([from, to]) => ({
      source: `/archive/${from}`,
      destination: `/archive/${to}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
