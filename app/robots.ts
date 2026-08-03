import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /admin (dashboard), /api (backend), /customer (capability-token
      // pages — unguessable per-session URLs, must never index).
      disallow: ["/admin", "/api", "/customer"],
    },
    sitemap: "https://nuqra.org/sitemap.xml",
  };
}
