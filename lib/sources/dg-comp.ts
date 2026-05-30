import "server-only";

const UA = process.env.SEC_EDGAR_UA ?? "SpecialSitsIntel research@specialsitsintel.com";

export type DgCompCase = {
  source: "DG COMP";
  title: string;
  url: string;
  date: string;
  summary: string;
};

// DG COMP (European Commission, Directorate-General for Competition) publishes
// merger notifications. Their site moved to https://competition-cases.ec.europa.eu/
// but their legacy "weekly e-news" RSS still surfaces new notifications:
//   https://ec.europa.eu/competition/elojade/isef/rss.cfm?proc_code=1_M
// If the legacy feed is unavailable, this fetcher fails gracefully so the
// orchestrator can keep running with CMA alone.
const DG_COMP_RSS = "https://ec.europa.eu/competition/elojade/isef/rss.cfm?proc_code=1_M";

function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

export async function fetchDgCompCases(opts: { daysBack?: number; limit?: number } = {}): Promise<DgCompCase[]> {
  const daysBack = opts.daysBack ?? 30;
  const limit = opts.limit ?? 50;
  const res = await fetch(DG_COMP_RSS, {
    headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`DG COMP RSS ${res.status}`);
  const xml = await res.text();
  const cutoff = new Date(Date.now() - daysBack * 86400000);
  const items = Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/g)).map((m) => m[0]);

  const cases: DgCompCase[] = [];
  for (const item of items) {
    const title = unescapeXml(item.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? "");
    const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? "";
    const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? "";
    const description = unescapeXml(item.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.trim() ?? "");
    if (!title || !link) continue;
    const date = pubDate ? new Date(pubDate) : null;
    if (date && date < cutoff) continue;
    cases.push({
      source: "DG COMP",
      title,
      url: link,
      date: date ? date.toISOString().slice(0, 10) : "",
      summary: description,
    });
    if (cases.length >= limit) break;
  }
  return cases;
}

// Best-effort detail page fetch — the new EU Commission site is dynamic so
// content may be lighter than CMA. We still pull whatever HTML is there.
export async function fetchDgCompCaseText(url: string, maxChars = 30000): Promise<string> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
    if (!res.ok) return "";
    const html = await res.text();
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxChars);
  } catch {
    return "";
  }
}
