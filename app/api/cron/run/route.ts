import { NextResponse, type NextRequest } from "next/server";
import { runPipeline } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min (limite Vercel pro)

// Endpoint Cron Vercel. Sécurisé par un Bearer token (CRON_SECRET) que Vercel
// injecte automatiquement quand il appelle l'URL planifiée (cf. vercel.json).
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const result = await runPipeline();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron]", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// POST autorisé aussi (utile pour déclencher manuellement depuis /admin).
export async function POST(request: NextRequest) {
  return GET(request);
}
