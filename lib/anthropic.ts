import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Lazy-instantiated client — no crash without a key (build / container).
let _client: Anthropic | null = null;
export function getAnthropic(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is missing from the environment.");
    _client = new Anthropic({ apiKey: key });
  }
  return _client;
}

// Default Sonnet — balanced quality/cost.
export const COMMENTARY_MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You write terse, institutional-grade commentary on special-situations deals for event-driven PMs. Tone: Reorg-style — plain prose, no bullets, no marketing words. 3-5 sentences, maximum ~120 words.

Cover (when the data allows):
- The situation framing in one line (what's happening, what the setup is).
- Current pricing dynamics — spread, gap vs offer, what the market's implying.
- The next real catalyst (regulatory milestone, verdict, closing event).
- The main risk factor the PM should watch.

Rules:
- No hallucinations. If a field is empty, don't mention it.
- No "we believe" / "in our view" / "it is important to note" — write statements.
- No emojis, no headers, no bullet lists. Pure prose.
- Never recommend "buy / sell / long / short". Describe the setup, let the PM decide.
- Never reference competitors (Bloomberg, Reorg, Reuters).`;

interface CommentaryInput {
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
}

function fmtPrice(n: number | undefined, cur = "USD"): string {
  if (n == null) return "";
  const sym = cur === "USD" ? "$" : cur === "EUR" ? "€" : cur === "GBP" ? "£" : cur === "JPY" ? "¥" : cur + " ";
  return `${sym}${n.toFixed(2)}`;
}

/**
 * One-shot commentary generation for the admin form. Called when the
 * admin clicks "Generate with Claude"; result is returned for human
 * review, not auto-saved. Cost per call ≈ $0.002 on Sonnet.
 */
export async function generateDealCommentary(d: CommentaryInput): Promise<string> {
  const client = getAnthropic();
  const cur = d.currency ?? "USD";
  const spread =
    d.offer_total_per_share && d.current_price
      ? `${(((d.offer_total_per_share - d.current_price) / d.current_price) * 100).toFixed(1)}% to offer`
      : "";
  const lines: string[] = [];
  lines.push(`Target: ${d.target_name}${d.target_ticker ? ` (${d.target_ticker})` : ""}`);
  if (d.counterparty_name) lines.push(`Counterparty: ${d.counterparty_name}`);
  lines.push(`Category: ${d.category}${d.sub_type ? ` · ${d.sub_type}` : ""}`);
  lines.push(`Status: ${d.status}${d.regulatory_phase ? ` · ${d.regulatory_phase}` : ""}`);
  if (d.primary_regulators) lines.push(`Regulators: ${d.primary_regulators}`);
  if (d.undisturbed_price != null) lines.push(`Undisturbed: ${fmtPrice(d.undisturbed_price, cur)}`);
  if (d.current_price != null) lines.push(`Current: ${fmtPrice(d.current_price, cur)}`);
  if (d.offer_total_per_share != null) lines.push(`Offer: ${fmtPrice(d.offer_total_per_share, cur)}`);
  if (spread) lines.push(`Spread: ${spread}`);
  if (d.announce_date) lines.push(`Announced: ${d.announce_date}`);
  if (d.expected_close) lines.push(`Expected close: ${d.expected_close}`);
  if (d.short_desc) lines.push(`\nNote from admin: ${d.short_desc}`);

  const userMessage = `Write the commentary for this deal:\n\n${lines.join("\n")}`;

  const resp = await client.messages.create({
    model: COMMENTARY_MODEL,
    max_tokens: 400,
    temperature: 0.4,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const block = resp.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Claude returned no text content");
  }
  return block.text.trim();
}
