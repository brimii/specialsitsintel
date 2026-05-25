// Seed des 213 deals vers Supabase via la clé service_role.
// Usage : remplir .env.local puis `npm run seed`.
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { DEALS } from "../app/data/deals";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans .env.local",
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const rows = DEALS.map((d) => ({
  id: d.id,
  nom: d.nm,
  acquereur: d.acq,
  valeur: d.v,
  spread: d.s,
  proba_close: d.p,
  ev: d.ev,
  regulateur: d.r,
  categorie: d.c,
  statut: d.st,
  region: d.reg,
  description: d.desc,
  ai_commentary: d.ai,
  flag: d.f,
  score: d.sc,
  close_estimate: d.cl,
  price: d.pr,
  timeline: d.tl,
}));

async function main() {
  console.log(`Insertion / mise à jour de ${rows.length} deals…`);
  const { error } = await supabase.from("deals").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Échec du seed :", error.message);
    process.exit(1);
  }
  console.log("OK — deals seedés dans Supabase.");
}

main();
