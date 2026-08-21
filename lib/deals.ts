import "server-only";
import { DEALS, bucketSourceFromUrl, deriveSourceFromDeal, type Deal, type Price, type TimelineEntry } from "@/app/data/deals";

export type Tier = "free" | "analyst" | "institutional" | "enterprise";

const RANK: Record<string, number> = { free: 0, analyst: 1, institutional: 2, enterprise: 3 };
export const tierRank = (t: string) => RANK[t] ?? 0;

const FREE_PREVIEW_COUNT = 5;

// Terminal statuses — a deal in any of these is considered archived (historical).
const TERMINAL_STATUSES = new Set([
  "Closed",
  "Dead",
  "Liquidated",
  "Settled",
  "Terminated",
  "Withdrawn",
  "Won",
  "Closed Won",
  "Cancelled",
  "Canceled",
  "Failed",
]);

export function isActiveStatus(s: string | null | undefined): boolean {
  if (!s) return true;
  return !TERMINAL_STATUSES.has(s);
}

const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

type DealRow = {
  id: number;
  nom: string;
  acquereur: string | null;
  valeur: string | null;
  spread: number | null;
  proba_close: number | null;
  ev: number | null;
  regulateur: string | null;
  categorie: string | null;
  statut: string | null;
  region: string | null;
  description: string | null;
  ai_commentary: string | null;
  min_tier: string | null;
  flag: string | null;
  score: string | null;
  close_estimate: string | null;
  price: Price | null;
  timeline: TimelineEntry[] | null;
};

// Parse "Q3 2026", "H1 2027", "Mar 2027" → approximate months from
// today. Returns null if unparseable so callers can pick a sensible
// default. Very forgiving on format — analysts type these free-form.
function monthsToClose(close: string | null | undefined): number | null {
  if (!close) return null;
  const s = close.trim();
  const now = new Date();
  const nowY = now.getUTCFullYear();
  const nowM = now.getUTCMonth(); // 0-11
  let targetY: number | null = null;
  let targetM: number | null = null;

  const q = s.match(/Q([1-4])\s*(\d{4})/i);
  if (q) {
    targetY = parseInt(q[2], 10);
    targetM = (parseInt(q[1], 10) - 1) * 3 + 1; // mid-quarter
  } else {
    const h = s.match(/H([12])\s*(\d{4})/i);
    if (h) {
      targetY = parseInt(h[2], 10);
      targetM = h[1] === "1" ? 2 : 8; // mid-half
    } else {
      const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const m = s.match(/([A-Za-z]{3,9})\s*(\d{4})/);
      if (m) {
        const idx = monthNames.indexOf(m[1].slice(0, 3).toLowerCase());
        if (idx >= 0) {
          targetY = parseInt(m[2], 10);
          targetM = idx;
        }
      }
    }
  }
  if (targetY === null || targetM === null) return null;
  const months = (targetY - nowY) * 12 + (targetM - nowM);
  return months;
}

// Deal-metric estimators. The pipeline discovery leaves spread and
// proba_close at 0 by design (Claude is told not to speculate); these
// helpers fill in downstream so the KPI bar / DealTable aren't a sea
// of zeros. Called from rowToDeal only when the DB row is at 0.
function computeSpread(price: Price, closeEstimate: string | null): number {
  const o = price?.o ?? 0;
  const c = price?.c ?? 0;
  if (o <= 0 || c <= 0) return 0;
  const grossPremium = ((o - c) / c) * 100;
  if (!Number.isFinite(grossPremium) || grossPremium <= 0) return 0;
  // Annualise: default to 12 months if we can't parse close_estimate.
  // Clamp between 1 and 24 months so a stale/vague date doesn't explode
  // (annualised premium at 0.5 months = 2400% is meaningless).
  const raw = monthsToClose(closeEstimate);
  const months = raw === null ? 12 : Math.max(1, Math.min(24, raw));
  const annualised = grossPremium * (12 / months);
  return Math.round(annualised * 10) / 10;
}

// Proba-close heuristic keyed off statut + score band. These are the
// same buckets analysts use as first-cut mental models before running
// a deeper regulatory / documentary analysis.
function computeProbaClose(statut: string | null, score: string | null): number {
  const st = (statut ?? "").toLowerCase();
  const sc = (score ?? "G").toUpperCase();
  if (/^closed|closing|closed won|settled|won$/.test(st)) return 97;
  if (/^blocked|dead|terminated|withdrawn|failed|cancelled|canceled$/.test(st)) return 3;
  if (/litigation|trial/.test(st)) return 50;
  if (/rumored/.test(st)) return 30;
  // Active / Review / Monitoring / Phase II / Consent — score drives the number
  const byScore: Record<string, number> = { G: 85, A: 68, R: 45, P: 60, B: 65 };
  return byScore[sc] ?? 60;
}

function rowToDeal(r: DealRow): Deal {
  const price = r.price ?? { u: 0, c: 0, o: 0, sym: "", cur: "$", ad: "" };
  const rawSpread = r.spread ?? 0;
  const rawProba = r.proba_close ?? 0;
  const s = rawSpread > 0 ? rawSpread : computeSpread(price, r.close_estimate);
  const p = rawProba > 0 ? rawProba : computeProbaClose(r.statut, r.score);
  return {
    id: r.id,
    f: r.flag ?? "",
    nm: r.nom,
    acq: r.acquereur ?? "",
    v: r.valeur ?? "",
    s,
    p,
    ev: r.ev ?? 0,
    r: r.regulateur ?? "",
    c: r.categorie ?? "",
    st: r.statut ?? "",
    sc: r.score ?? "G",
    reg: r.region ?? "",
    cl: r.close_estimate ?? "",
    pr: price,
    desc: r.description ?? "",
    ai: r.ai_commentary ?? "",
    tl: r.timeline ?? [],
    min_tier: r.min_tier ?? "analyst",
  };
}

// Pick the best source label for a deal: prefer a real bucketed URL from
// deal_updates._creation, fall back to the flag/region heuristic for the
// seeded 213 fixtures so every deal shows a meaningful badge.
function pickSource(deal: Deal, urlBucket: string | undefined): string {
  if (urlBucket && urlBucket !== "Seeded" && urlBucket !== "Other") return urlBucket;
  return deriveSourceFromDeal(deal);
}

async function fetchAllRawDeals(): Promise<Deal[]> {
  if (!hasSupabase) {
    // Local fixture mode: no Supabase, derive each deal's source from
    // its flag/region so the dealtable badge still works.
    return DEALS.map((d) => ({ ...d, source: deriveSourceFromDeal(d) }));
  }
  const { createAdminClient } = await import("./supabase/server");
  const supabase = createAdminClient();
  const [dealsRes, creationsRes] = await Promise.all([
    supabase.from("deals").select("*").order("spread", { ascending: false }),
    supabase
      .from("deal_updates")
      .select("deal_id, source_url")
      .eq("champ_modifie", "_creation"),
  ]);
  if (dealsRes.error) {
    console.error("[deals] Supabase read failed, falling back to local:", dealsRes.error.message);
    return DEALS.map((d) => ({ ...d, source: deriveSourceFromDeal(d) }));
  }
  // Map deal_id → source_url so each deal gets a badge label. Missing
  // creation row = the deal was seeded (213 fixtures) and has no
  // traceable source, so we fall back to the flag heuristic.
  const sourceUrlByDealId = new Map<number, string>();
  for (const row of (creationsRes.data ?? []) as Array<{ deal_id: number; source_url: string | null }>) {
    if (row.source_url) sourceUrlByDealId.set(row.deal_id, row.source_url);
  }
  return (dealsRes.data as DealRow[]).map((r) => {
    const deal = rowToDeal(r);
    const urlBucket = sourceUrlByDealId.has(r.id)
      ? bucketSourceFromUrl(sourceUrlByDealId.get(r.id))
      : undefined;
    deal.source = pickSource(deal, urlBucket);
    return deal;
  });
}

// All ACTIVE deals (aggregated stats — used by the KPI bar).
export async function getAllDeals(): Promise<Deal[]> {
  const all = await fetchAllRawDeals();
  return all.filter((d) => isActiveStatus(d.st));
}

// All deals regardless of status (used by admin views).
export async function getAllDealsIncludingArchived(): Promise<Deal[]> {
  return fetchAllRawDeals();
}

function stripForFree(d: Deal): Deal {
  return { ...d, ai: "", desc: "", pr: { ...d.pr, u: 0, c: 0, o: 0 } };
}

// Active deals filtered by tier — for the public Universe (/).
export async function getDealsForTier(tier: Tier): Promise<Deal[]> {
  const all = await fetchAllRawDeals();
  const active = all.filter((d) => isActiveStatus(d.st));
  if (tier === "free") {
    return active.slice(0, FREE_PREVIEW_COUNT).map(stripForFree);
  }
  return active.filter((d) => tierRank(tier) >= tierRank(d.min_tier ?? "analyst"));
}

// Archived deals filtered by tier — for the public Archive (/archive).
export async function getArchivedDealsForTier(tier: Tier): Promise<Deal[]> {
  const all = await fetchAllRawDeals();
  const archived = all.filter((d) => !isActiveStatus(d.st));
  if (tier === "free") {
    return archived.slice(0, FREE_PREVIEW_COUNT).map(stripForFree);
  }
  return archived.filter((d) => tierRank(tier) >= tierRank(d.min_tier ?? "analyst"));
}
