import "server-only";
import { DEALS, type Deal, type Price, type TimelineEntry } from "@/app/data/deals";

// Lecture des deals CÔTÉ SERVEUR. Tant que Supabase n'est pas configuré
// (pas d'env), on retombe sur les données locales pour que l'app tourne.
// Une fois Supabase branché et seedé, la lecture devient live.
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
  };
}

export async function getDeals(): Promise<Deal[]> {
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
