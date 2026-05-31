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

// HKEX has rotated their daily-index filename a few times. Try the most
// common variants in order — the first 200 wins. PDF disclosures clearly
// live under /listedco/listconews/sehk/YYYY/MMDD/ (we see them in titles
// linked from the candidate rows) so the directory itself exists; only
// the index filename differs.
function hkexUrlCandidates(d: Date): string[] {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const dir = `https://www1.hkexnews.hk/listedco/listconews/sehk/${yyyy}/${mm}${dd}`;
  return [
    `${dir}/index_e.htm`,
    `${dir}/idx_e.htm`,
    `${dir}/`,
    `${dir}/index.htm`,
    `${dir}/LTNINDEX1_e.htm`,
  ];
}

async function fetchHkexDay(date: Date): Promise<HkexDisclosure[]> {
  const candidates = hkexUrlCandidates(date);
  const dateStr = date.toISOString().slice(0, 10);
  let html = "";
  let usedUrl = "";
  for (const url of candidates) {
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
      cache: "no-store",
    });
    console.log(`[hkex] ${dateStr}: ${res.status} ${url}`);
    if (res.ok) {
      html = await res.text();
      usedUrl = url;
      break;
    }
  }
  if (!html) {
    // All daily-index patterns failed. Probe the stable "today" landing
    // page once — only worth doing for the most recent day in the window,
    // but cheap enough to do every call as a diagnostic anchor so we know
    // whether the host responds at all from the dev environment.
    if (date.toDateString() === new Date().toDateString()) {
      const todayUrl = "https://www1.hkexnews.hk/listedco/listconews/sehk/today_e.htm";
      const tres = await fetch(todayUrl, {
        headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
        cache: "no-store",
      });
      console.log(`[hkex] ${dateStr}: today-fallback ${tres.status} ${todayUrl}`);
      if (tres.ok) {
        html = await tres.text();
        usedUrl = todayUrl;
      } else {
        const sample = (await tres.text()).slice(0, 400).replace(/\s+/g, " ");
        console.log(`[hkex][diag] today-fallback body head: ${sample}`);
      }
    }
    if (!html) return [];
  }
  void usedUrl;

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
