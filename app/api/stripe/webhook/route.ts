import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { getStripe, tierForPrice, mapStatus } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    // Vérification de la SIGNATURE
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    console.error("[webhook] signature invalide", e);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await getStripe().subscriptions.retrieve(session.subscription as string);
          await syncSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[webhook] traitement", e);
    return NextResponse.json({ error: "Erreur de traitement" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// Idempotent : recalcule l'état depuis l'objet Subscription courant.
async function syncSubscription(sub: Stripe.Subscription) {
  const admin = createAdminClient();
  const customerId = sub.customer as string;

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();
  if (!profile) {
    console.warn("[webhook] profil introuvable pour customer", customerId);
    return;
  }

  const priceId = sub.items.data[0]?.price.id;
  const tier = priceId ? tierForPrice(priceId) : null;
  const status = mapStatus(sub.status);

  const subAny = sub as unknown as {
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const periodEndUnix = subAny.current_period_end ?? subAny.items?.data?.[0]?.current_period_end;

  await admin.from("subscriptions").upsert(
    {
      user_id: profile.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      tier: tier ?? "free",
      status,
      current_period_end: periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null,
    },
    { onConflict: "stripe_subscription_id" },
  );

  // Le tier effectif n'est "payé" que si l'abonnement est actif.
  const effectiveTier = status === "active" && tier ? tier : "free";
  await admin.from("profiles").update({ tier: effectiveTier }).eq("id", profile.id);
}
