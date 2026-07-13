import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/archive",
    },
    sitemap: "https://gracechen.io/sitemap.xml",
    host: "https://gracechen.io",
  };
}
