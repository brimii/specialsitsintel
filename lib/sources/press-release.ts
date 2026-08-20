import "server-only";

// ════════════════════════════════════════════════════════════════════
// Press-release finder — 3rd-pass enrichment source.
//
// The 1st and 2nd passes lean on the primary regulator filing (SEC,
// CMA, DG COMP) or the exchange disclosure PDF (TDnet, HKEX, ASX).
// Those documents often describe the *transaction structure* but skip
// the *financial terms* — Asian exchanges especially publish the offer
// as a bare notice ("scheme of arrangement approved") without the
// per-share price.
//
// Press-release wires (PR Newswire, Business Wire, LSE RNS, EDINET)
// are where issuers announce the numbers. This module searches those
// four wires for a release matching a given deal, then returns the
// release text so the enrich prompt can extract v / pr.o.
//
// All four are queried in parallel; first non-empty match wins.
// ════════════════════════════════════════════════════════════════════

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 8000;
const MAX_TEXT_CHARS = 30000;

export type PressReleaseSource = "PRN" | "BW" | "RNS" | "EDINET";

export type PressRelease = {
  source: PressReleaseSource;
  url: string;
  text: string;
};

// Timeout wrapper — press-release sources sometimes hang. We never
// want the finder to block the discovery pipeline for more than a
// few seconds per source; failures are logged and treated as "no
// match found" so the caller can proceed.
async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
      cache: "no-store",
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Strip HTML tags + collapse whitespace. Not perfect but adequate for
// feeding a press-release body into Claude — the extraction prompt is
// tolerant of markup residue.
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// Best-effort keyword match: given a deal's target + acquirer, does
// the press-release body contain both names (or an obvious variant)?
// The wires often title the release with acquirer + target so a very
// loose contains-check is enough to reject unrelated hits.
function bodyMatches(body: string, dealName: string, acqName: string): boolean {
  const lc = body.toLowerCase();
  const norm = (n: string) =>
    n
      .toLowerCase()
      .replace(/[.,()]/g, "")
      .replace(/\b(inc|corp|corporation|ltd|plc|holdings|group|co|kk)\b/g, "")
      .trim()
      .split(/\s+/)
      .filter((w) => w.length >= 3)
      .slice(0, 3)
      .join(" ");
  const dn = norm(dealName);
  return dn.length >= 3 && lc.includes(dn);
}

// ────────────────────────────────────────────────────────────────────
// 1. PR Newswire — https://www.prnewswire.com/
//
// Their search HTML returns a list of release cards. Each card has an
// <a> pointing at /news-releases/…. First matching card wins.
// ────────────────────────────────────────────────────────────────────
async function searchPrNewswire(
  dealName: string,
  acqName: string,
): Promise<PressRelease | null> {
  const q = encodeURIComponent(`${acqName} ${dealName}`.trim());
  const searchUrl = `https://www.prnewswire.com/search/news/?keyword=${q}&pageSize=25`;
  const res = await fetchWithTimeout(searchUrl);
  if (!res || !res.ok) return null;
  const html = await res.text();
  // Match either /news-releases/... or absolute prnewswire.com/news-releases URLs.
  const hrefs = Array.from(
    html.matchAll(/href="((?:https?:\/\/www\.prnewswire\.com)?\/news-releases\/[^"]+)"/gi),
  )
    .map((m) => m[1])
    .filter((h, i, arr) => arr.indexOf(h) === i)
    .slice(0, 5);
  for (const rawHref of hrefs) {
    const url = rawHref.startsWith("http") ? rawHref : `https://www.prnewswire.com${rawHref}`;
    const article = await fetchWithTimeout(url);
    if (!article || !article.ok) continue;
    const body = stripHtml(await article.text()).slice(0, MAX_TEXT_CHARS);
    if (bodyMatches(body, dealName, acqName)) {
      return { source: "PRN", url, text: body };
    }
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────
// 2. Business Wire — https://www.businesswire.com/
//
// News search returns HTML with links to /news/home/YYYYMMDDNNNNNNN/…
// Same pattern as PRN.
// ────────────────────────────────────────────────────────────────────
async function searchBusinessWire(
  dealName: string,
  acqName: string,
): Promise<PressRelease | null> {
  const q = encodeURIComponent(`${acqName} ${dealName}`.trim());
  const searchUrl = `https://www.businesswire.com/portal/site/home/news/?ndmViewId=news_view&searchType=news&searchTerm=${q}`;
  const res = await fetchWithTimeout(searchUrl);
  if (!res || !res.ok) return null;
  const html = await res.text();
  const hrefs = Array.from(
    html.matchAll(/href="((?:https?:\/\/www\.businesswire\.com)?\/news\/home\/\d+\/[^"]+)"/gi),
  )
    .map((m) => m[1])
    .filter((h, i, arr) => arr.indexOf(h) === i)
    .slice(0, 5);
  for (const rawHref of hrefs) {
    const url = rawHref.startsWith("http") ? rawHref : `https://www.businesswire.com${rawHref}`;
    const article = await fetchWithTimeout(url);
    if (!article || !article.ok) continue;
    const body = stripHtml(await article.text()).slice(0, MAX_TEXT_CHARS);
    if (bodyMatches(body, dealName, acqName)) {
      return { source: "BW", url, text: body };
    }
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────
// 3. LSE RNS (Regulatory News Service) — londonstockexchange.com
//
// The public /news/market-news page is a SPA, but the underlying JSON
// API on api.londonstockexchange.com/api/gw/lse/news serves the same
// data. Undocumented but stable for public news queries.
// ────────────────────────────────────────────────────────────────────
async function searchLseRns(
  dealName: string,
  acqName: string,
): Promise<PressRelease | null> {
  const q = encodeURIComponent(`${acqName} ${dealName}`.trim());
  const url =
    `https://api.londonstockexchange.com/api/gw/lse/news?tab=news-explorer` +
    `&headlinesOnly=false&text=${q}&size=10`;
  const res = await fetchWithTimeout(url, {
    headers: { Accept: "application/json" },
  });
  if (!res || !res.ok) return null;
  try {
    const json = (await res.json()) as {
      content?: Array<{
        headline?: string;
        content?: string;
        newsSource?: string;
        urlToHtml?: string;
      }>;
    };
    const items = json.content ?? [];
    for (const it of items) {
      const bodyRaw = (it.content ?? "") + " " + (it.headline ?? "");
      const body = stripHtml(bodyRaw).slice(0, MAX_TEXT_CHARS);
      if (bodyMatches(body, dealName, acqName)) {
        return {
          source: "RNS",
          url: it.urlToHtml ?? url,
          text: body,
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────
// 4. EDINET — Japan Financial Services Agency filing archive
//
// Rich XBRL feed at api.edinet-fsa.go.jp, but no free-text search
// endpoint. We use the daily document list (documents.json?type=2)
// over a recent window and filter by filer name matching the deal.
// Best used when we know the deal is Japanese (source === "TDnet").
// ────────────────────────────────────────────────────────────────────
async function searchEdinet(
  dealName: string,
  _acqName: string,
): Promise<PressRelease | null> {
  const today = new Date();
  // Scan the last 14 days — the deal's press release, if any, should
  // land within a couple days of the TDnet notice.
  const dayMs = 24 * 60 * 60 * 1000;
  for (let daysAgo = 0; daysAgo < 14; daysAgo++) {
    const d = new Date(today.getTime() - daysAgo * dayMs);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const listUrl =
      `https://api.edinet-fsa.go.jp/api/v2/documents.json?date=${yyyy}-${mm}-${dd}&type=2`;
    const res = await fetchWithTimeout(listUrl, {
      headers: { Accept: "application/json" },
    });
    if (!res || !res.ok) continue;
    try {
      const json = (await res.json()) as {
        results?: Array<{
          docID?: string;
          filerName?: string;
          docDescription?: string;
          formCode?: string;
        }>;
      };
      const results = json.results ?? [];
      const targetKey = dealName.toLowerCase().split(/\s+/)[0];
      const match = results.find(
        (r) =>
          (r.filerName?.toLowerCase().includes(targetKey) ?? false) ||
          (r.docDescription?.toLowerCase().includes(targetKey) ?? false),
      );
      if (!match?.docID) continue;
      // The description alone often has the deal value — fetching the
      // ZIP + parsing XBRL is heavier than it's worth for our use case.
      const text = `Filer: ${match.filerName ?? ""}. ` +
        `Description: ${match.docDescription ?? ""}. ` +
        `Form: ${match.formCode ?? ""}.`;
      if (text.length < 40) continue;
      return {
        source: "EDINET",
        url: `https://api.edinet-fsa.go.jp/api/v2/documents/${match.docID}?type=2`,
        text,
      };
    } catch {
      continue;
    }
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────
// Orchestrator — fires all 4 sources in parallel, returns the first
// non-null match. Which order matters little (all four are cheap),
// but we prefer the higher-quality wires when several match.
// ────────────────────────────────────────────────────────────────────
export async function findPressRelease(
  dealName: string,
  acqName: string,
): Promise<PressRelease | null> {
  if (!dealName || dealName.length < 3) return null;
  const results = await Promise.allSettled([
    searchPrNewswire(dealName, acqName),
    searchBusinessWire(dealName, acqName),
    searchLseRns(dealName, acqName),
    searchEdinet(dealName, acqName),
  ]);
  // Priority order: PRN > BW > RNS > EDINET (matches results index).
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) return r.value;
  }
  return null;
}
