import { NextResponse, type NextRequest } from "next/server";
import { runMarketPriceRefresh } from "@/lib/sources/market-data";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min Vercel Pro cap

// Vercel cron endpoint — refreshes market prices for T1 (hot) + T2 (active)
// deals via the Yahoo → Finnhub → Twelve Data → Alpha Vantage waterfall.
// Auth: CRON_SECRET (same as the discovery cron). Vercel injects the
// header automatically when calling the scheduled URL.
//
// Scheduling (vercel.json): daily on Hobby (only free-tier interval),
// hourly on Pro. The refresh function itself has a 15-min cache so calling
// it more often than that is a no-op for unchanged rows.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runMarketPriceRefresh();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron/refresh-prices]", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
