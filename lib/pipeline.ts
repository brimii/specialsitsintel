import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { getAnthropic, EXTRACTION_MODEL } from "@/lib/anthropic";
import { searchSecFilings, fetchFilingText, type SecFiling } from "@/lib/sources/sec-edgar";

// ════════════════════════════════════════════════════════════════════
// Pipeline semi-automatique (Phase 3)
//
// Principe : sources publiques (SEC EDGAR) -> extraction structurée par
// Claude (sortie JSON) -> garde-fous -> deals + deal_updates OU review_queue.
//
// Garde-fous : un changement va en review_queue si MAJEUR, OU confiance < 85,
// OU une seule source. Sinon : appliqué automatiquement + tracé.
// ════════════════════════════════════════════════════════════════════

export type ChangeType = "MAJEUR" | "MINEUR";

export type ProposedUpdate = {
  deal_id: number;
  champ_modifie: string;
  ancienne_valeur: string | null;
  nouvelle_valeur: string;
  source_url: string;
  confiance: number;
  type_changement: ChangeType;
  resume: string;
};

type DealRecord = {
  id: number;
  nom: string;
  acquereur: string | null;
  statut: string | null;
  spread: number | null;
  proba_close: number | null;
  regulateur: string | null;
  close_estimate: string | null;
  description: string | null;
};

const ALLOWED_FIELDS = new Set([
  "statut",
  "spread",
  "proba_close",
  "regulateur",
  "close_estimate",
  "description",
]);

// Système : long et détaillé pour profiter du PROMPT CACHING d'Anthropic
// (le bloc est répété entre dépôts, on le marque ephemeral).
const SYSTEM_PROMPT = `Tu es un analyste financier institutionnel spécialisé dans les situations event-driven (merger arbitrage, activisme actionnarial, dette distressed, spin-offs, restructurations, tender offers). Ton rôle : à partir d'un dépôt SEC (texte brut), proposer des mises à jour structurées pour un deal déjà en base.

# Sortie

Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans texte hors JSON, selon le schéma ci-dessous.

\`\`\`json
{
  "updates": [
    {
      "champ_modifie": "statut" | "spread" | "proba_close" | "regulateur" | "close_estimate" | "description",
      "nouvelle_valeur": string,
      "confiance": number,
      "type_changement": "MAJEUR" | "MINEUR",
      "resume": string
    }
  ]
}
\`\`\`

Si le dépôt n'apporte AUCUNE information matérielle pour CE deal précis (faux positif de recherche, contenu hors-sujet, doublon d'une info déjà présente), renvoie simplement \`{"updates": []}\`. La sobriété est valorisée : ne propose pas de changement non sourcé par le dépôt.

# Définitions

- **champ_modifie** : nom de colonne SQL (français, snake_case) parmi la liste autorisée ci-dessus.
- **nouvelle_valeur** : toujours une chaîne (les numériques seront convertis en aval). Pour \`statut\`, utilise une valeur courte : "Closing", "Closed", "Review", "Litigation", "Trial", "Blocked", "Dead", "Settled", "Active", "Rumored", "Monitoring".
- **confiance** : score 0-100 reflétant ta certitude que le dépôt établit ce changement. Sois sévère : 95+ pour fait incontestable (consent FTC, ruling, closing confirmé), 70-90 pour signal fort mais indirect, <70 pour spéculation.
- **type_changement** :
  - **MAJEUR** = closing confirmé, blocage régulateur, échec/abandon de deal, prise de contrôle, changement de statut, prix d'offre modifié, présidente bloque, échec litige.
  - **MINEUR** = mise à jour de date d'audience, requête d'info de routine, dépôt administratif, mise à jour de description, changement non-matériel.
- **resume** : 1 phrase factuelle (≤ 160 caractères) citant la source du fait dans le dépôt.

# Règles de qualité

1. **Les sources priment sur le savoir général.** Si le dépôt ne mentionne pas explicitement le changement, ne le propose pas — même si tu "sais" qu'il est vrai par ailleurs.
2. **Pas d'hallucination de champ.** Tout champ_modifie doit appartenir à la liste autorisée.
3. **Pas de spéculation sur la proba_close** sans signal régulateur explicite (consent, second request, block, ruling).
4. **Échec/dead** uniquement si le dépôt confirme l'abandon ou la rupture (10-K mentionnant une rupture, communiqué d'abandon).
5. **Doublons** : si la valeur proposée est identique à la valeur actuelle du deal en base, n'émets PAS de proposition.

# Exemples

## Exemple 1 — MAJEUR confirmé

Dépôt 8-K : "On April 3, 2026, the Company and Hewlett Packard Enterprise jointly announced that the U.S. Federal Trade Commission has unanimously approved the proposed merger..."

Sortie :
\`\`\`json
{"updates":[{"champ_modifie":"statut","nouvelle_valeur":"Closing","confiance":97,"type_changement":"MAJEUR","resume":"FTC unanimously approves merger (8-K, 3 avril 2026)."}]}
\`\`\`

## Exemple 2 — MINEUR

Dépôt 8-K (DEF 14A amendment) : "The hearing previously scheduled for May 12, 2026, has been rescheduled to July 8, 2026."

Sortie :
\`\`\`json
{"updates":[{"champ_modifie":"close_estimate","nouvelle_valeur":"Q3 2026","confiance":78,"type_changement":"MINEUR","resume":"Audience reportée du 12 mai au 8 juillet 2026 (8-K)."}]}
\`\`\`

## Exemple 3 — Aucune info matérielle

Dépôt 8-K générique : "Item 5.02. Departure of Directors or Certain Officers..." sans lien avec le deal.

Sortie :
\`\`\`json
{"updates":[]}
\`\`\`

# Format strict

Réponds avec UNE SEULE valeur JSON, sans \`\`\`json\`\`\` fences, sans préface, sans suffixe. Le parseur fera \`JSON.parse(ta_reponse)\` sans nettoyage.`;

async function extractUpdates(deal: DealRecord, filing: SecFiling, text: string): Promise<ProposedUpdate[]> {
  if (!text) return [];
  const anthropic = getAnthropic();
  const userMsg = `DEAL EN BASE (état actuel) :
${JSON.stringify(
  {
    id: deal.id,
    nom: deal.nom,
    acquereur: deal.acquereur,
    statut: deal.statut,
    spread: deal.spread,
    proba_close: deal.proba_close,
    regulateur: deal.regulateur,
    close_estimate: deal.close_estimate,
  },
  null,
  2,
)}

DÉPÔT SEC :
Form ${filing.form} déposé le ${filing.filed} par ${filing.company}.
URL : ${filing.url}

CONTENU (texte brut, peut contenir du bruit) :
${text}`;

  const res = await anthropic.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 1024,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMsg }],
  });
  const block = res.content[0];
  const json = block && block.type === "text" ? block.text : "";
  try {
    const parsed = JSON.parse(json) as { updates?: unknown[] };
    const raw = Array.isArray(parsed.updates) ? parsed.updates : [];
    return raw
      .map((r) => r as Record<string, unknown>)
      .filter((u) => ALLOWED_FIELDS.has(String(u.champ_modifie)))
      .map((u) => ({
        deal_id: deal.id,
        champ_modifie: String(u.champ_modifie),
        ancienne_valeur: getOldVal(deal, String(u.champ_modifie)),
        nouvelle_valeur: String(u.nouvelle_valeur ?? ""),
        source_url: filing.url,
        confiance: clampNum(u.confiance, 0, 100),
        type_changement: (u.type_changement === "MAJEUR" ? "MAJEUR" : "MINEUR") as ChangeType,
        resume: String(u.resume ?? ""),
      }))
      .filter((u) => u.nouvelle_valeur !== "" && u.nouvelle_valeur !== u.ancienne_valeur);
  } catch (e) {
    console.error("[pipeline] JSON parse failed:", (e as Error).message, json.slice(0, 200));
    return [];
  }
}

function clampNum(v: unknown, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(min, Math.min(max, n));
}

function getOldVal(deal: DealRecord, field: string): string | null {
  const v = (deal as unknown as Record<string, unknown>)[field];
  return v == null ? null : String(v);
}

const CONFIDENCE_THRESHOLD = 85;

// shouldAutoApply : vrai uniquement si MINEUR + confiance haute + ≥2 sources concordantes.
function shouldAutoApply(u: ProposedUpdate, sourceCount: number): boolean {
  if (u.type_changement === "MAJEUR") return false;
  if (u.confiance < CONFIDENCE_THRESHOLD) return false;
  if (sourceCount < 2) return false;
  return true;
}

function parseValueForField(field: string, v: string): string | number {
  if (field === "spread") return Number.parseFloat(v) || 0;
  if (field === "proba_close") return Number.parseInt(v) || 0;
  return v;
}

export type PipelineResult = {
  dealsScanned: number;
  filingsScanned: number;
  proposalsExtracted: number;
  autoApplied: number;
  queued: number;
  errors: string[];
};

export async function runPipeline(opts: { maxDeals?: number; maxFilingsPerDeal?: number } = {}): Promise<PipelineResult> {
  const maxDeals = opts.maxDeals ?? 20;
  const maxFilingsPerDeal = opts.maxFilingsPerDeal ?? 3;
  const errors: string[] = [];
  const admin = createAdminClient();

  const { data: dealsData, error: dealsErr } = await admin
    .from("deals")
    .select("id, nom, acquereur, statut, spread, proba_close, regulateur, close_estimate, description")
    .not("statut", "in", '("Closed","Dead","Liquidated")');
  if (dealsErr) {
    errors.push(`load deals: ${dealsErr.message}`);
    return { dealsScanned: 0, filingsScanned: 0, proposalsExtracted: 0, autoApplied: 0, queued: 0, errors };
  }
  const deals = (dealsData as DealRecord[]) ?? [];

  let filingsScanned = 0;
  let proposalsExtracted = 0;
  let autoApplied = 0;
  let queued = 0;

  for (const deal of deals.slice(0, maxDeals)) {
    let filings: SecFiling[] = [];
    try {
      filings = await searchSecFilings(deal.nom, { daysBack: 14, limit: maxFilingsPerDeal });
    } catch (e) {
      errors.push(`EDGAR ${deal.nom}: ${(e as Error).message}`);
      continue;
    }
    filingsScanned += filings.length;
    const seen = new Set<string>();
    const allProposals: ProposedUpdate[] = [];
    for (const f of filings) {
      if (seen.has(f.accessionNo)) continue;
      seen.add(f.accessionNo);
      const text = await fetchFilingText(f.url).catch(() => "");
      const proposals = await extractUpdates(deal, f, text).catch((e) => {
        errors.push(`extract ${deal.nom}/${f.accessionNo}: ${(e as Error).message}`);
        return [] as ProposedUpdate[];
      });
      allProposals.push(...proposals);
    }
    proposalsExtracted += allProposals.length;

    // Décision : appliquer ou mettre en file de revue
    for (const u of allProposals) {
      const concordant = allProposals.filter((p) => p.champ_modifie === u.champ_modifie && p.nouvelle_valeur === u.nouvelle_valeur).length;
      if (shouldAutoApply(u, concordant)) {
        const updatePayload: Record<string, unknown> = {
          [u.champ_modifie]: parseValueForField(u.champ_modifie, u.nouvelle_valeur),
          updated_at: new Date().toISOString(),
        };
        const { error: upErr } = await admin.from("deals").update(updatePayload).eq("id", u.deal_id);
        if (upErr) {
          errors.push(`update deal ${u.deal_id}: ${upErr.message}`);
          continue;
        }
        await admin.from("deal_updates").insert({
          deal_id: u.deal_id,
          champ_modifie: u.champ_modifie,
          ancienne_valeur: u.ancienne_valeur,
          nouvelle_valeur: u.nouvelle_valeur,
          source_url: u.source_url,
          confiance: u.confiance,
          auteur: "ia",
        });
        autoApplied++;
      } else {
        await admin.from("review_queue").insert({
          proposition: u as unknown as Record<string, unknown>,
          source_url: u.source_url,
          confiance: u.confiance,
          statut: "en_attente",
        });
        queued++;
      }
    }
  }

  return { dealsScanned: Math.min(deals.length, maxDeals), filingsScanned, proposalsExtracted, autoApplied, queued, errors };
}
