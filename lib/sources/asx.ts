import "server-only";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Australian Securities Exchange (ASX) Market Announcements headlines.
// ASX classifies each announcement with one or more "headers" — these are
// the M&A / event-driven categories. The Takeovers Panel-governed
// transactions almost always carry one of these.
const MA_KEYWORDS = [
  "TAKEOVER",
  "OFF-MARKET BID",
  "ON-MARKET BID",
  "BIDDER'S STATEMENT",
  "TARGET'S STATEMENT",
  "TARGETS STATEMENT",
  "SCHEME OF ARRANGEMENT",
  "SCHEME BOOKLET",
  "MERGER",
  "ACQUISITION",
  "DISPOSAL",
  "DEMERGER",
  "DIVESTMENT",
  "PROPOSED ACQUISITION",
  "BINDING AGREEMENT",
  "BID IMPLEMENTATION",
  "RESPONSE TO TAKEOVER",
  "RESPONSE TO OFFER",
  "INTENTION TO MAKE",
  "PROPORTIONAL OFFER",
  "COMPULSORY ACQUISITION",
  "SUBSTANTIAL HOLDER",
  "BECOMING A SUBSTANTIAL",
  "CHANGE IN SUBSTANTIAL",
  "CEASING TO BE A SUBSTANTIAL",
];

export type AsxDisclosure = {
  source: "ASX";
  date: string; // YYYY-MM-DD
  code: string; // 3-letter ASX ticker (e.g. "BHP", "CBA")
  company: string;
  title: string;
  url: string; // PDF announcement URL
};

// ASX has rotated their announcements platform a couple of times. We probe
// a few endpoints in order — first 200 with parseable content wins.
type Probe = {
  label: string;
  url: string;
  headers?: Record<string, string>;
};

function buildProbes(): Probe[] {
  return [
    {
      label: "markitdigital today",
      url: "https://asx.api.markitdigital.com/asx-research/1.0/markets/announcements/today?count=200",
      headers: { Accept: "application/json" },
    },
    {
      label: "asx v2 todayAnns",
      url: "https://www.asx.com.au/asx/v2/statistics/todayAnns.do",
    },
    {
      label: "asx v2 announcements weekly",
      url: "https://www.asx.com.au/asx/v2/statistics/announcements.do?by=asxCode&timeframe=W&period=W",
    },
    {
      label: "announcements site api",
      url: "https://announcements.asx.com.au/asxpdf/today.json",
      headers: { Accept: "application/json" },
    },
  ];
}

type AsxRow = {
  code?: string;
  symbol?: string;
  issuer_short_name?: string;
  issuerShortName?: string;
  company?: string;
  name?: string;
  headline?: string;
  title?: string;
  document_release_date?: string;
  documentReleaseDate?: string;
  release_date?: string;
  date?: string;
  url?: string;
  pdfUrl?: string;
  document_url?: string;
};

function pickField(r: AsxRow, keys: string[]): string {
  for (const k of keys) {
    const v = (r as Record<string, unknown>)[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function parseJsonRows(body: string): AsxDisclosure[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return [];
  }
  // Find an array of rows — different ASX endpoints nest it differently.
  let rows: AsxRow[] | null = null;
  if (Array.isArray(parsed)) rows = parsed as AsxRow[];
  else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    for (const key of ["data", "results", "items", "announcements", "rows"]) {
      const v = obj[key];
      if (Array.isArray(v)) {
        rows = v as AsxRow[];
        break;
      }
    }
  }
  if (!rows) return [];

  const out: AsxDisclosure[] = [];
  for (const r of rows) {
    const code = pickField(r, ["code", "symbol", "issuer_code", "asx_code", "asxCode"]);
    const company = pickField(r, ["issuer_short_name", "issuerShortName", "company", "name", "issuer"]);
    const title = pickField(r, ["headline", "title", "header", "headline_text"]);
    const url = pickField(r, ["url", "pdfUrl", "document_url", "documentUrl", "pdf_url"]);
    const dateRaw = pickField(r, [
      "document_release_date",
      "documentReleaseDate",
      "release_date",
      "releaseDate",
      "date",
      "publish_date",
    ]);
    if (!code || !title) continue;

    let date = new Date().toISOString().slice(0, 10);
    if (dateRaw) {
      const parsed = new Date(dateRaw);
      if (!Number.isNaN(parsed.getTime())) date = parsed.toISOString().slice(0, 10);
    }
    const fullUrl = url.startsWith("http")
      ? url
      : url
        ? `https://www.asx.com.au${url.startsWith("/") ? "" : "/"}${url}`
        : "";
    out.push({ source: "ASX", date, code, company, title, url: fullUrl });
  }
  return out;
}

// Defensive HTML-table fallback for the legacy todayAnns.do endpoint.
// ASX rows there have: time | code | headline (linked to PDF) | pages.
function parseHtmlRows(html: string): AsxDisclosure[] {
  const out: AsxDisclosure[] = [];
  const today = new Date().toISOString().slice(0, 10);
  // Row pattern: time, 3-letter code, anchor with PDF + headline
  const rowRe =
    /<tr[^>]*>[\s\S]{0,2000}?>\s*([A-Z0-9]{3,4})\s*<[\s\S]{0,800}?<a[^>]+href="([^"]+\.pdf)"[^>]*>\s*([^<][^<]{8,})\s*<\/a>/gi;
  for (const m of html.matchAll(rowRe)) {
    const [, code, href, title] = m;
    const url = href.startsWith("http")
      ? href
      : `https://www.asx.com.au${href.startsWith("/") ? "" : "/"}${href}`;
    out.push({
      source: "ASX",
      date: today,
      code,
      company: "",
      title: title.replace(/\s+/g, " ").trim(),
      url,
    });
  }
  return out;
}

export async function fetchAsxDisclosures(
  opts: { daysBack?: number; limit?: number } = {},
): Promise<AsxDisclosure[]> {
  const limit = opts.limit ?? 40;
  let body = "";
  let label = "";

  for (const probe of buildProbes()) {
    try {
      const res = await fetch(probe.url, {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: probe.headers?.Accept ?? "application/json,text/html",
          ...(probe.headers ?? {}),
        },
        cache: "no-store",
      });
      console.log(`[asx] ${probe.label}: ${res.status} ${probe.url}`);
      if (!res.ok) continue;
      const text = await res.text();
      if (text.length < 50) continue;
      body = text;
      label = probe.label;
      break;
    } catch (e) {
      console.log(`[asx] ${probe.label}: error ${(e as Error).message}`);
    }
  }

  if (!body) {
    console.log("[asx] all probes failed — no disclosures fetched");
    return [];
  }
  console.log(`[asx] using ${label}, body length=${body.length}`);

  // Try JSON first, then HTML fallback.
  let rows: AsxDisclosure[] = [];
  if (body.trimStart().startsWith("{") || body.trimStart().startsWith("[")) {
    rows = parseJsonRows(body);
  }
  if (rows.length === 0) {
    rows = parseHtmlRows(body);
  }
  console.log(`[asx] parsed ${rows.length} disclosure rows`);

  if (rows.length === 0) {
    const codes = (body.match(/\b[A-Z]{3}\b/g) ?? []).length;
    const pdfHrefs = (body.match(/href="[^"]*\.pdf"/gi) ?? []).slice(0, 3);
    console.log(`[asx][diag] 3letterCodes=${codes} pdfHrefs=${pdfHrefs.length}`);
    if (pdfHrefs.length) console.log(`[asx][diag] first pdfs: ${pdfHrefs.join(" | ")}`);
    const sample = body.slice(0, 2500).replace(/\s+/g, " ");
    console.log(`[asx][diag] body head: ${sample}`);
  }

  const filtered = rows.filter((d) =>
    MA_KEYWORDS.some((kw) => d.title.toUpperCase().includes(kw)),
  );
  console.log(`[asx] keyword-filtered ${filtered.length} M&A-relevant of ${rows.length} total`);
  return filtered.slice(0, limit);
}
