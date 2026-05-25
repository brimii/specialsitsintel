import "server-only";
import { DEALS, type Deal, type Price, type TimelineEntry } from "@/app/data/deals";

export type Tier = "free" | "analyst" | "institutional" | "enterprise";

const RANK: Record<string, number> = { free: 0, analyst: 1, institutional: 2, enterprise: 3 };
export const tierRank = (t: string) => RANK[t] ?? 0;

const FREE_PREVIEW_COUNT = 5;

// Tant que Supabase n'est pas configuré (pas d'env), fallback sur les données locales.
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

async function fetchAllDeals(): Promise<Deal[]> {
  if (!hasSupabase) return DEALS;
  const { createAdminClient } = await import("./supabase/server");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .order("spread", { ascending: false });
  if (error) {
    console.error("[deals] Lecture Supabase échouée, fallback local :", error.message);
    return DEALS;
  }
  return (data as DealRow[]).map(rowToDeal);
}

// Statistiques agrégées (public marketing : nombre, spread moyen). Non restreint.
export async function getAllDeals(): Promise<Deal[]> {
  return fetchAllDeals();
}

// Retire les champs premium AVANT envoi au navigateur (règle d'or).
function stripForFree(d: Deal): Deal {
  return { ...d, ai: "", desc: "", pr: { ...d.pr, u: 0, c: 0, o: 0 } };
}

// Deals visibles selon le palier de l'utilisateur, filtrés CÔTÉ SERVEUR.
export async function getDealsForTier(tier: Tier): Promise<Deal[]> {
  const all = await fetchAllDeals();
  if (tier === "free") {
    // Aperçu gratuit : 5 deals, sans commentaire IA / scoring / graphique.
    return all.slice(0, FREE_PREVIEW_COUNT).map(stripForFree);
  }
  // Payant : tous les deals dont min_tier <= palier de l'utilisateur.
  return all.filter((d) => tierRank(tier) >= tierRank(d.min_tier ?? "analyst"));
}
