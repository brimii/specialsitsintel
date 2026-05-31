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

// The servlet returns JSON shaped like { result: "<stringified JSON array>" }
// where each array entry is a disclosure record with STOCK_CODE / STOCK_NAME /
// TITLE / FILE_LINK / DATE_TIME / LONG_TEXT (the category, e.g.
// "Announcements and Notices - [Discloseable Transaction]"). Filter on the
// combined category + title text — HKEX categorises every disclosure, so the
// category labels are the most reliable M&A signal.
type HkexRow = {
  STOCK_CODE?: string;
  STOCK_NAME?: string;
  TITLE?: string;
  FILE_LINK?: string;
  DATE_TIME?: string;
  LONG_TEXT?: string;
  SHORT_TEXT?: string;
};

function parseDisclosureJson(body: string, limit: number): HkexDisclosure[] {
  let outer: { result?: string };
  try {
    outer = JSON.parse(body);
  } catch {
    return [];
  }
  if (!outer.result) return [];
  let rows: HkexRow[];
  try {
    rows = JSON.parse(outer.result) as HkexRow[];
  } catch {
    return [];
  }

  const out: HkexDisclosure[] = [];
  for (const r of rows) {
    if (out.length >= limit) break;
    const code = String(r.STOCK_CODE ?? "").trim();
    const company = String(r.STOCK_NAME ?? "").trim();
    const title = String(r.TITLE ?? "").replace(/\s+/g, " ").trim();
    const fileLink = String(r.FILE_LINK ?? "").trim();
    const category = String(r.LONG_TEXT ?? r.SHORT_TEXT ?? "").trim();
    if (!code || !title || !fileLink) continue;

    // HKEX puts the regulatory category in LONG_TEXT (e.g. "Announcements and
    // Notices - [Discloseable Transaction]"). The TITLE is the headline,
    // usually all-caps. Match against both together.
    const haystack = (category + " " + title).toUpperCase();
    const isMA = MA_KEYWORDS.some((kw) => haystack.includes(kw));
    if (!isMA) continue;

    const url = fileLink.startsWith("http")
      ? fileLink
      : `https://www1.hkexnews.hk${fileLink.startsWith("/") ? "" : "/"}${fileLink}`;

    // Parse "31/05/2026 19:59" → "2026-05-31".
    const dt = String(r.DATE_TIME ?? "");
    const dm = dt.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    const date = dm
      ? `${dm[3]}-${dm[2]}-${dm[1]}`
      : new Date().toISOString().slice(0, 10);

    out.push({ source: "HKEX", date, code, company, title, url });
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
          Accept: "application/json,text/html,application/xhtml+xml",
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

  // Filtering happens inside the JSON parser so we cap on M&A-relevant rows
  // rather than walking all 3000+ daily disclosures.
  const filtered = parseDisclosureJson(html, limit);
  console.log(`[hkex] kept ${filtered.length} M&A-relevant disclosures from servlet JSON`);
  return filtered;
}
