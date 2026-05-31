import "server-only";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// HKEX disclosure headlines are normally all-caps with the regulatory
// category up front. Filter to M&A / event-driven categories — strips ~90%
// of noise (earnings, monthly returns, board changes, etc.) before sending
// to Claude.
const MA_KEYWORDS = [
  "DISCLOSEABLE TRANSACTION",
  "VERY SUBSTANTIAL ACQUISITION",
  "VERY SUBSTANTIAL DISPOSAL",
  "MAJOR TRANSACTION",
  "MAJOR AND CONNECTED",
  "CONNECTED TRANSACTION",
  "COMPOSITE DOCUMENT",
  "JOINT ANNOUNCEMENT",
  "PRE-CONDITIONAL VOLUNTARY",
  "MANDATORY UNCONDITIONAL CASH OFFER",
  "VOLUNTARY CONDITIONAL CASH OFFER",
  "VOLUNTARY GENERAL OFFER",
  "PROPOSED PRIVATISATION",
  "SCHEME OF ARRANGEMENT",
  "TAKEOVERS CODE",
  "OFFER UNDER",
  "RESPONSE TO OFFER",
  "OFFEROR",
  "POSSIBLE OFFER",
  "FIRM INTENTION",
];

export type HkexDisclosure = {
  source: "HKEX";
  date: string; // YYYY-MM-DD
  code: string; // 5-digit stock code (e.g. "00700" Tencent, "09988" Alibaba)
  company: string;
  title: string;
  url: string; // disclosure PDF/HTM URL
};

function hkexUrlForDay(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `https://www1.hkexnews.hk/listedco/listconews/sehk/${yyyy}/${mm}${dd}/index_e.htm`;
}

async function fetchHkexDay(date: Date): Promise<HkexDisclosure[]> {
  const url = hkexUrlForDay(date);
  const dateStr = date.toISOString().slice(0, 10);
  const res = await fetch(url, {
    headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
    cache: "no-store",
  });
  console.log(`[hkex] ${dateStr}: ${res.status} ${url}`);
  if (!res.ok) return [];
  const html = await res.text();

  // HKEX daily index pages list disclosures with: release time, 5-digit
  // stock code, short name, headline (with a PDF link). The layout has
  // shifted over the years; we anchor loosely on "5-digit code somewhere
  // in the row, followed by a PDF anchor with the headline as link text".
  const rowRe =
    /<tr[^>]*>[\s\S]{0,3000}?(\d{5})[\s\S]{0,2000}?<a[^>]+href="([^"]+\.(?:pdf|htm))"[^>]*>\s*([^<][^<]{5,})\s*<\/a>/gi;

  const out: HkexDisclosure[] = [];
  for (const m of html.matchAll(rowRe)) {
    const [, code, href, rawTitle] = m;
    const title = rawTitle.replace(/\s+/g, " ").trim();
    if (!title) continue;
    const fullUrl = href.startsWith("http")
      ? href
      : `https://www1.hkexnews.hk${href.startsWith("/") ? "" : "/"}${href}`;
    out.push({
      source: "HKEX",
      date: dateStr,
      code,
      company: "",
      title,
      url: fullUrl,
    });
  }
  console.log(`[hkex] ${dateStr}: parsed ${out.length} disclosure rows`);

  // Diagnostic: when the regex matches nothing, dump key structural anchors
  // so we can correct the parser from the dev terminal without curl access
  // (HKEX may or may not be on the cloud container's allowlist).
  if (out.length === 0 && html.length > 0) {
    const trCount = (html.match(/<tr/gi) ?? []).length;
    const codeMatches = (html.match(/\b\d{5}\b/g) ?? []).length;
    const pdfHrefs = (html.match(/href="[^"]*\.pdf"/gi) ?? []).slice(0, 3);
    console.log(
      `[hkex][diag] htmlLen=${html.length} trs=${trCount} 5digitCodes=${codeMatches} pdfHrefs=${pdfHrefs.length}`,
    );
    if (pdfHrefs.length) console.log(`[hkex][diag] first pdfs: ${pdfHrefs.join(" | ")}`);
    const sample = html.slice(0, 2500).replace(/\s+/g, " ");
    console.log(`[hkex][diag] head sample: ${sample}`);
  }
  return out;
}

export async function fetchHkexDisclosures(
  opts: { daysBack?: number; limit?: number } = {},
): Promise<HkexDisclosure[]> {
  const daysBack = opts.daysBack ?? 7;
  const limit = opts.limit ?? 40;
  const all: HkexDisclosure[] = [];

  for (let i = 0; i < daysBack; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    try {
      const day = await fetchHkexDay(d);
      all.push(...day);
    } catch (e) {
      console.log(`[hkex] day ${i} failed: ${(e as Error).message}`);
    }
  }

  // Keyword pre-filter — case-insensitive substring match against the
  // headline. HKEX titles are usually all-caps but be defensive.
  const filtered = all.filter((d) =>
    MA_KEYWORDS.some((kw) => d.title.toUpperCase().includes(kw)),
  );
  console.log(`[hkex] keyword-filtered ${filtered.length} M&A-relevant of ${all.length} total`);
  return filtered.slice(0, limit);
}
