import type { MetadataRoute } from "next";

// Public routes only. /admin, /auth, /api are blocked in robots.ts so
// search engines don't surface the panel or the webhook endpoints.
const BASE = "https://specialsitsintel.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const routes = [
    { url: "", changeFrequency: "daily" as const, priority: 1 },
    { url: "/home", changeFrequency: "weekly" as const, priority: 0.9 },
    { url: "/portfolio", changeFrequency: "monthly" as const, priority: 0.5 },
    { url: "/strategies", changeFrequency: "monthly" as const, priority: 0.7 },
    { url: "/market-regime", changeFrequency: "monthly" as const, priority: 0.7 },
    { url: "/historical", changeFrequency: "monthly" as const, priority: 0.6 },
    { url: "/regulators", changeFrequency: "monthly" as const, priority: 0.6 },
    { url: "/glossary", changeFrequency: "monthly" as const, priority: 0.4 },
    { url: "/legal/terms", changeFrequency: "yearly" as const, priority: 0.3 },
    { url: "/legal/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
    { url: "/legal/disclosures", changeFrequency: "yearly" as const, priority: 0.3 },
    { url: "/legal/methodology", changeFrequency: "monthly" as const, priority: 0.5 },
  ];
  return routes.map((r) => ({
    url: `${BASE}${r.url}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
