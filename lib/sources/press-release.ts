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

// Per-source diagnostic sampling. We log the URL, HTTP status, byte
// count, and first candidate href/result — but only ONCE per source
// per session. That way a 100-deal reEnrichPress run gives us 4 log
// lines telling us which endpoints are healthy without spamming.
const sampled: Record<PressReleaseSource, boolean> = {
  PRN: false,
  BW: false,
  RNS: false,
  EDINET: false,
};

function sampleOnce(
  source: PressReleaseSource,
  msg: string,
): void {
  if (sampled[source]) return;
  sampled[source] = true;
  console.log(`[press-release] ${source} SAMPLE :: ${msg}`);
}

// Aggregate counters across all findPressRelease() calls this session.
// Zero-out at module-load; reader is meant to eyeball them after a batch
// to see the win-rate per source.
export const prStats: Record<
  PressReleaseSource,
  { called: number; response: number; candidates: number; matches: number }
> = {
  PRN: { called: 0, response: 0, candidates: 0, matches: 0 },
  BW: { called: 0, response: 0, candidates: 0, matches: 0 },
  RNS: { called: 0, response: 0, candidates: 0, matches: 0 },
  EDINET: { called: 0, response: 0, candidates: 0, matches: 0 },
};

export function resetPrStats(): void {
  for (const s of Object.keys(prStats) as PressReleaseSource[]) {
    prStats[s] = { called: 0, response: 0, candidates: 0, matches: 0 };
    sampled[s] = false;
  }
}

export function logPrStats(): void {
  const rows = (Object.keys(prStats) as PressReleaseSource[]).map((s) => {
    const c = prStats[s];
    return `  ${s.padEnd(7)} called=${c.called} response=${c.response} candidates=${c.candidates} matches=${c.matches}`;
  });
  console.log(`[press-release] aggregate stats:\n${rows.join("\n")}`);
}

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

// Keyword match: does the press release actually name BOTH the target
// AND the acquirer? Previous version only required the target, which
// meant a broad wire search on "Fox Corporation Roku" would happily
// return unrelated Fox press releases and pass the check just because
// "roku" appeared somewhere. Requiring both eliminates that whole class
// of false positive at the cost of missing single-mention releases —
// but a real M&A release always names both parties.
//
// `norm` strips common corporate suffixes and takes the first
// significant word of each name so "Fox Corporation" and "Fox Corp"
// both reduce to "fox". Acquirer being missing (SC 13D activists
// sometimes are unknown) or a placeholder → skip the acq check.
function bodyMatches(body: string, dealName: string, acqName: string): boolean {
  const lc = body.toLowerCase();
  const firstSignificantWord = (n: string): string => {
    const cleaned = n
      .toLowerCase()
      .replace(/[.,()]/g, "")
      .replace(/\b(inc|corp|corporation|ltd|plc|holdings|group|co|kk)\b/g, "")
      .trim();
    const w = cleaned.split(/\s+/).filter((w) => w.length >= 3)[0] ?? "";
    return w;
  };
  const dn = firstSignificantWord(dealName);
  if (dn.length < 3 || !lc.includes(dn)) return false;
  const acqPlaceholder = /^(tbd|unknown|n\/a|na|undisclosed|none|null)$/i;
  if (!acqName || acqPlaceholder.test(acqName.trim())) {
    return true; // target-only match acceptable when no acquirer to check
  }
  const an = firstSignificantWord(acqName);
  if (an.length < 3) return true; // acq name too short to match usefully
  return lc.includes(an);
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
  prStats.PRN.called++;
  const q = encodeURIComponent(`${acqName} ${dealName}`.trim());
  const searchUrl = `https://www.prnewswire.com/search/news/?keyword=${q}&pageSize=25`;
  const res = await fetchWithTimeout(searchUrl);
  sampleOnce("PRN", `url=${searchUrl} status=${res?.status ?? "null"}`);
  if (!res || !res.ok) return null;
  prStats.PRN.response++;
  const html = await res.text();
  // Match either /news-releases/... or absolute prnewswire.com/news-releases URLs.
  const hrefs = Array.from(
    html.matchAll(/href="((?:https?:\/\/www\.prnewswire\.com)?\/news-releases\/[^"]+)"/gi),
  )
    .map((m) => m[1])
    .filter((h, i, arr) => arr.indexOf(h) === i)
    .slice(0, 5);
  if (hrefs.length > 0) prStats.PRN.candidates++;
  sampleOnce("PRN", `hrefs=${hrefs.length} htmlLen=${html.length} first="${hrefs[0]?.slice(0, 100) ?? ""}"`);
  for (const rawHref of hrefs) {
    const url = rawHref.startsWith("http") ? rawHref : `https://www.prnewswire.com${rawHref}`;
    const article = await fetchWithTimeout(url);
    if (!article || !article.ok) continue;
    const body = stripHtml(await article.text()).slice(0, MAX_TEXT_CHARS);
    if (bodyMatches(body, dealName, acqName)) {
      prStats.PRN.matches++;
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
  prStats.BW.called++;
  // Portal/site/home path 403s. The current public search page is at
  // /news/home?searchtype=news_release&<terms>. Also send a fuller
  // browser header set — BW's WAF is header-strict.
  const q = encodeURIComponent(`${acqName} ${dealName}`.trim());
  const searchUrl = `https://www.businesswire.com/news/home/search?searchTerm=${q}&searchType=news`;
  const res = await fetchWithTimeout(searchUrl, {
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Upgrade-Insecure-Requests": "1",
    },
  });
  sampleOnce("BW", `url=${searchUrl} status=${res?.status ?? "null"}`);
  if (!res || !res.ok) return null;
  prStats.BW.response++;
  const html = await res.text();
  const hrefs = Array.from(
    html.matchAll(/href="((?:https?:\/\/www\.businesswire\.com)?\/news\/home\/\d+\/[^"]+)"/gi),
  )
    .map((m) => m[1])
    .filter((h, i, arr) => arr.indexOf(h) === i)
    .slice(0, 5);
  if (hrefs.length > 0) prStats.BW.candidates++;
  sampleOnce("BW", `hrefs=${hrefs.length} htmlLen=${html.length} first="${hrefs[0]?.slice(0, 100) ?? ""}"`);
  for (const rawHref of hrefs) {
    const url = rawHref.startsWith("http") ? rawHref : `https://www.businesswire.com${rawHref}`;
    const article = await fetchWithTimeout(url);
    if (!article || !article.ok) continue;
    const body = stripHtml(await article.text()).slice(0, MAX_TEXT_CHARS);
    if (bodyMatches(body, dealName, acqName)) {
      prStats.BW.matches++;
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
  prStats.RNS.called++;
  // Investegate mirrors RNS in publicly-accessible HTML. Their release
  // pages sit at /Article.aspx?id=X or /AnnouncePopup.aspx?id=X — not
  // /announcement/... as first tried. Their search endpoint is
  // /Search.aspx which returns HTML anchor tags to those article URLs.
  const q = encodeURIComponent(`${acqName} ${dealName}`.trim());
  const url = `https://www.investegate.co.uk/Search.aspx?keywords=${q}`;
  const res = await fetchWithTimeout(url);
  sampleOnce("RNS", `url=${url} status=${res?.status ?? "null"}`);
  if (!res || !res.ok) return null;
  prStats.RNS.response++;
  const html = await res.text();
  // Match either Article.aspx?id=X or AnnouncePopup.aspx?id=X (case-
  // insensitive because Investegate mixes case in link paths).
  const hrefs = Array.from(
    html.matchAll(/href="([^"]*(?:Article|AnnouncePopup)\.aspx\?[^"]+)"/gi),
  )
    .map((m) => m[1])
    .filter((h, i, arr) => arr.indexOf(h) === i)
    .slice(0, 5);
  if (hrefs.length > 0) prStats.RNS.candidates++;
  sampleOnce("RNS", `hrefs=${hrefs.length} htmlLen=${html.length} first="${hrefs[0]?.slice(0, 100) ?? ""}"`);
  for (const rawHref of hrefs) {
    const articleUrl = rawHref.startsWith("http")
      ? rawHref
      : `https://www.investegate.co.uk${rawHref.startsWith("/") ? "" : "/"}${rawHref}`;
    const article = await fetchWithTimeout(articleUrl);
    if (!article || !article.ok) continue;
    const body = stripHtml(await article.text()).slice(0, MAX_TEXT_CHARS);
    if (bodyMatches(body, dealName, acqName)) {
      prStats.RNS.matches++;
      return { source: "RNS", url: articleUrl, text: body };
    }
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
  acqName: string,
): Promise<PressRelease | null> {
  prStats.EDINET.called++;
  // EDINET API v2 requires a Subscription-Key since Nov 2023 — without
  // it, /documents.json returns 200 but with results=[] every day.
  // Skip fast when no key is configured so we don't burn 14 requests
  // per deal on empty responses.
  const apiKey = process.env.EDINET_API_KEY;
  if (!apiKey) {
    sampleOnce("EDINET", `skipped — EDINET_API_KEY not set`);
    return null;
  }
  const today = new Date();
  // Scan the last 14 days — the deal's press release, if any, should
  // land within a couple days of the TDnet notice.
  const dayMs = 24 * 60 * 60 * 1000;
  let anyResponse = false;
  let totalResults = 0;
  for (let daysAgo = 0; daysAgo < 14; daysAgo++) {
    const d = new Date(today.getTime() - daysAgo * dayMs);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const listUrl =
      `https://api.edinet-fsa.go.jp/api/v2/documents.json?date=${yyyy}-${mm}-${dd}&type=2&Subscription-Key=${apiKey}`;
    const res = await fetchWithTimeout(listUrl, {
      headers: { Accept: "application/json" },
    });
    if (daysAgo === 0) {
      sampleOnce("EDINET", `url=${listUrl.replace(apiKey, "***")} status=${res?.status ?? "null"}`);
    }
    if (!res || !res.ok) continue;
    anyResponse = true;
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
      totalResults += results.length;
      // Try matching against BOTH target and acquirer — western PE
      // acquirers of Japanese targets show up under the acquirer name
      // in English, while Japanese-listed targets show under their
      // Japanese kanji filerName that won't match our English `nm`.
      const targetKey = dealName.toLowerCase().split(/\s+/)[0];
      const acqKey = (acqName || "").toLowerCase().split(/\s+/)[0];
      const match = results.find((r) => {
        const fn = r.filerName?.toLowerCase() ?? "";
        const dd2 = r.docDescription?.toLowerCase() ?? "";
        return (
          (targetKey.length >= 3 && (fn.includes(targetKey) || dd2.includes(targetKey))) ||
          (acqKey.length >= 3 && (fn.includes(acqKey) || dd2.includes(acqKey)))
        );
      });
      if (!match?.docID) continue;
      // The description alone often has the deal value — fetching the
      // ZIP + parsing XBRL is heavier than it's worth for our use case.
      const text = `Filer: ${match.filerName ?? ""}. ` +
        `Description: ${match.docDescription ?? ""}. ` +
        `Form: ${match.formCode ?? ""}.`;
      if (text.length < 40) continue;
      prStats.EDINET.matches++;
      return {
        source: "EDINET",
        url: `https://api.edinet-fsa.go.jp/api/v2/documents/${match.docID}?type=2`,
        text,
      };
    } catch {
      continue;
    }
  }
  if (anyResponse) prStats.EDINET.response++;
  if (totalResults > 0) prStats.EDINET.candidates++;
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
