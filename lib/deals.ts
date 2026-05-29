import "server-only";
import { DEALS, type Deal, type Price, type TimelineEntry } from "@/app/data/deals";

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

function rowToDeal(r: DealRow): Deal {
  return {
    id: r.id,
    f: r.flag ?? "",
    nm: r.nom,
    acq: r.acquereur ?? "",
    v: r.valeur ?? "",
    s: r.spread ?? 0,
    p: r.proba_close ?? 0,
    ev: r.ev ?? 0,
    r: r.regulateur ?? "",
    c: r.categorie ?? "",
    st: r.statut ?? "",
    sc: r.score ?? "G",
    reg: r.region ?? "",
    cl: r.close_estimate ?? "",
    pr: r.price ?? { u: 0, c: 0, o: 0, sym: "", cur: "$", ad: "" },
    desc: r.description ?? "",
    ai: r.ai_commentary ?? "",
    tl: r.timeline ?? [],
    min_tier: r.min_tier ?? "analyst",
  };
}

async function fetchAllRawDeals(): Promise<Deal[]> {
  if (!hasSupabase) return DEALS;
  const { createAdminClient } = await import("./supabase/server");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .order("spread", { ascending: false });
  if (error) {
    console.error("[deals] Supabase read failed, falling back to local:", error.message);
    return DEALS;
  }
  return (data as DealRow[]).map(rowToDeal);
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
