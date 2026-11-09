import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep admin, auth flows, API endpoints out of search engines
        // and LLM crawlers. /api routes are gated anyway but there's
        // no reason for them to be indexed either.
        disallow: ["/admin/", "/admin", "/auth/", "/api/"],
      },
    ],
    sitemap: "https://specialsitsintel.com/sitemap.xml",
    host: "https://specialsitsintel.com",
  };
}
