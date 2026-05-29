import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { getAnthropic, EXTRACTION_MODEL } from "@/lib/anthropic";
import { listMaterialFilings, fetchFilingText, type SecFiling } from "@/lib/sources/sec-edgar";

// ════════════════════════════════════════════════════════════════════
// Mode Découverte (Phase 3, bis)
//
// Scanne EDGAR globalement (S-4, DEFM14A, SC TO-T, SC 13D, 8-K merger)
// pour repérer des annonces de NOUVEAUX deals event-driven qui ne sont
// pas encore en base. Pour chaque dépôt, Claude détermine :
//   - is_deal : est-ce une annonce event-driven ?
//   - deal : la structure complète si oui.
// Dédup par nom normalisé + ticker. Les candidats validés vont en
// review_queue avec kind="new_deal" — l'admin approuve pour insertion.
// ════════════════════════════════════════════════════════════════════

const DISCOVERY_SYSTEM_PROMPT = `Tu es un analyste financier institutionnel spécialisé event-driven (merger arbitrage, activisme actionnarial, dette distressed, spin-offs, restructurations, tender offers). À partir d'un dépôt SEC, tu détermines s'il s'agit d'une annonce d'un NOUVEAU deal event-driven, et si oui tu en extrais la structure complète.

# Critères

Un dépôt est un "deal event-driven" si :
- Il annonce une acquisition / fusion (signed merger agreement, definitive agreement, tender offer).
- Il signale une prise de stake activiste significative (SC 13D avec intent control).
- Il annonce un spin-off, un split-off, ou une séparation matérielle.
- Il documente une restructuration formelle / Chapter 11 / OOC.

Un dépôt N'EST PAS un deal event-driven si :
- C'est un dépôt administratif sans transaction (renouvellement de plan, départ d'un dirigeant simple).
- C'est une mise à jour d'un deal déjà annoncé (= rôle du mode UPDATE, pas DISCOVERY).
- C'est une 13G passive (pas 13D).
- Le dépôt mentionne "merger" en référence à un événement passé non lié.

# Sortie

JSON strict, pas de markdown, pas de texte hors JSON :

\`\`\`json
{
  "is_deal": true | false,
  "deal": {
    "nm": "Target Company Inc.",
    "acq": "Acquirer Co",
    "v": "$5.2B",
    "c": "MERGER" | "ACTIVISM" | "DISTRESSED" | "SPINOFF" | "REORG" | "TENDER",
    "r": "FTC" | "DOJ" | "FTC/DOJ" | "HSR" | "FCC" | "SEC 13D" | "CFIUS" | etc.,
    "st": "Review" | "Closing" | "Active" | "Rumored",
    "sc": "G" | "A" | "R" | "P" | "B",
    "reg": "US",
    "cl": "Q3 2026",
    "desc": "1-2 phrases factuelles sur le deal (qui acquiert qui, pourquoi).",
    "ai": "1 phrase analytique (signaux à surveiller).",
    "f": "🇺🇸",
    "pr": { "u": 0, "c": 0, "o": 25.50, "sym": "TGTC", "cur": "$", "ad": "Apr 2026" },
    "tl": [{ "d": "Apr 2026", "t": "ANNOUNCED", "x": "Brief description" }]
  }
}
\`\`\`

Si \`is_deal\` est false, renvoie \`deal: null\`.

# Règles d'extraction

- **nm** : nom de la cible (le PLUS souvent le filer pour S-4/DEFM14A ; pour SC 13D c'est la société cible).
- **acq** : nom de l'acquéreur / activiste.
- **v** : valeur totale du deal en chaîne ("$5.2B", "€800M", "TBD" si non publiée).
- **c** : catégorie selon les types. SC 13D → ACTIVISM. SC TO-T → TENDER. S-4 / DEFM14A → MERGER. Chapter 11 → DISTRESSED. Spin-off declaration → SPINOFF.
- **r** : régulateur principal anticipé. Cash deal US > $119M → HSR. Vertical big tech → DOJ. Pharma horizontal → FTC. Cross-border tech → CFIUS.
- **st** : à l'annonce = "Review". Si le dépôt indique déjà des clearances obtenues = "Closing".
- **sc** (code couleur score) :
  - "G" = green (sécurisé, peu de risque réglementaire)
  - "A" = amber (review classique, incertitude modérée)
  - "R" = red (contesté, binaire)
  - "P" = purple (activisme)
  - "B" = blue (autre)
- **reg** : "US" (dépôts SEC = US par construction, sauf rare cas).
- **cl** : estimation de close ("Q3 2026", "H2 2026", "TBD" sinon).
- **f** : drapeau émoji ("🇺🇸" par défaut, "🇬🇧" si UK target, etc.).
- **pr.o** : prix d'offre par action si explicite ; sinon 0.
- **pr.sym** : ticker si connu ; sinon chaîne vide.
- **pr.cur** : "$", "€", "£", "¥" selon le contexte.
- **pr.ad** : mois + année de l'annonce ("Apr 2026").
- **pr.u, pr.c** : 0 (l'humain estimera).
- **tl** : 1 entrée minimum (ANNOUNCED + date + 1 phrase). Pas d'invention au-delà.

# Anti-hallucination

- Si tu n'es PAS sûr que c'est un deal, mets \`is_deal: false\` (mieux vaut rater une découverte que polluer la base).
- Si un champ n'est pas dans le dépôt, mets une valeur prudente ("TBD", 0, chaîne vide) plutôt que d'inventer.
- Ne propose pas de spread ou proba_close (ce sera estimé en aval).

Réponds uniquement avec le JSON, sans \`\`\`json fences, sans préface.`;

type DiscoveredDeal = {
  nm: string;
  acq: string;
  v: string;
  c: string;
  r: string;
  st: string;
  sc: string;
  reg: string;
  cl: string;
  desc: string;
  ai: string;
  f: string;
  pr: { u: number; c: number; o: number; sym: string; cur: string; ad: string };
  tl: Array<{ d: string; t: string; x: string }>;
};

type DiscoveryResponse = {
  is_deal: boolean;
  deal: DiscoveredDeal | null;
};

function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[,.()]/g, "")
    .replace(/\s+(inc|corp|corporation|holdings|group|ltd|plc|ag|sa|nv|co|company|llc|llp|trust|reit|sas|gmbh)\.?$/i, "")
    .trim();
}

async function extractDiscovery(filing: SecFiling, text: string): Promise<DiscoveryResponse | null> {
  if (!text) return null;
  const anthropic = getAnthropic();
  const userMsg = `DÉPÔT SEC :
Form ${filing.form} déposé le ${filing.filed} par ${filing.company}.
URL : ${filing.url}

CONTENU (texte brut, peut contenir du bruit) :
${text}`;

  const res = await anthropic.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 1024,
    system: [{ type: "text", text: DISCOVERY_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMsg }],
  });
  const block = res.content[0];
  const json = block && block.type === "text" ? block.text : "";
  try {
    return JSON.parse(json) as DiscoveryResponse;
  } catch (e) {
    console.error("[discovery] JSON parse failed:", (e as Error).message, json.slice(0, 200));
    return null;
  }
}

export type DiscoveryResult = {
  filingsScanned: number;
  candidates: number;
  inserted: number;
  duplicates: number;
  errors: string[];
};

export async function discoverNewDeals(opts: { daysBack?: number; maxFilings?: number } = {}): Promise<DiscoveryResult> {
  const daysBack = opts.daysBack ?? 7;
  const maxFilings = opts.maxFilings ?? 25;
  const errors: string[] = [];
  const admin = createAdminClient();

  // Index des deals existants pour dédup
  const { data: existing } = await admin.from("deals").select("nom, price");
  const existingNames = new Set<string>();
  const existingSyms = new Set<string>();
  for (const d of (existing ?? []) as Array<{ nom: string; price: unknown }>) {
    existingNames.add(normalize(d.nom));
    const pr = d.price as { sym?: string } | null;
    if (pr?.sym) existingSyms.add(normalize(pr.sym));
  }

  let filings: SecFiling[] = [];
  try {
    filings = await listMaterialFilings({ daysBack, limit: maxFilings });
  } catch (e) {
    errors.push(`EDGAR list: ${(e as Error).message}`);
    return { filingsScanned: 0, candidates: 0, inserted: 0, duplicates: 0, errors };
  }

  let candidates = 0;
  let inserted = 0;
  let duplicates = 0;

  for (const f of filings) {
    // Dédup rapide par filer (avant de lire le texte)
    if (existingNames.has(normalize(f.company))) {
      duplicates++;
      continue;
    }
    const text = await fetchFilingText(f.url).catch(() => "");
    if (!text) continue;

    const resp = await extractDiscovery(f, text).catch((e) => {
      errors.push(`extract ${f.accessionNo}: ${(e as Error).message}`);
      return null;
    });
    if (!resp || !resp.is_deal || !resp.deal) continue;
    candidates++;

    const d = resp.deal;
    const targetKey = normalize(d.nm);
    const symKey = normalize(d.pr?.sym);
    if (existingNames.has(targetKey) || (symKey && existingSyms.has(symKey))) {
      duplicates++;
      continue;
    }

    // En file de revue (kind: new_deal) — l'admin valide.
    const { error: insErr } = await admin.from("review_queue").insert({
      proposition: { kind: "new_deal", deal: d } as unknown as Record<string, unknown>,
      source_url: f.url,
      confiance: 80,
      statut: "en_attente",
    });
    if (insErr) {
      errors.push(`queue insert ${f.accessionNo}: ${insErr.message}`);
      continue;
    }
    existingNames.add(targetKey);
    if (symKey) existingSyms.add(symKey);
    inserted++;
  }

  return { filingsScanned: filings.length, candidates, inserted, duplicates, errors };
}
