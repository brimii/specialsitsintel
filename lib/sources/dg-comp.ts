import "server-only";

// Browser-like UA: the EU Commission site blocks generic bot UAs with 403s.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HOME = "https://competition-cases.ec.europa.eu";
const LATEST_UPDATES_URL = `${HOME}/latest-updates/M`; // M = Mergers

export type DgCompCase = {
  source: "DG COMP";
  title: string;
  url: string;
  date: string; // YYYY-MM-DD when available, "" otherwise
  summary: string;
  caseNumber?: string; // e.g. "M.11521"
};

function unescapeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/gi, " ");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Parse the public DG COMP "latest updates" page.
// Strategy A : if the page embeds Next.js-style state via __NEXT_DATA__, extract from there.
// Strategy B : fall back to regex extraction of case anchors (<a href="/cases/M.XXXXX">).
// Either way, we end up with a list of case metadata that can be enriched
// by fetchDgCompCaseText() for the Claude extractor.
export async function fetchDgCompCases(opts: { daysBack?: number; limit?: number } = {}): Promise<DgCompCase[]> {
  const limit = opts.limit ?? 30;
  const res = await fetch(LATEST_UPDATES_URL, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`DG COMP latest-updates ${res.status}`);
  const html = await res.text();
  console.log(`[dg-comp] fetched ${LATEST_UPDATES_URL} html.length=${html.length}`);

  // Strategy A: Next.js / Nuxt state hydration
  const nextDataMatch = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  console.log(`[dg-comp] __NEXT_DATA__ match: ${nextDataMatch ? "yes" : "no"}`);
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      const fromState = harvestCasesFromState(data, limit);
      console.log(`[dg-comp] strategy A (state) extracted ${fromState.length} cases`);
      if (fromState.length > 0) return fromState;
    } catch (e) {
      console.log(`[dg-comp] state parse failed: ${(e as Error).message}`);
    }
  }

  // Strategy B: regex over case anchors
  const cases: DgCompCase[] = [];
  const seen = new Set<string>();
  const anchorRe = /<a[^>]+href="(\/cases\/M[._][0-9]+[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const matches = Array.from(html.matchAll(anchorRe));
  console.log(`[dg-comp] strategy B (regex) found ${matches.length} anchors`);
  for (const m of matches) {
    const rawHref = m[1];
    const url = rawHref.startsWith("http") ? rawHref : `${HOME}${rawHref}`;
    if (seen.has(url)) continue;
    seen.add(url);
    const inner = stripTags(unescapeHtml(m[2])).trim();
    if (!inner) continue;
    const caseNumberMatch = inner.match(/M[._][0-9]+/) ?? rawHref.match(/M[._][0-9]+/);
    cases.push({
      source: "DG COMP",
      title: inner,
      url,
      date: "",
      summary: "",
      caseNumber: caseNumberMatch?.[0],
    });
    if (cases.length >= limit) break;
  }
  // Debug: if both strategies failed but we got HTML, log a head sample to spot the structure.
  if (cases.length === 0 && html.length > 0) {
    const sample = html.replace(/\s+/g, " ").slice(0, 800);
    console.log(`[dg-comp] no cases extracted. HTML head: ${sample}`);
  }
  return cases;
}

// Try to recursively walk a hydration object and pluck out case rows.
// Cases are typically objects with `caseNumber` + `title` + `lastUpdated`.
function harvestCasesFromState(root: unknown, limit: number): DgCompCase[] {
  const out: DgCompCase[] = [];
  const seen = new Set<string>();
  const visit = (node: unknown) => {
    if (out.length >= limit) return;
    if (!node) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    const caseNumber = pickString(n, ["caseNumber", "caseNo", "caseRef", "reference"]);
    const title = pickString(n, ["title", "caseTitle", "name", "displayName"]);
    const date = pickString(n, ["lastUpdated", "lastUpdateDate", "publishDate", "updateDate", "date"]);
    if (caseNumber && title && caseNumber.startsWith("M") && !seen.has(caseNumber)) {
      seen.add(caseNumber);
      out.push({
        source: "DG COMP",
        title,
        url: `${HOME}/cases/${caseNumber}`,
        date: date ? date.slice(0, 10) : "",
        summary: pickString(n, ["summary", "description", "shortDescription"]) ?? "",
        caseNumber,
      });
    }
    for (const value of Object.values(n)) visit(value);
  };
  visit(root);
  return out;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

// Fetch the public case detail page. Returns HTML-stripped text, truncated.
export async function fetchDgCompCaseText(url: string, maxChars = 30000): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });
    if (!res.ok) return "";
    const html = await res.text();
    return unescapeHtml(
      html
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    ).slice(0, maxChars);
  } catch {
    return "";
  }
}
