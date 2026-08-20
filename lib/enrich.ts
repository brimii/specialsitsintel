import "server-only";
import { getAnthropic, EXTRACTION_MODEL, parseClaudeJson } from "@/lib/anthropic";
import { findPressRelease, type PressRelease } from "@/lib/sources/press-release";

// ════════════════════════════════════════════════════════════════════
// 2nd-pass enrichment — focused price/value extraction.
//
// The 1st-pass discovery prompts classify a headline as a deal and
// extract structure. They run on either a SEC filing's full text (good
// price coverage) or just a title (TDnet, HKEX — no price visible).
//
// This 2nd pass is called only on candidates that survived the 1st
// pass, with the actual disclosure PDF / decision document text. The
// prompt is tight: fill in v / pr.o / pr.sym / pr.cur / cl / desc when
// the document says them; otherwise keep the input values unchanged.
// ════════════════════════════════════════════════════════════════════

const ENRICH_SYSTEM_PROMPT = `You receive a previously-extracted event-driven deal record plus the full text of the underlying disclosure document (SEC filing, regulator decision, takeover offer, Tokyo TDnet PDF, Hong Kong HKEX announcement, etc.). Your job is to FILL IN or CORRECT the pricing, timing, AND party-name fields when the document gives you the answer — and to leave fields the input already has correct alone.

# Output

Return JSON with ONLY these fields (no others):

\`\`\`json
{
  "nm": "<target company name in English>",
  "acq": "<acquirer / offeror name in English>",
  "v": "$X.XB" | "€X.XM" | "¥XB" | "TBD",
  "pr": {
    "o": <per-share offer price as a plain number, e.g. 25.50>,
    "sym": "<ticker if disclosed>",
    "cur": "$" | "€" | "£" | "¥" | "HK$" | "A$" | "S$" | "CHF",
    "ad": "MMM YYYY"
  },
  "cl": "Q3 2026" | "H2 2026" | "Mar 2027" | "TBD",
  "desc": "<1-2 factual ENGLISH sentences describing the transaction>"
}
\`\`\`

# Rules

- **nm** (target / offeree): the company being acquired, taken private, merged into, or whose shares the offer is for. Common signals: Japanese "対象者" / "対象会社" / "被買収会社" / "対象株式" / "完全子会社化される" — in "AによるBの株式取得" / "AによるBの完全子会社化" / "Aの公開買付け対象", **B is the target**. English: "Target Company", "the Offeree", "in respect of the shares of X".
- **acq** (acquirer / offeror): the company doing the acquiring. Common signals: Japanese "公開買付者" / "買付者" / "買収会社" / "取得会社" — in "AによるBの株式取得", **A is the acquirer**. For MBOs / management-led buyouts, the acquirer is the SPV name (often something like "BCJ-XX 株式会社" or "[Founder]'s Holdings KK"). English: "Bidder", "Offeror", "X plc as Acquirer".
- **v** (total deal value): look for "aggregate consideration", "transaction value", "equity value", "implied enterprise value", "X per share x N shares", "total consideration of approximately", "valued at". Output in English scale letters (B/M/T) with the deal currency. Examples: "$5.2B", "€840M", "¥320B", "£1.4B", "HK$8.5B".
- **pr.o** (per-share offer price): plain number, no currency symbol, no commas (e.g. \`25.50\`, \`3500\`, \`4.85\`). For all-stock deals, extract the implied per-share value at signing if explicitly stated ("implied value of $X per share based on the fixed exchange ratio"). Leave at 0 ONLY if the document genuinely doesn't disclose any per-share price.
- **pr.sym**: stock ticker if the document mentions it (e.g. "TGT", "00700", "AAL", "7203").
- **pr.cur**: currency symbol matching pr.o.
- **pr.ad**: month + year of announcement / first disclosure ("Apr 2026").
- **cl**: expected close timing if mentioned ("Q3 2026", "H2 2026", "Mar 2027"), otherwise "TBD".
- **desc**: 1-2 factual sentences in English. Translate any Japanese/Chinese/French text to English. Don't editorialize.

# Language

ALL output text fields MUST be in English. Translate company names where they appear:
- Japanese: トヨタ自動車 → "Toyota Motor", カカクコム → "Kakaku.com", ニチリョク → "Nichiryoku", 神戸物産 → "Kobe Bussan", オリンパス → "Olympus".
- Chinese: 腾讯 → "Tencent", 阿里巴巴 → "Alibaba".
Strip Japanese corporate suffixes: 株式会社 / ㈱ / (株) → drop entirely. HD / ホールディングス → "Holdings". Ｇ－ (full-width "G-") prefix → drop.

Japanese number units: 億 = 100M, 兆 = 1T. Output "¥45B" not "450億円".

# Critical: don't degrade

- If the document doesn't help (e.g. it's a procedural notice without numbers), return the INPUT values unchanged for every field.
- NEVER replace a known per-share price with 0.
- NEVER replace a known "$X.XB" value with "TBD".
- NEVER replace a known company name with "TBD" or "Unknown".
- NEVER invent numbers.
- For \`nm\` and \`acq\`: only fill in / fix when the input value is in {"TBD", "", "Unknown", "Unknown target"}. If the input nm/acq is a real company name, return it unchanged even if the document gives you a different reading — the 1st pass had context you don't.
- When you don't know a value, the placeholder is **always "TBD"** — never write "N/A", "N\\A", "Not Available", "Not Disclosed", "None", "Null", "Undisclosed", or any other variation. Stick to "TBD" for text fields and 0 for numeric.
- If \`nm\` and \`acq\` would refer to the SAME entity (the disclosing company is just talking about itself — share buyback, AGM circular, restructuring notice, etc.), still return both as you found them; the caller will treat that as a non-deal. Don't try to invent a different acquirer or target to make the record look like a real M&A.

# CRITICAL OUTPUT FORMAT

- FIRST character MUST be \`{\`.
- LAST character MUST be \`}\`.
- NO markdown fences (no \`\`\`json, no \`\`\`).
- NO prose before or after the JSON.
- Output goes directly to JSON.parse().`;

export type DealLike = {
  nm: string;
  acq: string;
  v: string;
  c: string;
  r: string;
  st: string;
  sc: string;
  reg: string;
  cl: string;
  desc: string;
  ai: string;
  f: string;
  pr: { u: number; c: number; o: number; sym: string; cur: string; ad: string };
  tl: Array<{ d: string; t: string; x: string }>;
};

type EnrichPatch = Partial<Pick<DealLike, "nm" | "acq" | "v" | "cl" | "desc">> & {
  pr?: Partial<DealLike["pr"]>;
};

// Names the 1st pass may emit when it couldn't pin down a party from the
// headline alone. The 2nd pass is allowed to overwrite ONLY these values.
// Includes the various "I don't know" placeholders models sometimes use
// instead of the canonical "TBD" — n/a, none, null, etc.
export function isUselessName(n: string | null | undefined): boolean {
  const t = (n ?? "").trim().toLowerCase();
  return (
    t === "" ||
    t === "tbd" ||
    t === "unknown" ||
    t === "unknown target" ||
    t === "unknown acquirer" ||
    t === "n/a" ||
    t === "na" ||
    t === "not available" ||
    t === "not disclosed" ||
    t === "none" ||
    t === "null" ||
    t === "undisclosed"
  );
}

// True when target name and acquirer name normalise to the same entity —
// almost always indicates the 1st-pass parsed a self-disclosure (buyback,
// share-repurchase, AGM circular, structural notice) as if it were an
// outside M&A transaction. Caller should treat as NOT_DEAL.
export function nmEqualsAcq(nm: string | null | undefined, acq: string | null | undefined): boolean {
  const a = (nm ?? "").trim().toLowerCase().replace(/[.,()]/g, "").replace(/\s+(inc|corp|ltd|plc|holdings|group|hd|co)\.?$/, "").trim();
  const b = (acq ?? "").trim().toLowerCase().replace(/[.,()]/g, "").replace(/\s+(inc|corp|ltd|plc|holdings|group|hd|co)\.?$/, "").trim();
  if (!a || !b) return false;
  if (isUselessName(a) || isUselessName(b)) return false;
  return a === b;
}

// Call Claude with the disclosure document and merge the returned patch
// back onto the input deal. Returns the merged deal (or the original
// unchanged if the enrich call fails / returns nothing useful).
export async function enrichDealFromDocument(
  deal: DealLike,
  documentText: string,
): Promise<DealLike> {
  if (!documentText || documentText.length < 200) return deal;

  const anthropic = getAnthropic();
  const userMsg = `INPUT DEAL RECORD:
${JSON.stringify(deal)}

DOCUMENT TEXT (${documentText.length} chars):
${documentText}`;

  try {
    const res = await anthropic.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 800,
      system: [{ type: "text", text: ENRICH_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMsg }],
    });
    const block = res.content[0];
    const text = block && block.type === "text" ? block.text : "";
    const patch = parseClaudeJson<EnrichPatch>(text);
    if (!patch) return deal;
    return mergeDeal(deal, patch);
  } catch (e) {
    console.log(`[enrich] failed: ${(e as Error).message}`);
    return deal;
  }
}

// 3rd-pass enrichment: search the deal's press-release wires (PR
// Newswire, Business Wire, LSE RNS, EDINET) for a release matching
// the deal, then feed it through the same enrich prompt. Returns
// { deal, pressRelease } — the pressRelease is null when no matching
// release was found on any wire (caller can log/count that case).
//
// Called from discovery pipelines and reEnrich after the PDF 2nd pass
// hasn't recovered v / pr.o — press-release wires are where issuers
// state deal values that exchange filings often leave out.
export async function enrichDealFromPressRelease(
  deal: DealLike,
): Promise<{ deal: DealLike; pressRelease: PressRelease | null }> {
  if (isUselessName(deal.nm)) return { deal, pressRelease: null };
  const pr = await findPressRelease(deal.nm, deal.acq).catch(() => null);
  if (!pr) return { deal, pressRelease: null };
  const enriched = await enrichDealFromDocument(deal, pr.text);
  return { deal: enriched, pressRelease: pr };
}

// Merge an enrich patch onto a deal, preserving any 1st-pass value the
// 2nd pass would otherwise erase (the prompt instructs Claude not to,
// but defense in depth — the 1st pass already saw the headline and we
// don't want a sparse document to wipe its findings).
function mergeDeal(base: DealLike, patch: EnrichPatch): DealLike {
  const merged: DealLike = { ...base };

  // Party names: only overwrite when the base name carries no signal AND
  // the patch gives us a real one. The prompt instructs Claude to do the
  // same but we double-up here so a hallucinated alternate name never
  // replaces a good 1st-pass extraction.
  if (patch.nm && !isUselessName(patch.nm) && isUselessName(base.nm)) {
    merged.nm = patch.nm;
  }
  if (patch.acq && !isUselessName(patch.acq) && isUselessName(base.acq)) {
    merged.acq = patch.acq;
  }

  if (patch.v && patch.v !== "TBD") merged.v = patch.v;
  else if (patch.v === "TBD" && (!base.v || base.v === "TBD" || base.v === "")) merged.v = "TBD";

  if (patch.cl && patch.cl !== "TBD") merged.cl = patch.cl;

  if (patch.desc && patch.desc.length > 20) merged.desc = patch.desc;

  if (patch.pr) {
    merged.pr = {
      ...base.pr,
      o: patch.pr.o && patch.pr.o > 0 ? patch.pr.o : base.pr.o,
      sym: patch.pr.sym && patch.pr.sym.length > 0 ? patch.pr.sym : base.pr.sym,
      cur: patch.pr.cur && patch.pr.cur.length > 0 ? patch.pr.cur : base.pr.cur,
      ad: patch.pr.ad && patch.pr.ad.length > 0 ? patch.pr.ad : base.pr.ad,
    };
  }
  return merged;
}
