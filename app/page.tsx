import DealUniverse from "./components/DealUniverse";
import { getDeals } from "@/lib/deals";

// Server Component : lit les deals CÔTÉ SERVEUR (Supabase si configuré, sinon
// fallback local) et ne transmet au navigateur que les données autorisées.
export default async function Home() {
  const deals = await getDeals();
  return <DealUniverse deals={deals} />;
}
