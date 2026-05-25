import "server-only";
import Stripe from "stripe";

// Client Stripe instancié paresseusement (évite tout crash sans clé, ex. build/CI).
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY manquant dans l'environnement.");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export type PaidTier = "analyst" | "institutional" | "enterprise";

// tier -> price id (depuis l'env, rempli après `npm run stripe:setup`)
export function priceForTier(tier: PaidTier): string | undefined {
  return {
    analyst: process.env.STRIPE_PRICE_ANALYST,
    institutional: process.env.STRIPE_PRICE_INSTITUTIONAL,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
  }[tier];
}

// price id -> tier (pour le webhook)
export function tierForPrice(priceId: string): PaidTier | null {
  if (priceId === process.env.STRIPE_PRICE_ANALYST) return "analyst";
  if (priceId === process.env.STRIPE_PRICE_INSTITUTIONAL) return "institutional";
  if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) return "enterprise";
  return null;
}

// Statut Stripe -> statut autorisé par la table subscriptions
export function mapStatus(s: Stripe.Subscription.Status): "active" | "past_due" | "canceled" {
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid") return "past_due";
  return "canceled";
}
