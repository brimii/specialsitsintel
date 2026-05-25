// Crée (idempotent) les 3 produits/prix Stripe et affiche les price IDs.
// Usage : mets STRIPE_SECRET_KEY dans .env.local, puis `npm run stripe:setup`.
import { config } from "dotenv";
config({ path: ".env.local" });

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Manque STRIPE_SECRET_KEY dans .env.local (clé test sk_test_…).");
  process.exitCode = 1;
}

const stripe = new Stripe(key ?? "");

const PLANS = [
  { tier: "analyst", name: "Analyst", amount: 15000, env: "STRIPE_PRICE_ANALYST" },
  { tier: "institutional", name: "Institutional", amount: 60000, env: "STRIPE_PRICE_INSTITUTIONAL" },
  { tier: "enterprise", name: "Enterprise", amount: 250000, env: "STRIPE_PRICE_ENTERPRISE" },
] as const;

async function main() {
  console.log("Création des produits/prix Stripe (mode test)…\n");
  const lines: string[] = [];

  for (const plan of PLANS) {
    // Réutilise le produit existant (par metadata.tier) sinon le crée.
    const existing = await stripe.products.search({ query: `metadata['tier']:'${plan.tier}'` });
    let product = existing.data[0];
    if (!product) {
      product = await stripe.products.create({
        name: `SpecialSitsIntel — ${plan.name}`,
        metadata: { tier: plan.tier },
      });
    }

    // Réutilise un prix mensuel EUR actif au bon montant, sinon le crée.
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
    let price = prices.data.find(
      (p) => p.unit_amount === plan.amount && p.currency === "eur" && p.recurring?.interval === "month",
    );
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.amount,
        currency: "eur",
        recurring: { interval: "month" },
        metadata: { tier: plan.tier },
      });
    }

    console.log(`  ${plan.name.padEnd(14)} ${(plan.amount / 100).toFixed(0)}€/mois  ->  ${price.id}`);
    lines.push(`${plan.env}=${price.id}`);
  }

  console.log("\n✅ Ajoute ces 3 lignes à ton .env.local :\n");
  console.log(lines.join("\n"));
  console.log("\nPuis relance `npm run dev`.");
}

if (key) main().catch((e) => {
  console.error("Échec :", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
