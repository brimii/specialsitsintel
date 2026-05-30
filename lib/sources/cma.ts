import "server-only";

const UA = process.env.SEC_EDGAR_UA ?? "SpecialSitsIntel research@specialsitsintel.com";

export type CmaCase = {
  source: "CMA";
  title: string;
  url: string;
  date: string; // YYYY-MM-DD
  summary: string;
};

function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

// CMA cases are published as an Atom feed on gov.uk — public and free.
// https://www.gov.uk/cma-cases.atom
export async function fetchCmaCases(opts: { daysBack?: number; limit?: number } = {}): Promise<CmaCase[]> {
  const daysBack = opts.daysBack ?? 30;
  const limit = opts.limit ?? 50;
  const res = await fetch("https://www.gov.uk/cma-cases.atom", {
    headers: { "User-Agent": UA, Accept: "application/atom+xml" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`CMA atom ${res.status}`);
  const xml = await res.text();
  const cutoff = new Date(Date.now() - daysBack * 86400000);
  const entries = Array.from(xml.matchAll(/<entry\b[\s\S]*?<\/entry>/g)).map((m) => m[0]);

  const cases: CmaCase[] = [];
  for (const entry of entries) {
    const title = unescapeXml(entry.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? "");
    const link = entry.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? "";
    const updated = entry.match(/<updated>([^<]+)<\/updated>/)?.[1] ?? "";
    const summary = unescapeXml(
      entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1]?.trim() ??
        entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1]?.trim() ??
        "",
    );
    if (!title || !link) continue;
    if (updated && new Date(updated) < cutoff) continue;
    cases.push({
      source: "CMA",
      title,
      url: link.startsWith("http") ? link : `https://www.gov.uk${link}`,
      date: updated.slice(0, 10),
      summary,
    });
    if (cases.length >= limit) break;
  }
  return cases;
}

// Fetches the case detail page text (HTML stripped, truncated) so the
// extractor has enough context to decide if it's a deal and structure it.
export async function fetchCmaCaseText(url: string, maxChars = 30000): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
  if (!res.ok) return "";
  const html = await res.text();
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return unescapeXml(text).slice(0, maxChars);
}
