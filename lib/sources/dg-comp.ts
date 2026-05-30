import "server-only";

// Browser-like UA: EU sites tend to block generic bot UAs.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// DG Competition merger case dataset on the EU Open Data Portal.
// Announced March 2025 — JSON updated daily.
// Reference: https://data.europa.eu/data/datasets/cc7e224e-6569-40f0-8037-d3389aa0fae7
const DATASET_ID = "cc7e224e-6569-40f0-8037-d3389aa0fae7";

// Candidate metadata endpoints — data.europa.eu's portal exposes datasets
// via a few different paths depending on which microservice serves them.
// We try them in order; the first 200 wins.
const METADATA_ENDPOINTS = [
  `https://data.europa.eu/api/hub/search/datasets/${DATASET_ID}`,
  `https://data.europa.eu/api/hub/repo/datasets/${DATASET_ID}`,
  `https://data.europa.eu/api/hub/search/datasets/${DATASET_ID}.json`,
];

export type DgCompCase = {
  source: "DG COMP";
  title: string;
  url: string;
  date: string;
  summary: string;
  caseNumber?: string;
};

async function fetchDatasetMetadata(): Promise<Record<string, unknown> | null> {
  for (const endpoint of METADATA_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        headers: { Accept: "application/json", "User-Agent": BROWSER_UA },
        cache: "no-store",
      });
      console.log(`[dg-comp] metadata ${res.status} from ${endpoint}`);
      if (res.ok) {
        return (await res.json()) as Record<string, unknown>;
      }
    } catch (e) {
      console.log(`[dg-comp] metadata error ${endpoint}: ${(e as Error).message}`);
    }
  }
  return null;
}

// Walks a DCAT-AP metadata object and returns the first URL that looks
// like a JSON distribution. data.europa.eu uses snake_case keys
// (download_url / access_url) and a `format` shaped as an object with
// a `resource` URI pointing to the file-type vocabulary.
function pickJsonDistribution(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;

  // Walk into the common envelope: { result: {...} } at data.europa.eu
  const root =
    (metadata as Record<string, unknown>).result ??
    (metadata as Record<string, unknown>).results ??
    metadata;

  const distributions = pickArray(root, ["distributions", "distribution"]);
  if (distributions) {
    console.log(`[dg-comp] ${distributions.length} distribution(s)`);
    if (distributions.length > 0) {
      console.log(`[dg-comp] distribution[0] keys: ${Object.keys(distributions[0] as Record<string, unknown>).slice(0, 15).join(", ")}`);
    }
    for (const dist of distributions) {
      if (!dist || typeof dist !== "object") continue;
      const url = pickFirstUrl(dist as Record<string, unknown>, [
        "download_url",
        "downloadURL",
        "downloadurl",
        "access_url",
        "accessURL",
        "accessurl",
        "url",
      ]);
      if (!url) continue;
      const formatStr = describeFormat((dist as Record<string, unknown>).format);
      const mediaStr = describeFormat((dist as Record<string, unknown>).media_type)
        || describeFormat((dist as Record<string, unknown>).mediaType);
      const looksJson =
        /json/i.test(formatStr) ||
        /json/i.test(mediaStr) ||
        url.toLowerCase().endsWith(".json");
      if (looksJson) {
        console.log(`[dg-comp] picked JSON distribution: ${url}`);
        return url;
      }
    }
    // Nothing matched — dump the first distribution so we can iterate
    console.log(`[dg-comp] no JSON match; first distribution = ${JSON.stringify(distributions[0]).slice(0, 600)}`);
  }

  // Fallback: deep scan for any field that has both a URL and a JSON hint
  const fallback = deepFindJsonUrl(root);
  if (fallback) {
    console.log(`[dg-comp] fallback JSON URL: ${fallback}`);
  }
  return fallback;
}

function pickArray(obj: unknown, keys: string[]): unknown[] | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = o[k];
    if (Array.isArray(v)) return v;
  }
  return null;
}

function pickFirstUrl(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") return (v[0] as string).trim();
  }
  return null;
}

function describeFormat(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(describeFormat).join(" ");
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    return [o.resource, o.label, o.title, o.id, o.uri]
      .filter((x) => typeof x === "string")
      .join(" ");
  }
  return "";
}

function deepFindJsonUrl(node: unknown): string | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const u = deepFindJsonUrl(item);
      if (u) return u;
    }
    return null;
  }
  if (typeof node !== "object") return null;
  const n = node as Record<string, unknown>;
  for (const value of Object.values(n)) {
    if (typeof value === "string" && value.toLowerCase().endsWith(".json") && /^https?:/i.test(value)) {
      return value;
    }
    if (Array.isArray(value)) {
      for (const v of value) {
        if (typeof v === "string" && v.toLowerCase().endsWith(".json") && /^https?:/i.test(v)) {
          return v;
        }
      }
    }
  }
  for (const value of Object.values(n)) {
    if (value && typeof value === "object") {
      const u = deepFindJsonUrl(value);
      if (u) return u;
    }
  }
  return null;
}

// Loose extraction of case rows from the downloaded JSON. The exact schema
// is unknown from outside (Commission's choice) — we walk the tree and pick
// objects that look like case rows (caseNumber/title/date heuristic).
function harvestCasesFromData(root: unknown, limit: number, cutoff: Date): DgCompCase[] {
  const out: DgCompCase[] = [];
  const seen = new Set<string>();

  const visit = (node: unknown): void => {
    if (out.length >= limit) return;
    if (!node) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (typeof node !== "object") return;
    const n = node as Record<string, unknown>;

    const caseNumber = pickString(n, [
      "caseNumber",
      "case_number",
      "caseNo",
      "caseRef",
      "reference",
      "casenum",
    ]);
    const title = pickString(n, [
      "title",
      "caseTitle",
      "case_title",
      "name",
      "displayName",
      "parties",
    ]);
    const date = pickString(n, [
      "notificationDate",
      "notification_date",
      "lastUpdated",
      "lastUpdateDate",
      "publishDate",
      "publish_date",
      "decisionDate",
      "decision_date",
      "date",
    ]);
    const summary = pickString(n, ["summary", "description", "shortDescription"]) ?? "";

    if (caseNumber && title && caseNumber.startsWith("M") && !seen.has(caseNumber)) {
      seen.add(caseNumber);
      const dateObj = date ? new Date(date) : null;
      if (dateObj && dateObj < cutoff) {
        // older than the window — skip
      } else {
        out.push({
          source: "DG COMP",
          title,
          url: `https://competition-cases.ec.europa.eu/cases/${caseNumber}`,
          date: dateObj ? dateObj.toISOString().slice(0, 10) : "",
          summary,
          caseNumber,
        });
      }
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

export async function fetchDgCompCases(opts: { daysBack?: number; limit?: number } = {}): Promise<DgCompCase[]> {
  const daysBack = opts.daysBack ?? 30;
  const limit = opts.limit ?? 30;
  const cutoff = new Date(Date.now() - daysBack * 86400000);

  // 1. Get dataset metadata from the EU Open Data Portal
  const metadata = await fetchDatasetMetadata();
  if (!metadata) {
    console.log("[dg-comp] all metadata endpoints failed");
    return [];
  }

  // Helpful dump of the top-level keys so we know what shape we're dealing with
  console.log(`[dg-comp] metadata keys: ${Object.keys(metadata).slice(0, 12).join(", ")}`);

  // 2. Find a JSON distribution URL
  const downloadUrl = pickJsonDistribution(metadata);
  if (!downloadUrl) {
    console.log("[dg-comp] no JSON distribution found in metadata");
    return [];
  }

  // 3. Fetch the data file
  console.log(`[dg-comp] downloading ${downloadUrl}`);
  let data: unknown;
  try {
    const res = await fetch(downloadUrl, {
      headers: { Accept: "application/json", "User-Agent": BROWSER_UA },
      cache: "no-store",
    });
    console.log(`[dg-comp] data fetch ${res.status}, content-type=${res.headers.get("content-type")}`);
    if (!res.ok) return [];
    data = await res.json();
  } catch (e) {
    console.log(`[dg-comp] data fetch failed: ${(e as Error).message}`);
    return [];
  }

  // 4. Walk the data and extract case rows
  const cases = harvestCasesFromData(data, limit, cutoff);
  console.log(`[dg-comp] extracted ${cases.length} merger cases (window ${daysBack}d)`);
  return cases;
}

// Fetch the public case detail page (HTML stripped) for the Claude extractor.
export async function fetchDgCompCaseText(url: string, maxChars = 30000): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });
    if (!res.ok) return "";
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      // detail might be JSON; flatten to text
      const json = await res.json();
      return JSON.stringify(json).slice(0, maxChars);
    }
    const html = await res.text();
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxChars);
  } catch {
    return "";
  }
}
