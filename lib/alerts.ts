import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { Alert } from "@/app/data/content";

// ════════════════════════════════════════════════════════════════════
// Live alerts feed for the /-page LIVE INTEL banner.
//
// Two event sources power it:
// - `_auto_publish` rows → Phase 4 auto-publications of MINEUR updates
//   at ≥90 confidence + ≥2 sources. Format: "<field>=<value>".
// - `_creation` rows      → discovery-inserted new deals (approved via
//   the queue or auto-published for backfill).
//
// Falls back to static ALERTS from content.ts when nothing recent is
// available (fresh install, quiet week), so the banner never sits
// empty on the homepage.
// ════════════════════════════════════════════════════════════════════

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Map an auto-published field to the banner tag ("SPREAD ALERT",
// "CLOSING", "TIMELINE", etc.) and colour (G/A/R/P/B).
function labelForAutoPub(field: string, value: string): { t: string; c: string } {
  const lc = value.toLowerCase();
  if (field === "statut") {
    if (/closing|closed/.test(lc)) return { t: "CLOSING — AUTO", c: "G" };
    if (/blocked|dead|terminated|withdrawn/.test(lc)) return { t: "BLOCKED — AUTO", c: "R" };
    if (/litigation|trial/.test(lc)) return { t: "LITIGATION — AUTO", c: "R" };
    return { t: "STATUS UPDATE — AUTO", c: "A" };
  }
  if (field === "spread") return { t: "SPREAD UPDATE — AUTO", c: "A" };
  if (field === "proba_close") return { t: "PROBABILITY — AUTO", c: "B" };
  if (field === "regulateur") return { t: "REG PATH — AUTO", c: "A" };
  if (field === "close_estimate") return { t: "TIMELINE — AUTO", c: "B" };
  if (field === "description") return { t: "COMMENTARY — AUTO", c: "B" };
  return { t: `${field.toUpperCase()} — AUTO`, c: "B" };
}

export type LiveAlertsResult = { live: Alert[]; fetchedAt: string };

export async function getLiveAlerts(limit = 12): Promise<LiveAlertsResult> {
  const admin = createAdminClient();
  // 30-day window (was 7d) so the banner has enough live events to
  // scroll on quieter weeks — discoveries + Phase 4 auto-pubs still
  // trickle in over the month.
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [autoRes, creationRes] = await Promise.all([
    admin
      .from("deal_updates")
      .select("deal_id, nouvelle_valeur, created_at")
      .eq("champ_modifie", "_auto_publish")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(limit),
    admin
      .from("deal_updates")
      .select("deal_id, created_at")
      .eq("champ_modifie", "_creation")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  type AutoRow = { deal_id: number; nouvelle_valeur: string | null; created_at: string };
  type CreationRow = { deal_id: number; created_at: string };
  const autos = (autoRes.data ?? []) as AutoRow[];
  const creations = (creationRes.data ?? []) as CreationRow[];

  if (autos.length === 0 && creations.length === 0) {
    return { live: [], fetchedAt: new Date().toISOString() };
  }

  // Bulk-fetch deal names for every event's deal_id in one round-trip
  // instead of N queries. Missing deals (soft-deleted) drop silently.
  const dealIds = Array.from(
    new Set<number>([...autos.map((a) => a.deal_id), ...creations.map((c) => c.deal_id)]),
  );
  const { data: dealsData } = await admin
    .from("deals")
    .select("id, nom, acquereur")
    .in("id", dealIds);
  type DealRow = { id: number; nom: string; acquereur: string | null };
  const dealMap = new Map<number, DealRow>((dealsData ?? []).map((d) => [(d as DealRow).id, d as DealRow]));

  // Carry the source timestamp on each built alert so the merged
  // auto/creation list can be sorted newest-first regardless of type.
  const pairs: Array<{ ts: string; alert: Alert }> = [];

  for (const a of autos) {
    const deal = dealMap.get(a.deal_id);
    if (!deal) continue;
    const eqIdx = (a.nouvelle_valeur ?? "").indexOf("=");
    if (eqIdx < 0) continue;
    const field = a.nouvelle_valeur!.slice(0, eqIdx);
    const value = a.nouvelle_valeur!.slice(eqIdx + 1);
    const { t, c } = labelForAutoPub(field, value);
    const acq = deal.acquereur ? ` (${deal.acquereur})` : "";
    pairs.push({
      ts: a.created_at,
      alert: {
        t,
        x: `${deal.nom}${acq}: ${field} → ${value}. Auto-published (MINEUR + conf≥90 + ≥2 sources).`,
        d: fmtRelative(a.created_at),
        c,
      },
    });
  }

  for (const cr of creations) {
    const deal = dealMap.get(cr.deal_id);
    if (!deal) continue;
    const acq = deal.acquereur ? ` acquires ${deal.acquereur}` : "";
    pairs.push({
      ts: cr.created_at,
      alert: {
        t: "NEW DEAL — DISCOVERED",
        x: `${deal.nom}${acq}. Ingested by pipeline discovery.`,
        d: fmtRelative(cr.created_at),
        c: "B",
      },
    });
  }

  pairs.sort((a, b) => (a.ts > b.ts ? -1 : 1));
  return {
    live: pairs.slice(0, limit).map((p) => p.alert),
    fetchedAt: new Date().toISOString(),
  };
}
