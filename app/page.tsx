import DealUniverse from "./components/DealUniverse";
import { getDealsForTier, type Tier } from "@/lib/deals";
import { createClient } from "@/lib/supabase/server";

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
  return <DealUniverse deals={deals} tier={tier} />;
}
