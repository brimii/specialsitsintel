// Thin re-export wrapper around the canonical schema + shared UI
// helpers that every component references. Replaces the former 178-row
// static fallback array (Step 3 of the v2 rebuild).
//
// The live app now reads deals from Supabase (migration 0005). When
// Supabase is unreachable, DEALS falls back to an empty array rather
// than seed data — we started from zero deliberately.

export * from "./schema";
import type { Deal, DealCategory } from "./schema";

/** Empty fallback — honest default when Supabase isn't configured. */
export const DEALS: Deal[] = [];

// ────────────────────────────────────────────────────────────────────
// Category labels + palette (for badges, pills, pickers)
// ────────────────────────────────────────────────────────────────────

/** CSS-class suffix for a category badge. */
export const BADGE_CL: Record<DealCategory, string> = {
  MERGER: "badge-cobalt",
  ACTIVISM: "badge-violet",
  DISTRESSED: "badge-crimson",
  SPINOFF: "badge-navy",
  REORG: "badge-amber",
  TENDER: "badge-navy",
};

/** Compact label shown inside a category badge. */
export const CLS: Record<DealCategory, string> = {
  MERGER: "M/A",
  ACTIVISM: "ACT",
  DISTRESSED: "DIST",
  SPINOFF: "SPIN",
  REORG: "REORG",
  TENDER: "TENDER",
};

// ────────────────────────────────────────────────────────────────────
// Party labels — "target → acquirer" / "SpinCo → parent" / etc.
// Centralised so DealTable, DealDetail and PriceChart stay in lockstep.
// ────────────────────────────────────────────────────────────────────

export interface PartyLabels {
  target: string;
  counter: string;
  counterGlyph: string;
}

export function partyLabels(category: DealCategory | string): PartyLabels {
  switch (category) {
    case "ACTIVISM":
      return { target: "Target", counter: "Activist", counterGlyph: "✦" };
    case "SPINOFF":
      return { target: "SpinCo", counter: "Parent", counterGlyph: "⊕" };
    case "DISTRESSED":
      return { target: "Issuer", counter: "Counterparty", counterGlyph: "⊟" };
    case "REORG":
      return { target: "Issuer", counter: "Plan sponsor", counterGlyph: "⊜" };
    case "TENDER":
      return { target: "Target", counter: "Tenderer", counterGlyph: "→" };
    case "MERGER":
    default:
      return { target: "Target", counter: "Acquirer", counterGlyph: "→" };
  }
}

// ────────────────────────────────────────────────────────────────────
// Colour helpers for the probability + EV cells / chart line.
// ────────────────────────────────────────────────────────────────────

/** Probability colour band (navy ≥80 / amber ≥60 / crimson <60). */
export function pcol(d: { closing_probability?: number }): string {
  const p = d.closing_probability ?? 0;
  if (p >= 80) return "var(--navy)";
  if (p >= 60) return "var(--amber)";
  return "var(--crimson)";
}

// ────────────────────────────────────────────────────────────────────
// Transaction value formatter — takes the stored USD number and turns
// it into a compact "$53B" / "$340M" / "$1.2T" display string. Used by
// DealTable size column + hero stats.
// ────────────────────────────────────────────────────────────────────
export function fmtCap(usd: number | null | undefined): string {
  if (!usd || usd <= 0) return "—";
  if (usd >= 1_000_000_000_000) return `$${(usd / 1_000_000_000_000).toFixed(1)}T`;
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(0)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}k`;
  return `$${usd.toFixed(0)}`;
}

/** Flag emoji for a country ISO-2 code. Only US-scoped by default. */
export function countryFlag(country: string | undefined): string {
  if (!country) return "🏳";
  const map: Record<string, string> = {
    US: "🇺🇸", USA: "🇺🇸",
    CA: "🇨🇦", CAN: "🇨🇦",
    GB: "🇬🇧", UK: "🇬🇧",
    JP: "🇯🇵", JPN: "🇯🇵",
    DE: "🇩🇪", DEU: "🇩🇪",
    FR: "🇫🇷", FRA: "🇫🇷",
    AU: "🇦🇺", AUS: "🇦🇺",
    HK: "🇭🇰",
    CN: "🇨🇳", CHN: "🇨🇳",
  };
  return map[country.toUpperCase()] ?? "🏳";
}
