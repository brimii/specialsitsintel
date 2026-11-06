// Shared page shell copy. Every legal page uses the same chrome so the
// branding + typography reads consistently and the footer carries the
// same "last updated" line. Changing the effective date here updates
// all four pages at once.

export const LEGAL_EFFECTIVE = "November 6, 2026";

export const LEGAL_PAGES = [
  { slug: "terms", title: "Terms of Service" },
  { slug: "privacy", title: "Privacy Policy" },
  { slug: "disclosures", title: "Disclosures & Disclaimers" },
  { slug: "methodology", title: "Methodology" },
] as const;
