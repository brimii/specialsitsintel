import DealUniverse from "./components/DealUniverse";
import { getDealsForTier, type Tier } from "@/lib/deals";
import { createClient } from "@/lib/supabase/server";
import { ALERTS as STATIC_ALERTS } from "./data/content";

// Reads per request (tier depends on the signed-in user).
export const dynamic = "force-dynamic";

const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export default async function Home() {
  // Tier resolved server-side; deals are tier-filtered before the
  // response payload crosses to the browser.
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

  // Alerts are the static daily feed for now — the live-pipeline blend
  // belonged to the old discovery system which has been removed. Real-
  // time alerts come back as a Supabase-backed feed in a later step.
  return <DealUniverse deals={deals} tier={tier} alerts={STATIC_ALERTS} />;
}
