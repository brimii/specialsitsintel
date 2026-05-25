import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();
    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "Aucun abonnement à gérer" }, { status: 400 });
    }

    const origin = request.headers.get("origin") ?? new URL(request.url).origin;
    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/home`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[portal]", e);
    return NextResponse.json({ error: "Erreur Stripe" }, { status: 500 });
  }
}
