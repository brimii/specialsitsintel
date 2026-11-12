import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { Deal, DealCategory, RegulatoryPhase, TimelineEvent, CategoryData } from "@/app/data/schema";

// ────────────────────────────────────────────────────────────────────
// SpecialSitsIntel v2 data layer. Reads the NEW deals schema (migration
// 0005). Replaces the old lib/deals.ts once components are migrated.
//
// Server-only: imports the service-role Supabase client. The browser
// should never see any of the Tier 7 provenance fields.
// ────────────────────────────────────────────────────────────────────

export type Tier = "free" | "analyst" | "institutional" | "enterprise";
const RANK: Record<Tier, number> = { free: 0, analyst: 1, institutional: 2, enterprise: 3 };
export const tierRank = (t: string): number => (RANK as Record<string, number>)[t] ?? 0;

const FREE_PREVIEW_COUNT = 5;

// Any deal in one of these statuses is archived (no longer actionable).
const TERMINAL_STATUSES = new Set([
  "Closed", "Dead", "Liquidated", "Settled", "Terminated",
  "Withdrawn", "Won", "Closed Won", "Cancelled", "Canceled", "Failed",
]);

export function isActiveStatus(s: string | null | undefined): boolean {
  if (!s) return true;
  return !TERMINAL_STATUSES.has(s);
}

// A deal is "US" when its target company is domiciled in the United
// States OR trades primarily on NYSE / NASDAQ. The regulatory scope is
// locked US-only per CLAUDE.md phase 1 decision.
function isUsDeal(d: Deal): boolean {
  if (d.target_country === "US" || d.target_country === "USA") return true;
  const ex = d.target_exchange?.toUpperCase();
  return ex === "NYSE" || ex === "NASDAQ" || ex === "AMEX";
}

const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Row shape as stored. snake_case to match the SQL columns directly;
// we convert to the camelCase/public shape in `fromRow`.
interface DealRow {
  id: number;
  category: string;
  sub_type: string | null;
  target_name: string;
  target_ticker: string | null;
  target_exchange: string | null;
  target_country: string;
  target_sector: string | null;
  counterparty_name: string | null;
  counterparty_ticker: string | null;
  counterparty_country: string | null;
  undisturbed_price: number | null;
  undisturbed_date: string | null;
  current_price: number | null;
  current_price_at: string | null;
  offer_total_per_share: number | null;
  offer_cash_per_share: number | null;
  offer_stock_per_share: number | null;
  offer_exchange_ratio: number | null;
  offer_cvr_value: number | null;
  currency: string;
  transaction_value_usd: number | null;
  announce_date: string | null;
  hsr_filing_date: string | null;
  second_request_date: string | null;
  verdict_date: string | null;
  expected_close: string | null;
  hard_deadline: string | null;
  primary_regulators: string[] | null;
  regulatory_phase: string | null;
  key_risks: string[] | null;
  status: string;
  status_date: string | null;
  short_desc: string | null;
  ai_commentary: string | null;
  ai_commentary_at: string | null;
  ai_commentary_model: string | null;
  closing_probability: number | null;
  timeline: unknown;
  category_data: unknown;
  source_url: string | null;
  source_feed: string | null;
  source_accession: string | null;
  discovered_at: string;
  last_reviewed_at: string;
  reviewed_by: string | null;
  min_tier: string;
  created_at: string;
  updated_at: string;
}

function fromRow(r: DealRow): Deal {
  return {
    id: r.id,
    category: r.category as DealCategory,
    sub_type: (r.sub_type ?? undefined) as Deal["sub_type"],
    target_name: r.target_name,
    target_ticker: r.target_ticker ?? undefined,
    target_exchange: r.target_exchange ?? undefined,
    target_country: r.target_country,
    target_sector: r.target_sector ?? undefined,
    counterparty_name: r.counterparty_name ?? undefined,
    counterparty_ticker: r.counterparty_ticker ?? undefined,
    counterparty_country: r.counterparty_country ?? undefined,
    undisturbed_price: r.undisturbed_price ?? undefined,
    undisturbed_date: r.undisturbed_date ?? undefined,
    current_price: r.current_price ?? undefined,
    current_price_at: r.current_price_at ?? undefined,
    offer_total_per_share: r.offer_total_per_share ?? undefined,
    offer_cash_per_share: r.offer_cash_per_share ?? undefined,
    offer_stock_per_share: r.offer_stock_per_share ?? undefined,
    offer_exchange_ratio: r.offer_exchange_ratio ?? undefined,
    offer_cvr_value: r.offer_cvr_value ?? undefined,
    currency: r.currency,
    transaction_value_usd: r.transaction_value_usd ?? undefined,
    announce_date: r.announce_date ?? undefined,
    hsr_filing_date: r.hsr_filing_date ?? undefined,
    second_request_date: r.second_request_date ?? undefined,
    verdict_date: r.verdict_date ?? undefined,
    expected_close: r.expected_close ?? undefined,
    hard_deadline: r.hard_deadline ?? undefined,
    primary_regulators: r.primary_regulators ?? [],
    regulatory_phase: (r.regulatory_phase ?? undefined) as RegulatoryPhase | undefined,
    key_risks: r.key_risks ?? [],
    status: r.status,
    status_date: r.status_date ?? undefined,
    short_desc: r.short_desc ?? undefined,
    ai_commentary: r.ai_commentary ?? undefined,
    ai_commentary_at: r.ai_commentary_at ?? undefined,
    ai_commentary_model: r.ai_commentary_model ?? undefined,
    closing_probability: r.closing_probability ?? undefined,
    timeline: (Array.isArray(r.timeline) ? r.timeline : []) as TimelineEvent[],
    category_data: ((r.category_data ?? {}) as CategoryData),
    source_url: r.source_url ?? undefined,
    source_feed: r.source_feed ?? undefined,
    source_accession: r.source_accession ?? undefined,
    discovered_at: r.discovered_at,
    last_reviewed_at: r.last_reviewed_at,
    reviewed_by: r.reviewed_by ?? undefined,
    min_tier: r.min_tier as Deal["min_tier"],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/**
 * Strip Tier 7 provenance fields before serialising a deal to the
 * browser. The React components never see source_url / source_feed /
 * source_accession / reviewed_by — ONLY admin pages (which call this
 * module with full rows via a separate server route).
 */
export function sanitiseForClient(d: Deal): Deal {
  const clone: Deal = { ...d };
  clone.source_url = undefined;
  clone.source_feed = undefined;
  clone.source_accession = undefined;
  clone.reviewed_by = undefined;
  return clone;
}

/**
 * Read every deal. Admin paths should call `getAllDealsRaw()` to keep
 * provenance fields; everything client-facing goes through this one.
 */
export async function getAllDeals(): Promise<Deal[]> {
  if (!hasSupabase) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[deals-v2] getAllDeals error:", error.message);
    return [];
  }
  return (data as DealRow[]).map(fromRow).filter(isUsDeal).map(sanitiseForClient);
}

/**
 * Raw read for admin: no US filter, no sanitisation, carries every
 * provenance field. NEVER expose this result to the browser.
 */
export async function getAllDealsRaw(): Promise<Deal[]> {
  if (!hasSupabase) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[deals-v2] getAllDealsRaw error:", error.message);
    return [];
  }
  return (data as DealRow[]).map(fromRow);
}

/**
 * Tier-filtered read for public pages. Free users see a preview of 5
 * deals with no AI commentary, no narrative, no timeline detail.
 */
export async function getDealsForTier(tier: Tier): Promise<Deal[]> {
  const all = await getAllDeals();
  const active = all.filter((d) => isActiveStatus(d.status));
  const rank = tierRank(tier);

  if (rank === 0) {
    // Free: 5 deals max, strip AI + narrative + timeline so the preview
    // delivers the surface only.
    return active.slice(0, FREE_PREVIEW_COUNT).map((d) => ({
      ...d,
      ai_commentary: undefined,
      ai_commentary_at: undefined,
      ai_commentary_model: undefined,
      short_desc: undefined,
      timeline: [],
      category_data: {},
    }));
  }

  return active.filter((d) => tierRank(d.min_tier) <= rank);
}

/**
 * Lookup single deal by id — tier-gated. Null if not found or not
 * accessible at the caller's tier.
 */
export async function getDealById(id: number, tier: Tier): Promise<Deal | null> {
  if (!hasSupabase) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const deal = sanitiseForClient(fromRow(data as DealRow));
  if (tierRank(deal.min_tier) > tierRank(tier)) return null;
  return deal;
}

/**
 * Admin-only lookup carrying every provenance field. Use on the edit
 * form render path so the admin sees source URL, accession, etc.
 */
export async function getDealByIdRaw(id: number): Promise<Deal | null> {
  if (!hasSupabase) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return fromRow(data as DealRow);
}
