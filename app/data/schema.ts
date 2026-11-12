// SpecialSitsIntel v2 — canonical Deal type matching Supabase migration
// 0005 (seven-tier schema). Everything the terminal reads goes through
// here: components, API routes, admin form, Claude commentary call.
//
// Design notes:
//   • Explicit field names everywhere. The old nm/acq/v/s/p/… short
//     codes are gone.
//   • Spread, days-to-close and implied probability are DERIVED at
//     render time (see helpers below), not stored. Keeps them honest
//     when current_price refreshes.
//   • Tier 7 (provenance) fields are typed but marked ADMIN-ONLY in
//     the comment — never serialise them into a client payload.
//   • JSONB bags (timeline, categoryData) use typed sub-interfaces so
//     the admin form and the chart stay in agreement.

/** Deal category (primary strategy classifier). */
export type DealCategory =
  | "MERGER"
  | "ACTIVISM"
  | "DISTRESSED"
  | "SPINOFF"
  | "REORG"
  | "TENDER";

/** Finer-grained sub-structure under each category. */
export type DealSubType =
  // Merger
  | "cash" | "stock" | "mixed" | "cvr" | "collar"
  // Tender
  | "tender"
  // Activism
  | "13D" | "proxy" | "settlement"
  // Distressed
  | "ch7" | "ch11" | "ch15" | "ooc" | "a&e"
  // Spinoff
  | "spin" | "split-off" | "carve-out";

export type RegulatoryPhase =
  | "HSR"
  | "2ndRequest"
  | "Consent"
  | "Cleared"
  | "Litigation"
  | "Blocked";

/**
 * Single row in a deal's timeline. Dates ISO (YYYY-MM-DD). `event_type`
 * is a typed tag so we can colour / filter / derive upcoming catalysts.
 */
export interface TimelineEvent {
  date: string;
  event_type:
    | "ANNOUNCE"
    | "HSR_FILED"
    | "SECOND_REQUEST"
    | "CONSENT"
    | "CLEARED"
    | "LITIGATION_FILED"
    | "VERDICT"
    | "CLOSING"
    | "CLOSED"
    | "BLOCKED"
    | "WITHDRAWN"
    | "OTHER";
  summary: string;
}

/** Category-specific JSONB bag — shape depends on `category`. */
export interface MergerCategoryData {
  break_fee_usd?: number;
  reverse_termination_fee_usd?: number;
  consent_cap_usd?: number;
}
export interface SpinoffCategoryData {
  parent_ticker?: string;
  spin_ticker?: string;
  distribution_ratio?: string; // e.g. "1-for-10"
  record_date?: string;
}
export interface DistressedCategoryData {
  chapter_type?: "7" | "11" | "15";
  filing_date?: string;
  fulcrum_estimate?: string; // "senior secured", "2L", etc.
  cusips?: string[];
}
export interface ActivismCategoryData {
  filer?: string;
  stake_pct?: number;
  stake_value_usd?: number;
  demands?: string[];
}
export type CategoryData =
  | MergerCategoryData
  | SpinoffCategoryData
  | DistressedCategoryData
  | ActivismCategoryData
  | Record<string, never>;

/**
 * Deal — canonical type matching columns in the deals table.
 * Field order mirrors the SQL for easy cross-reference.
 */
export interface Deal {
  id: number;

  // Tier 1: Identity
  category: DealCategory;
  sub_type?: DealSubType;

  target_name: string;
  target_ticker?: string;
  target_exchange?: string;
  target_country: string; // ISO-2 preferred, falls back to free text
  target_sector?: string;

  counterparty_name?: string;
  counterparty_ticker?: string;
  counterparty_country?: string;

  // Tier 2: Pricing
  undisturbed_price?: number;
  undisturbed_date?: string;

  current_price?: number;
  current_price_at?: string;

  offer_total_per_share?: number;
  offer_cash_per_share?: number;
  offer_stock_per_share?: number;
  offer_exchange_ratio?: number;
  offer_cvr_value?: number;

  currency: string; // 'USD','EUR',…
  transaction_value_usd?: number;

  // Tier 3: Dates
  announce_date?: string;
  hsr_filing_date?: string;
  second_request_date?: string;
  verdict_date?: string;
  expected_close?: string;
  hard_deadline?: string;

  // Tier 4: Regulatory
  primary_regulators: string[];
  regulatory_phase?: RegulatoryPhase;
  key_risks: string[];

  // Tier 5: Narrative
  status: string;
  status_date?: string;
  short_desc?: string;

  ai_commentary?: string;
  ai_commentary_at?: string;
  ai_commentary_model?: string;

  closing_probability?: number; // 0-100

  // Tier 6: Flexible bags
  timeline: TimelineEvent[];
  category_data: CategoryData;

  // Tier 7: Provenance — ADMIN ONLY, never in client payloads
  source_url?: string;
  source_feed?: string;
  source_accession?: string;
  discovered_at: string;
  last_reviewed_at: string;
  reviewed_by?: string;

  // Access
  min_tier: "free" | "analyst" | "institutional" | "enterprise";

  // Audit
  created_at: string;
  updated_at: string;
}

// ────────────────────────────────────────────────────────────────────
// Derived values — never stored in Supabase. Call these at render time
// so spread / implied-prob / days-to-close track current_price moves.
// ────────────────────────────────────────────────────────────────────

/** Raw gross spread in deal currency: offer - current. Null if either missing. */
export function grossSpread(d: Pick<Deal, "current_price" | "offer_total_per_share">): number | null {
  if (!d.current_price || !d.offer_total_per_share) return null;
  return d.offer_total_per_share - d.current_price;
}

/** Days from now to expected_close (positive if in future). Null if no date. */
export function daysToClose(d: Pick<Deal, "expected_close">): number | null {
  if (!d.expected_close) return null;
  const ms = new Date(d.expected_close).getTime() - Date.now();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * Annualised gross spread (%). Returns null if any input missing or if
 * the deal is already closed (days-to-close ≤ 0 → return null rather
 * than an exploding number).
 */
export function annualisedSpread(
  d: Pick<Deal, "current_price" | "offer_total_per_share" | "expected_close">,
): number | null {
  const gs = grossSpread(d);
  const dtc = daysToClose(d);
  if (gs == null || dtc == null || dtc <= 0 || !d.current_price) return null;
  return ((gs / d.current_price) * (365 / dtc)) * 100;
}

/**
 * Market-implied closing probability from current_price vs undisturbed
 * and offer: (c - u) / (o - u). Clamped to [0, 1]. Null if we lack u/o/c.
 */
export function impliedProbability(
  d: Pick<Deal, "undisturbed_price" | "current_price" | "offer_total_per_share">,
): number | null {
  if (!d.undisturbed_price || !d.current_price || !d.offer_total_per_share) return null;
  const denom = d.offer_total_per_share - d.undisturbed_price;
  if (Math.abs(denom) < 1e-6) return null;
  const p = (d.current_price - d.undisturbed_price) / denom;
  return Math.max(0, Math.min(1, p));
}

/** Future-dated timeline events sorted ascending — the catalyst list. */
export function upcomingCatalysts(d: Pick<Deal, "timeline">, now: Date = new Date()): TimelineEvent[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return [...d.timeline]
    .filter((e) => new Date(e.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Score grade (G/A/R) derived from closing_probability. */
export function scoreGrade(d: Pick<Deal, "closing_probability">): "G" | "A" | "R" {
  const p = d.closing_probability ?? 0;
  if (p >= 80) return "G";
  if (p >= 60) return "A";
  return "R";
}
