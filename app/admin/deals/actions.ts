"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { generateDealCommentary } from "@/lib/anthropic";

// Parse "a, b, c" → ["a","b","c"] with trimming + empty-filter.
function parseList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

function parseNum(s: string): number | null {
  if (!s || s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

interface FormInput {
  category: string;
  sub_type: string;
  target_name: string;
  target_ticker: string;
  target_exchange: string;
  target_country: string;
  target_sector: string;
  counterparty_name: string;
  counterparty_ticker: string;
  counterparty_country: string;
  undisturbed_price: string;
  undisturbed_date: string;
  current_price: string;
  offer_total_per_share: string;
  offer_cash_per_share: string;
  offer_stock_per_share: string;
  offer_exchange_ratio: string;
  offer_cvr_value: string;
  currency: string;
  transaction_value_usd: string;
  announce_date: string;
  hsr_filing_date: string;
  second_request_date: string;
  verdict_date: string;
  expected_close: string;
  hard_deadline: string;
  primary_regulators: string;
  regulatory_phase: string;
  key_risks: string;
  status: string;
  status_date: string;
  short_desc: string;
  ai_commentary: string;
  closing_probability: string;
  timeline: Array<{ date: string; event_type: string; summary: string }>;
  source_url: string;
  source_feed: string;
  source_accession: string;
  min_tier: string;
}

// Translate the form into the DB row shape. Strings → null when empty,
// numbers parsed. Timeline + bags stored as JSONB. ai_commentary_at
// bumps whenever commentary text changes so the audit trail knows
// when the human-of-record approved it.
function toDbRow(input: FormInput, previousCommentary: string | null = null) {
  const now = new Date().toISOString();
  const commentaryChanged = input.ai_commentary !== (previousCommentary ?? "");
  return {
    category: input.category,
    sub_type: input.sub_type || null,
    target_name: input.target_name,
    target_ticker: input.target_ticker || null,
    target_exchange: input.target_exchange || null,
    target_country: input.target_country || "US",
    target_sector: input.target_sector || null,
    counterparty_name: input.counterparty_name || null,
    counterparty_ticker: input.counterparty_ticker || null,
    counterparty_country: input.counterparty_country || null,
    undisturbed_price: parseNum(input.undisturbed_price),
    undisturbed_date: input.undisturbed_date || null,
    current_price: parseNum(input.current_price),
    current_price_at: parseNum(input.current_price) != null ? now : null,
    offer_total_per_share: parseNum(input.offer_total_per_share),
    offer_cash_per_share: parseNum(input.offer_cash_per_share),
    offer_stock_per_share: parseNum(input.offer_stock_per_share),
    offer_exchange_ratio: parseNum(input.offer_exchange_ratio),
    offer_cvr_value: parseNum(input.offer_cvr_value),
    currency: input.currency || "USD",
    transaction_value_usd: parseNum(input.transaction_value_usd),
    announce_date: input.announce_date || null,
    hsr_filing_date: input.hsr_filing_date || null,
    second_request_date: input.second_request_date || null,
    verdict_date: input.verdict_date || null,
    expected_close: input.expected_close || null,
    hard_deadline: input.hard_deadline || null,
    primary_regulators: parseList(input.primary_regulators),
    regulatory_phase: input.regulatory_phase || null,
    key_risks: parseList(input.key_risks),
    status: input.status,
    status_date: input.status_date || null,
    short_desc: input.short_desc || null,
    ai_commentary: input.ai_commentary || null,
    ai_commentary_at: commentaryChanged && input.ai_commentary ? now : undefined,
    ai_commentary_model: commentaryChanged && input.ai_commentary ? "claude-sonnet-4-6" : undefined,
    closing_probability: parseNum(input.closing_probability),
    timeline: input.timeline.filter((t) => t.date && t.summary) as unknown as object,
    category_data: {},
    source_url: input.source_url || null,
    source_feed: input.source_feed || null,
    source_accession: input.source_accession || null,
    last_reviewed_at: now,
    min_tier: input.min_tier,
  };
}

export async function createDeal(input: FormInput): Promise<number> {
  await requireAdmin();
  const admin = createAdminClient();
  const row = toDbRow(input);
  const { data, error } = await admin.from("deals").insert(row).select("id").single();
  if (error) throw new Error(`Insert failed: ${error.message}`);
  revalidatePath("/admin/deals");
  revalidatePath("/");
  return (data as { id: number }).id;
}

export async function updateDeal(id: number, input: FormInput): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("deals")
    .select("ai_commentary")
    .eq("id", id)
    .maybeSingle();
  const row = toDbRow(input, (existing as { ai_commentary: string | null } | null)?.ai_commentary ?? null);
  const { error } = await admin.from("deals").update(row).eq("id", id);
  if (error) throw new Error(`Update failed: ${error.message}`);
  revalidatePath("/admin/deals");
  revalidatePath(`/admin/deals/${id}`);
  revalidatePath("/");
}

export async function deleteDeal(id: number): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("deals").delete().eq("id", id);
  if (error) throw new Error(`Delete failed: ${error.message}`);
  revalidatePath("/admin/deals");
  revalidatePath("/");
}

// Explicit button in the admin form. Reads whatever's in the form right
// now (even unsaved), sends it to Claude, returns the text for human
// review. The admin accepts/edits/discards before hitting Save.
export async function generateCommentary(input: {
  category: string;
  sub_type?: string;
  target_name: string;
  target_ticker?: string;
  counterparty_name?: string;
  undisturbed_price?: number;
  current_price?: number;
  offer_total_per_share?: number;
  currency?: string;
  announce_date?: string;
  expected_close?: string;
  status: string;
  regulatory_phase?: string;
  primary_regulators?: string;
  short_desc?: string;
}): Promise<string> {
  await requireAdmin();
  return generateDealCommentary(input);
}
