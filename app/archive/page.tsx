import DealUniverse from "../components/DealUniverse";
import { getArchivedDealsForTier, type Tier } from "@/lib/deals";
import { createClient } from "@/lib/supabase/server";

// Historical archive: deals with terminal statuses (Closed, Dead, Liquidated…).
export const dynamic = "force-dynamic";

const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export default async function ArchivePage() {
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

  const deals = await getArchivedDealsForTier(tier);
  return <DealUniverse deals={deals} tier={tier} archiveMode />;
}
