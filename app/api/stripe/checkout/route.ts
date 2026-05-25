import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getStripe, priceForTier, type PaidTier } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Identité vérifiée CÔTÉ SERVEUR
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { tier } = (await request.json()) as { tier?: PaidTier };
    if (!tier) return NextResponse.json({ error: "Palier manquant" }, { status: 400 });
    const priceId = priceForTier(tier);
    if (!priceId) {
      return NextResponse.json({ error: "Palier invalide ou prix non configuré" }, { status: 400 });
    }

    const stripe = getStripe();
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? profile?.email ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const origin = request.headers.get("origin") ?? new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/home?checkout=cancel`,
      subscription_data: { metadata: { user_id: user.id, tier } },
      metadata: { user_id: user.id, tier },
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[checkout]", e);
    return NextResponse.json({ error: "Erreur Stripe" }, { status: 500 });
  }
}
