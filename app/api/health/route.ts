import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

// Pre-flight / deploy readiness check. Reports which env vars are
// present, which Stripe mode is active (test vs live), and whether
// cron auth is wired. Intended for use right after a deploy to confirm
// the env is complete before public traffic hits the site.
//
// Protection: requires a shared secret via ?key=<CRON_SECRET> OR
// Authorization: Bearer <CRON_SECRET>. Not world-readable because
// env-var presence is itself sensitive signal to an attacker.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const auth = request.headers.get("authorization");
  const keyParam = url.searchParams.get("key");
  const secret = process.env.CRON_SECRET;
  const authorised =
    !!secret && (auth === `Bearer ${secret}` || keyParam === secret);
  if (!authorised) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_ANALYST",
    "STRIPE_PRICE_INSTITUTIONAL",
    "STRIPE_PRICE_ENTERPRISE",
    "ANTHROPIC_API_KEY",
    "CRON_SECRET",
  ];
  const optional = [
    "FINNHUB_API_KEY",
    "TWELVEDATA_API_KEY",
    "ALPHAVANTAGE_API_KEY",
    "EDINET_API_KEY",
    "SEC_EDGAR_UA",
  ];

  const requiredStatus: Record<string, "ok" | "MISSING"> = {};
  const missingRequired: string[] = [];
  for (const k of required) {
    if (process.env[k] && process.env[k]!.length > 0) {
      requiredStatus[k] = "ok";
    } else {
      requiredStatus[k] = "MISSING";
      missingRequired.push(k);
    }
  }
  const optionalStatus: Record<string, "set" | "unset"> = {};
  for (const k of optional) {
    optionalStatus[k] = process.env[k] && process.env[k]!.length > 0 ? "set" : "unset";
  }

  // Stripe mode detection — sk_live vs sk_test prefix.
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
  const stripeMode = stripeKey.startsWith("sk_live_")
    ? "LIVE"
    : stripeKey.startsWith("sk_test_")
      ? "TEST"
      : "UNKNOWN";

  // Supabase project URL hint — strips key for display safety.
  const supabaseHost = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host;
    } catch {
      return null;
    }
  })();

  return NextResponse.json({
    ok: missingRequired.length === 0,
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    region: process.env.VERCEL_REGION ?? null,
    supabaseHost,
    stripeMode,
    required: requiredStatus,
    optional: optionalStatus,
    missingRequired,
    checkedAt: new Date().toISOString(),
  });
}
