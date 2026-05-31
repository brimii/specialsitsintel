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
  code: string; // 5-digit stock code
  company: string;
  title: string;
  url: string; // disclosure PDF/HTM URL
};

function ymd(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

// HKEX deprecated the per-day /listedco/listconews/sehk/YYYY/MMDD/index_e.htm
// index pages. The current public entry point is the title-search servlet,
// which accepts a date window and returns HTML rows. We try the POST form
// first (matches the official "Advanced Search" UI), then fall back to the
// GET variant of the same endpoint.
type Probe = {
  label: string;
  method: "POST" | "GET";
  url: string;
  body?: string;
  contentType?: string;
};

function buildProbes(fromDate: string, toDate: string): Probe[] {
  const params =
    `sortDir=0&sortByOptions=DateTime&category=0&market=SEHK` +
    `&stockId=-1&documentType=-1&fromDate=${fromDate}&toDate=${toDate}&searchText=&lang=EN`;
  return [
    {
      label: "titleSearchServlet POST",
      method: "POST",
      url: "https://www1.hkexnews.hk/search/titleSearchServlet.do",
      body: params,
      contentType: "application/x-www-form-urlencoded",
    },
    {
      label: "titleSearchServlet GET",
      method: "GET",
      url: `https://www1.hkexnews.hk/search/titleSearchServlet.do?${params}`,
    },
    {
      label: "advancedsearch search.aspx GET",
      method: "GET",
      url:
        `https://www1.hkexnews.hk/listedco/listconews/advancedsearch/search_active_main.aspx` +
        `?dateFrom=${fromDate}&dateTo=${toDate}&market=SEHK&lang=EN`,
    },
  ];
}

// Match a disclosure row in the servlet HTML response. The response format
// varies but consistently contains a 5-digit code, a stock name, and a PDF
// anchor whose link text is the headline. We anchor on those three pieces.
function parseDisclosureRows(html: string, fallbackDate: string): HkexDisclosure[] {
  const out: HkexDisclosure[] = [];
  // 5-digit code in a cell, then nearby a stock name cell, then later an
  // anchor to a .pdf with the headline as link text.
  const rowRe =
    /(\d{5})[\s\S]{0,1500}?<a[^>]+href="([^"]+\.(?:pdf|htm|aspx))"[^>]*>\s*([^<][^<]{8,})\s*<\/a>/gi;
  for (const m of html.matchAll(rowRe)) {
    const [, code, href, rawTitle] = m;
    const title = rawTitle.replace(/\s+/g, " ").trim();
    if (!title || title.length < 6) continue;
    const url = href.startsWith("http")
      ? href
      : `https://www1.hkexnews.hk${href.startsWith("/") ? "" : "/"}${href}`;
    // Try to pull the disclosure date from the PDF URL path (.../sehk/YYYY/MMDD/)
    const dateMatch = url.match(/\/sehk\/(\d{4})\/(\d{2})(\d{2})\//);
    const date = dateMatch
      ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
      : fallbackDate;
    out.push({ source: "HKEX", date, code, company: "", title, url });
  }
  return out;
}

export async function fetchHkexDisclosures(
  opts: { daysBack?: number; limit?: number } = {},
): Promise<HkexDisclosure[]> {
  const daysBack = opts.daysBack ?? 7;
  const limit = opts.limit ?? 40;
  const today = new Date();
  const from = new Date();
  from.setDate(from.getDate() - daysBack + 1);
  const fromDate = ymd(from);
  const toDate = ymd(today);

  let html = "";
  let usedLabel = "";
  for (const probe of buildProbes(fromDate, toDate)) {
    try {
      const init: RequestInit = {
        method: probe.method,
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/html,application/xhtml+xml",
          ...(probe.contentType ? { "Content-Type": probe.contentType } : {}),
        },
        cache: "no-store",
        ...(probe.body ? { body: probe.body } : {}),
      };
      const res = await fetch(probe.url, init);
      console.log(`[hkex] ${probe.label}: ${res.status} ${probe.url}`);
      if (!res.ok) continue;
      const body = await res.text();
      // Reject the obvious 404 boilerplate even when the server returns 200.
      if (/<title>[^<]*Hong Kong Exchanges and Clearing[^<]*<\/title>/i.test(body)
          && !/\d{5}/.test(body)) {
        console.log(`[hkex] ${probe.label}: 200 but empty/error body`);
        continue;
      }
      html = body;
      usedLabel = probe.label;
      break;
    } catch (e) {
      console.log(`[hkex] ${probe.label}: error ${(e as Error).message}`);
    }
  }

  if (!html) {
    console.log("[hkex] all probes failed — no disclosures fetched");
    return [];
  }
  console.log(`[hkex] using ${usedLabel}, body length=${html.length}`);

  const all = parseDisclosureRows(html, toDate.slice(0, 4) + "-" + toDate.slice(4, 6) + "-" + toDate.slice(6, 8));
  console.log(`[hkex] parsed ${all.length} disclosure rows from search response`);

  if (all.length === 0 && html.length > 0) {
    const codeMatches = (html.match(/\b\d{5}\b/g) ?? []).length;
    const pdfHrefs = (html.match(/href="[^"]*\.pdf"/gi) ?? []).slice(0, 5);
    console.log(`[hkex][diag] 5digitCodes=${codeMatches} pdfHrefs=${pdfHrefs.length}`);
    if (pdfHrefs.length) console.log(`[hkex][diag] first pdfs: ${pdfHrefs.join(" | ")}`);
    const sample = html.slice(0, 3000).replace(/\s+/g, " ");
    console.log(`[hkex][diag] body head: ${sample}`);
  }

  const filtered = all.filter((d) => MA_KEYWORDS.some((kw) => d.title.toUpperCase().includes(kw)));
  console.log(`[hkex] keyword-filtered ${filtered.length} M&A-relevant of ${all.length} total`);
  return filtered.slice(0, limit);
}
