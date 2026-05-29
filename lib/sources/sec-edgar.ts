import "server-only";

// SEC exige un User-Agent identifiable. Cf. https://www.sec.gov/os/accessing-edgar-data
const UA = process.env.SEC_EDGAR_UA ?? "SpecialSitsIntel research@specialsitsintel.com";

export type SecFiling = {
  cik: string;
  company: string;
  form: string;
  filed: string; // YYYY-MM-DD
  accessionNo: string;
  url: string; // page d'index du dépôt
};

type EdgarHitSource = {
  ciks?: string[];
  display_names?: string[];
  form?: string;
  file_date?: string;
  adsh: string;
};

// Recherche full-text EDGAR (public, gratuit). Renvoie quelques dépôts récents
// liés à la requête (ex. nom de société).
export async function searchSecFilings(
  query: string,
  opts: { forms?: string[]; daysBack?: number; limit?: number } = {},
): Promise<SecFiling[]> {
  const forms = opts.forms ?? ["8-K", "S-4", "DEFM14A", "SC 13D"];
  const daysBack = opts.daysBack ?? 14;
  const limit = opts.limit ?? 5;
  const end = new Date();
  const start = new Date(end.getTime() - daysBack * 24 * 3600 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const url = new URL("https://efts.sec.gov/LATEST/search-index");
  url.searchParams.set("q", `"${query}"`);
  url.searchParams.set("forms", forms.join(","));
  url.searchParams.set("dateRange", "custom");
  url.searchParams.set("startdt", fmt(start));
  url.searchParams.set("enddt", fmt(end));

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`EDGAR search ${res.status}`);
  const data = (await res.json()) as { hits?: { hits?: Array<{ _source: EdgarHitSource }> } };
  const hits = data.hits?.hits ?? [];
  return hits.slice(0, limit).map((h) => {
    const s = h._source;
    const cik = (s.ciks?.[0] ?? "").padStart(10, "0");
    const acc = s.adsh;
    return {
      cik,
      company: s.display_names?.[0] ?? "",
      form: s.form ?? "",
      filed: s.file_date ?? "",
      accessionNo: acc,
      url: `https://www.sec.gov/Archives/edgar/data/${parseInt(cik) || 0}/${acc.replace(/-/g, "")}/${acc}-index.htm`,
    };
  });
}

// Récupère un extrait textuel d'un dépôt (HTML stripped, tronqué) pour
// alimenter l'extraction IA sans exploser le contexte.
export async function fetchFilingText(filingIndexUrl: string, maxChars = 40000): Promise<string> {
  const idxRes = await fetch(filingIndexUrl, { headers: { "User-Agent": UA }, cache: "no-store" });
  if (!idxRes.ok) return "";
  const idxHtml = await idxRes.text();
  // Cherche le premier .htm / .txt non-index dans la page d'index
  const candidates = Array.from(idxHtml.matchAll(/href="([^"]+\.(?:htm|txt))"/gi))
    .map((m) => m[1])
    .filter((h) => !/index/i.test(h));
  if (candidates.length === 0) return "";
  const docUrl = new URL(candidates[0], filingIndexUrl).toString();
  const docRes = await fetch(docUrl, { headers: { "User-Agent": UA }, cache: "no-store" });
  if (!docRes.ok) return "";
  const raw = await docRes.text();
  const text = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.slice(0, maxChars);
}

// Liste les dépôts récents par TYPE (non liés à une société précise) —
// utilisé par le Mode Découverte pour trouver de nouveaux deals.
export async function listMaterialFilings(opts: {
  forms?: string[];
  query?: string;
  daysBack?: number;
  limit?: number;
} = {}): Promise<SecFiling[]> {
  const forms = opts.forms ?? ["S-4", "DEFM14A", "SC TO-T", "SC 13D"];
  const query = opts.query ?? "merger";
  const daysBack = opts.daysBack ?? 7;
  const limit = opts.limit ?? 30;
  const end = new Date();
  const start = new Date(end.getTime() - daysBack * 24 * 3600 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const url = new URL("https://efts.sec.gov/LATEST/search-index");
  url.searchParams.set("q", query);
  url.searchParams.set("forms", forms.join(","));
  url.searchParams.set("dateRange", "custom");
  url.searchParams.set("startdt", fmt(start));
  url.searchParams.set("enddt", fmt(end));

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`EDGAR listMaterial ${res.status}`);
  const data = (await res.json()) as { hits?: { hits?: Array<{ _source: EdgarHitSource }> } };
  const hits = data.hits?.hits ?? [];
  return hits.slice(0, limit).map((h) => {
    const s = h._source;
    const cik = (s.ciks?.[0] ?? "").padStart(10, "0");
    const acc = s.adsh;
    return {
      cik,
      company: s.display_names?.[0] ?? "",
      form: s.form ?? "",
      filed: s.file_date ?? "",
      accessionNo: acc,
      url: `https://www.sec.gov/Archives/edgar/data/${parseInt(cik) || 0}/${acc.replace(/-/g, "")}/${acc}-index.htm`,
    };
  });
}
