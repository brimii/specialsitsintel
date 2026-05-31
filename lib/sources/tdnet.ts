import "server-only";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// M&A / event-driven keywords commonly found in Japanese disclosure titles.
// Pre-filtering by these reduces ~95% of noise (earnings, dividends, board
// changes, etc.) before sending titles to Claude — saves big on tokens.
const MA_KEYWORDS = [
  "TOB",
  "MBO",
  "公開買付", // tender offer
  "株式取得", // share acquisition
  "完全子会社化", // make wholly-owned subsidiary
  "株式譲渡", // share transfer
  "持分譲渡", // equity transfer
  "経営統合", // business integration / merger
  "合併", // merger
  "事業譲渡", // business transfer
  "資本業務提携", // capital & business alliance
  "株式交換", // share exchange (M&A)
  "会社分割", // company split / demerger
  "子会社化", // subsidiarization
  "買収", // acquisition
];

export type TdnetDisclosure = {
  source: "TDnet";
  date: string; // YYYY-MM-DD
  code: string; // 4-digit company code
  company: string;
  title: string;
  url: string; // PDF (the canonical, unique URL per disclosure)
};

function tdnetDateKey(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

// One disclosures page on TDnet covers ~100 entries per day. There can be
// several pages on busy days (I_list_001_YYYYMMDD, I_list_002_..., ...) but
// the most recent ones are on page 001 — enough for our use.
async function fetchTdnetDay(date: Date): Promise<TdnetDisclosure[]> {
  const dateStr = tdnetDateKey(date);
  const url = `https://www.release.tdnet.info/inbs/I_list_001_${dateStr}.html`;
  const res = await fetch(url, {
    headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
    cache: "no-store",
  });
  console.log(`[tdnet] ${dateStr}: ${res.status} ${url}`);
  if (!res.ok) return [];
  const html = await res.text();

  // TDnet daily page layout: each disclosure is a <tr> with four data <td>s
  // bearing stable class names — kjTime / kjCode / kjName / kjTitle —
  // followed by the PDF anchor inside kjTitle. Anchoring on the class names
  // is far more robust than positional td-counting (the page also contains
  // header / footer tables that would otherwise be misread). Codes are
  // 5-char alphanumeric on Tokyo today (e.g. 21620, 298A0), no longer
  // strictly the historical 4-digit form.
  const rowRe =
    /<td[^>]*kjCode[^>]*>\s*([0-9A-Z]+)\s*<\/td>\s*<td[^>]*kjName[^>]*>\s*([^<]*?)\s*<\/td>\s*<td[^>]*kjTitle[^>]*>\s*<a[^>]*href="([^"]+\.pdf)"[^>]*>\s*([^<]+?)\s*<\/a>/gi;

  const out: TdnetDisclosure[] = [];
  for (const m of html.matchAll(rowRe)) {
    const [, code, company, href, title] = m;
    const pdfUrl = href.startsWith("http") ? href : `https://www.release.tdnet.info/inbs/${href}`;
    out.push({
      source: "TDnet",
      date: date.toISOString().slice(0, 10),
      code,
      company: company.trim(),
      title: title.trim(),
      url: pdfUrl,
    });
  }
  console.log(`[tdnet] ${dateStr}: parsed ${out.length} disclosure rows`);

  // Diagnostic: when the regex matches nothing, dump key structural anchors
  // so we can adjust the parser without running curl from the container
  // (release.tdnet.info is not in the network allowlist here).
  if (out.length === 0 && html.length > 0) {
    const trCount = (html.match(/<tr/gi) ?? []).length;
    const tdCount = (html.match(/<td/gi) ?? []).length;
    const pdfHrefs = html.match(/href="[^"]*\.pdf"/gi)?.slice(0, 3) ?? [];
    const tableIdx = html.search(/<table[^>]*>/i);
    const snippet = tableIdx >= 0
      ? html.slice(tableIdx, tableIdx + 2000)
      : html.slice(0, 2000);
    console.log(`[tdnet][diag] htmlLen=${html.length} trs=${trCount} tds=${tdCount} pdfHrefs=${pdfHrefs.length}`);
    if (pdfHrefs.length) console.log(`[tdnet][diag] first pdfHrefs: ${pdfHrefs.join(" | ")}`);
    console.log(`[tdnet][diag] snippet from <table>:\n${snippet.replace(/\s+/g, " ")}`);
  }
  return out;
}

export async function fetchTdnetDisclosures(
  opts: { daysBack?: number; limit?: number } = {},
): Promise<TdnetDisclosure[]> {
  const daysBack = opts.daysBack ?? 7;
  const limit = opts.limit ?? 40;
  const all: TdnetDisclosure[] = [];

  for (let i = 0; i < daysBack; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    try {
      const day = await fetchTdnetDay(d);
      all.push(...day);
    } catch (e) {
      console.log(`[tdnet] day ${i} failed: ${(e as Error).message}`);
    }
  }

  // Keyword pre-filter: only keep disclosures whose title mentions an M&A term.
  const filtered = all.filter((d) => MA_KEYWORDS.some((kw) => d.title.includes(kw)));
  console.log(`[tdnet] keyword-filtered ${filtered.length} M&A-relevant of ${all.length} total`);
  return filtered.slice(0, limit);
}

// TDnet documents are PDFs in Japanese. We don't download them in this MVP —
// the disclosure title itself usually carries enough signal (target name,
// acquirer, transaction type) for Claude to extract a structured deal.
export async function fetchTdnetText(): Promise<string> {
  return "";
}
