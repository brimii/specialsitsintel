import DealUniverse from "./components/DealUniverse";
import { getDealsForTier, type Tier } from "@/lib/deals";
import { createClient } from "@/lib/supabase/server";
import { getLiveAlerts } from "@/lib/alerts";
import { ALERTS as STATIC_ALERTS } from "./data/content";

// Lecture par requête (dépend de l'utilisateur connecté → dynamique).
export const dynamic = "force-dynamic";

const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export default async function Home() {
  // Palier déterminé CÔTÉ SERVEUR ; les deals sont filtrés avant envoi au navigateur.
  let tier: Tier = "free";
  if (hasSupabase) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tier")
        .eq("id", user.id)
        .single();
      tier = (profile?.tier as Tier) ?? "free";
    }
  }

  const deals = await getDealsForTier(tier);

  // Blend live pipeline events (auto-publications + new-deal discoveries)
  // with the static curated fallback so the LIVE INTEL banner is never
  // empty on a quiet week. Live events bubble to the front, static
  // fills the tail up to 15 items total.
  let alerts = STATIC_ALERTS;
  if (hasSupabase) {
    try {
      const { live } = await getLiveAlerts(12);
      if (live.length > 0) {
        alerts = [...live, ...STATIC_ALERTS.slice(0, Math.max(0, 15 - live.length))];
      }
    } catch {
      // Best-effort — falling back to STATIC_ALERTS is fine.
    }
  }

  return <DealUniverse deals={deals} tier={tier} alerts={alerts} />;
}
