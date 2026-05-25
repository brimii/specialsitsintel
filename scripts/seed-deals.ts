// Seed des 213 deals vers Supabase via la clé service_role.
// Usage : remplir .env.local puis `npm run seed`.
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { DEALS } from "../app/data/deals";

// Nettoyage défensif : trim + suppression d'un éventuel slash final.
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

if (!url || !key) {
  console.error("Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans .env.local");
  process.exitCode = 1;
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
  console.log("Cible :", url + "/rest/v1/deals");
  console.log(`Insertion / mise à jour de ${rows.length} deals, par lots de 50…`);

  const size = 50;
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    const { error } = await supabase.from("deals").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error(`Échec sur le lot ${i}-${i + chunk.length} :`);
      console.error(JSON.stringify(error, null, 2));
      process.exitCode = 1;
      return;
    }
    console.log(`  lot ${i}-${i + chunk.length} OK`);
  }
  console.log("OK — deals seedés dans Supabase.");
}

main();
