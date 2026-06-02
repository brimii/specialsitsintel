import "server-only";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Singapore Exchange (SGX) "SGXNet" disclosure platform. SGX classifies
// each announcement with a "category" / "sub-category" — these are the
// M&A / event-driven relevant headers. Takeovers in Singapore are governed
// by the Securities Industry Council (SIC) under the Code on Takeovers and
// Mergers.
const MA_KEYWORDS = [
  "VOLUNTARY GENERAL OFFER",
  "VOLUNTARY CONDITIONAL OFFER",
  "VOLUNTARY UNCONDITIONAL OFFER",
  "MANDATORY CONDITIONAL CASH OFFER",
  "MANDATORY CONDITIONAL OFFER",
  "MANDATORY UNCONDITIONAL OFFER",
  "OFFER DOCUMENT",
  "OFFEREE CIRCULAR",
  "OFFEROR",
  "SCHEME OF ARRANGEMENT",
  "COMPULSORY ACQUISITION",
  "PROPOSED ACQUISITION",
  "PROPOSED DISPOSAL",
  "PROPOSED MERGER",
  "DISCLOSEABLE TRANSACTION",
  "MAJOR TRANSACTION",
  "VERY SUBSTANTIAL ACQUISITION",
  "VERY SUBSTANTIAL DISPOSAL",
  "INTERESTED PERSON TRANSACTION",
  "TAKEOVER",
  "FIRM INTENTION",
  "PRE-CONDITIONAL",
  "DELISTING",
  "EXIT OFFER",
  "RESPONSE TO OFFER",
  "RESPONSE TO TAKEOVER",
  "POSSIBLE OFFER",
];

export type SgxDisclosure = {
  source: "SGX";
  date: string; // YYYY-MM-DD
  code: string; // 3-4 char SGX ticker (e.g. "D05" DBS, "U11" UOB, "Z74" SingTel)
  company: string;
  title: string;
  url: string;
};

type Probe = {
  label: string;
  url: string;
  headers?: Record<string, string>;
};

// Build a UTC YYYYMMDD_000000 timestamp for the SGX API's periodstart /
// periodend params. SGX accepts either compact (YYYYMMDD) or with time.
function ymd(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function buildProbes(daysBack: number): Probe[] {
  const now = new Date();
  const from = new Date();
  from.setDate(from.getDate() - daysBack + 1);
  const fromYmd = ymd(from);
  const toYmd = ymd(now);
  return [
    // Modern SGX API used by company-announcements page on sgx.com.
    {
      label: "sgx api announcements v1.1",
      url:
        `https://api.sgx.com/announcements/v1.1` +
        `?periodstart=${fromYmd}_000000&periodend=${toYmd}_235959&pagestart=0&pagesize=200`,
      headers: { Accept: "application/json" },
    },
    // Same endpoint without paging params (lighter request).
    {
      label: "sgx api announcements v1.0",
      url: `https://api.sgx.com/announcements/v1.0?periodstart=${fromYmd}&periodend=${toYmd}`,
      headers: { Accept: "application/json" },
    },
    // Legacy SGX news search endpoint (HTML scrape).
    {
      label: "sgx news listing html",
      url: "https://www.sgx.com/securities/company-announcements",
      headers: { Accept: "text/html" },
    },
    // SGX rss feed (if it still exists).
    {
      label: "sgx rss",
      url: "https://www.sgx.com/securities/company-announcements/feed",
      headers: { Accept: "application/rss+xml,text/xml,*/*" },
    },
  ];
}

type SgxRow = {
  // SGX modern API uses these snake_case / camelCase variants depending on
  // the endpoint version — sample everything we've seen in the wild.
  id?: string | number;
  announce_id?: string;
  announcementId?: string;
  url?: string;
  document_url?: string;
  documentUrl?: string;
  attachment_url?: string;
  title?: string;
  document_title?: string;
  documentTitle?: string;
  headline?: string;
  broadcast_date_time?: string;
  broadcastDateTime?: string;
  broadcast_date?: string;
  broadcastDate?: string;
  announcement_date?: string;
  announcementDate?: string;
  date?: string;
  issuer_short_name?: string;
  issuerShortName?: string;
  issuer_name?: string;
  issuerName?: string;
  company_name?: string;
  company?: string;
  issuer?: string;
  stock_code?: string;
  stockCode?: string;
  ticker_symbol?: string;
  tickerSymbol?: string;
  code?: string;
  symbol?: string;
};

function pickField(r: SgxRow, keys: string[]): string {
  for (const k of keys) {
    const v = (r as Record<string, unknown>)[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
}

function parseJsonRows(body: string): SgxDisclosure[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return [];
  }
  let rows: SgxRow[] | null = null;
  if (Array.isArray(parsed)) rows = parsed as SgxRow[];
  else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    // SGX wraps results in a few different envelope shapes
    for (const key of ["data", "items", "results", "announcements", "rows", "list"]) {
      const v = obj[key];
      if (Array.isArray(v)) {
        rows = v as SgxRow[];
        break;
      }
      // Nested: data.items, data.results, etc.
      if (v && typeof v === "object") {
        const inner = v as Record<string, unknown>;
        for (const k2 of ["items", "results", "announcements", "rows"]) {
          const v2 = inner[k2];
          if (Array.isArray(v2)) {
            rows = v2 as SgxRow[];
            break;
          }
        }
        if (rows) break;
      }
    }
  }
  if (!rows) return [];

  const out: SgxDisclosure[] = [];
  for (const r of rows) {
    const code = pickField(r, ["stock_code", "stockCode", "ticker_symbol", "tickerSymbol", "code", "symbol"]);
    const company = pickField(r, [
      "issuer_short_name",
      "issuerShortName",
      "issuer_name",
      "issuerName",
      "company_name",
      "company",
      "issuer",
    ]);
    const title = pickField(r, ["title", "document_title", "documentTitle", "headline"]);
    const docUrl = pickField(r, ["url", "document_url", "documentUrl", "attachment_url"]);
    const id = pickField(r, ["id", "announce_id", "announcementId"]);
    const dateRaw = pickField(r, [
      "broadcast_date_time",
      "broadcastDateTime",
      "broadcast_date",
      "broadcastDate",
      "announcement_date",
      "announcementDate",
      "date",
    ]);
    if (!title) continue;

    // Build the public URL. SGX sometimes returns just an attachment id;
    // we wrap it in the standard view URL. If no URL is provided, fall
    // back to the announcement detail page.
    let url = docUrl;
    if (url && !url.startsWith("http")) {
      url = `https://links.sgx.com/${url.startsWith("/") ? "" : "/"}${url}`;
    }
    if (!url && id) {
      url = `https://links.sgx.com/1.0.0/corporate-announcements/${id}/announcement.pdf`;
    }
    if (!url) continue;

    let date = new Date().toISOString().slice(0, 10);
    if (dateRaw) {
      const parsed = new Date(dateRaw);
      if (!Number.isNaN(parsed.getTime())) date = parsed.toISOString().slice(0, 10);
    }
    out.push({ source: "SGX", date, code, company, title, url });
  }
  return out;
}

// Defensive HTML-table fallback for the legacy /securities/company-announcements
// page if the JSON API ever breaks.
function parseHtmlRows(html: string): SgxDisclosure[] {
  const out: SgxDisclosure[] = [];
  // Each row typically has: ticker | company | headline (link to PDF) | timestamp
  const rowRe =
    /<tr[^>]*>[\s\S]{0,2500}?<a[^>]+href="([^"]+\.pdf[^"]*)"[^>]*>\s*([^<][^<]{8,200})\s*<\/a>/gi;
  const today = new Date().toISOString().slice(0, 10);
  for (const m of html.matchAll(rowRe)) {
    const [, href, rawTitle] = m;
    const title = rawTitle.replace(/\s+/g, " ").trim();
    if (!title) continue;
    const url = href.startsWith("http")
      ? href
      : `https://www.sgx.com${href.startsWith("/") ? "" : "/"}${href}`;
    out.push({ source: "SGX", date: today, code: "", company: "", title, url });
  }
  return out;
}

export async function fetchSgxDisclosures(
  opts: { daysBack?: number; limit?: number } = {},
): Promise<SgxDisclosure[]> {
  const daysBack = opts.daysBack ?? 7;
  const limit = opts.limit ?? 40;
  let body = "";
  let label = "";

  for (const probe of buildProbes(daysBack)) {
    try {
      const res = await fetch(probe.url, {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: probe.headers?.Accept ?? "application/json,text/html",
          ...(probe.headers ?? {}),
        },
        cache: "no-store",
      });
      console.log(`[sgx] ${probe.label}: ${res.status} ${probe.url}`);
      if (!res.ok) continue;
      const text = await res.text();
      if (text.length < 50) continue;
      body = text;
      label = probe.label;
      break;
    } catch (e) {
      console.log(`[sgx] ${probe.label}: error ${(e as Error).message}`);
    }
  }

  if (!body) {
    console.log("[sgx] all probes failed — no disclosures fetched");
    return [];
  }
  console.log(`[sgx] using ${label}, body length=${body.length}`);

  let rows: SgxDisclosure[] = [];
  if (body.trimStart().startsWith("{") || body.trimStart().startsWith("[")) {
    rows = parseJsonRows(body);
  }
  if (rows.length === 0) {
    rows = parseHtmlRows(body);
  }
  console.log(`[sgx] parsed ${rows.length} disclosure rows`);

  if (rows.length === 0) {
    const allHrefs = (body.match(/href="[^"]+"/gi) ?? []);
    const pdfHrefs = (body.match(/href="[^"]*\.pdf[^"]*"/gi) ?? []).slice(0, 5);
    console.log(
      `[sgx][diag] totalHrefs=${allHrefs.length} pdfHrefs=${pdfHrefs.length} bodyLen=${body.length}`,
    );
    if (pdfHrefs.length) console.log(`[sgx][diag] first pdfs: ${pdfHrefs.join(" | ")}`);
    const sample = body.slice(0, 2500).replace(/\s+/g, " ");
    console.log(`[sgx][diag] body head: ${sample}`);
  }

  const filtered = rows.filter((d) =>
    MA_KEYWORDS.some((kw) => d.title.toUpperCase().includes(kw)),
  );
  console.log(`[sgx] keyword-filtered ${filtered.length} M&A-relevant of ${rows.length} total`);
  return filtered.slice(0, limit);
}
