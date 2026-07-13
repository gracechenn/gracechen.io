import type { MetadataRoute } from "next";

const BASE = "https://gracechen.io";

/** Only the live pages are indexed; archived pages are intentionally excluded. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["/", "/play", "/about"].map((route) => ({
    url: `${BASE}${route}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: route === "/" ? 1 : 0.8,
  }));
}
