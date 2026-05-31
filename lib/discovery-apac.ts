import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { getAnthropic, EXTRACTION_MODEL, parseClaudeJson } from "@/lib/anthropic";
import { fetchTdnetDisclosures, type TdnetDisclosure } from "@/lib/sources/tdnet";

// ════════════════════════════════════════════════════════════════════
// APAC discovery — Tokyo (TDnet) for now. HKEX / ASX / SGX can plug
// into the same orchestrator via Promise.allSettled, like EU does.
// ════════════════════════════════════════════════════════════════════

const APAC_DISCOVERY_SYSTEM_PROMPT = `You are an institutional event-driven analyst specialized in Asia-Pacific M&A. Given a corporate disclosure from an APAC exchange (Tokyo TDnet today; HKEX / ASX / SGX later), decide if it represents a NEW event-driven deal and extract its structure.

# Output

JSON only, no markdown fences, no preface:

\`\`\`json
{
  "is_deal": true | false,
  "deal": {
    "nm": "Target Company",
    "acq": "Acquirer Company",
    "v": "¥320B",
    "c": "MERGER" | "ACTIVISM" | "DISTRESSED" | "SPINOFF" | "REORG" | "TENDER",
    "r": "JFTC" | "TSE listing rules" | "SFC" | "ACCC" | "MAS" | etc.,
    "st": "Review" | "Closing" | "Active" | "Rumored",
    "sc": "G" | "A" | "R" | "P" | "B",
    "reg": "APAC",
    "cl": "Q3 2026",
    "desc": "1-2 factual sentences.",
    "ai": "1 analytical sentence (signals to watch).",
    "f": "🇯🇵" | "🇭🇰" | "🇦🇺" | "🇸🇬" | "🇰🇷" | "🇮🇳" | "🇨🇳" | etc.,
    "pr": { "u": 0, "c": 0, "o": 0, "sym": "7203", "cur": "¥", "ad": "Apr 2026" },
    "tl": [{ "d": "Apr 2026", "t": "ANNOUNCED", "x": "Brief description" }]
  }
}
\`\`\`

If \`is_deal\` is false, return \`"deal": null\`.

# TDnet (Tokyo) — Japanese disclosures

Disclosure titles are in Japanese. Common deal-signal keywords:
- **TOB / 公開買付** = tender offer.
- **MBO** = management buy-out.
- **株式取得 / 子会社化 / 完全子会社化** = share acquisition / making (wholly-owned) subsidiary.
- **株式譲渡 / 持分譲渡** = share or equity transfer.
- **経営統合 / 合併** = business integration / merger.
- **株式交換** = share-for-share exchange (M&A).
- **会社分割** = corporate split / demerger.
- **資本業務提携** = capital & business alliance (often a stake acquisition).
- **事業譲渡** = business transfer.

The company code is a 4-digit ticker on the Tokyo exchange (e.g. "7203" = Toyota).

# Language (CRITICAL)

ALL output text fields MUST be in **English**. The terminal serves an English-speaking institutional audience — no Japanese characters (kanji, hiragana, katakana, full-width romans) may appear in any field.

- \`nm\` (target) and \`acq\` (acquirer): use the company's **official English name** when it exists (e.g. トヨタ自動車 → "Toyota Motor", カカクコム → "Kakaku.com", カルチュア・コンビニエンス・クラブ → "Culture Convenience Club", 神戸物産 → "Kobe Bussan", ワタミ → "Watami", オリンパス → "Olympus", きんでん → "Kinden", ジモティー → "Jimoty"). Otherwise transliterate to **Romaji** (e.g. ニチリョク → "Nichiryoku", アクセルマーク → "Axel Mark", マキヤ → "Makiya", 弘電社 → "Kodensha"). Strip Japanese corporate suffixes: 株式会社 / ㈱ / (株) → drop entirely; HD / ホールディングス → "Holdings"; Ｇ－ (full-width "G-") → drop.
- \`desc\` and \`ai\`: English sentences. Translate the Japanese disclosure title into a factual English description.
- \`v\` (deal value): keep the original currency symbol with English number format (e.g. "¥320B", "¥45.2B"). No Japanese characters.
- \`cl\` (expected close): English (e.g. "Q3 2026", "Apr 2026").
- \`tl[].x\` (timeline blurb): English.

If a company name is genuinely unknown from the title (e.g. "連結子会社" = "subsidiary" with no specific name disclosed), output \`"TBD"\` rather than leave Japanese characters or generic Japanese descriptors.

# Rules

- **f (flag)**: 🇯🇵 for TDnet (Japan) by default; later HKEX→🇭🇰, ASX→🇦🇺, SGX→🇸🇬.
- **r (regulator)**: For TDnet, default \`JFTC\` for antitrust-relevant transactions; use \`TSE listing rules\` for pure disclosure obligations; \`METI\` for foreign-investment review under FEFTA.
- **st (status)**: announcement of a new tender offer or M&A agreement → \`Review\`; completed / settled → \`Closed\`; rumored → \`Rumored\`.
- **sc (score color)**: G = clean / cleared, A = pending review / amber, R = contested or blocked, P = activist-driven, B = neutral.
- **pr.cur**: \`¥\` for Japan, \`HK$\` for Hong Kong, \`A$\` for Australia, \`S$\` for Singapore.
- **pr.sym**: the 4-digit code for Tokyo (e.g. \`"7203"\`), or the exchange ticker elsewhere.
- **pr.ad**: month + year of the disclosure (e.g. \`"Apr 2026"\`).
- **nm / acq**: extract from the title. Japanese title patterns:
  - "AAAAによるBBBBに対する公開買付け" → \`acq: "AAAA", nm: "BBBB"\`.
  - "BBBBの完全子会社化" → \`nm: "BBBB"\` (acquirer from filer / company name).
  - "AAAAとBBBBの経営統合" → \`nm: "BBBB", acq: "AAAA"\` (or both as merger of equals).
- Categories: TOB / 公開買付 → \`TENDER\`. MBO → \`MERGER\` (privatization). 株式取得 / 子会社化 → \`MERGER\`. 株式譲渡 (selling subsidiary) → \`SPINOFF\`. 株式交換 / 経営統合 / 合併 → \`MERGER\`. 会社分割 → \`SPINOFF\`. 資本業務提携 → \`MERGER\` if stake is material; otherwise \`is_deal: false\`.

# Anti-hallucination

- If the disclosure is NOT a clear event-driven transaction (e.g. earnings release that happens to mention an old deal, board reshuffle, governance update), return \`{"is_deal": false, "deal": null}\`.
- If you can't identify a clear target or acquirer from the title alone (no detail page available for TDnet), still produce a best-effort structure with what's available — but mark \`sc: "B"\` and \`st: "Rumored"\` if either party is unclear.
- Don't invent ticker symbols or transaction values. Use \`"TBD"\` / \`""\` / \`0\` for unknowns.

# CRITICAL OUTPUT FORMAT

- First character MUST be \`{\`.
- Last character MUST be \`}\`.
- NO markdown code fences (no \`\`\`json, no \`\`\`).
- NO prose before or after the JSON.
- Output goes directly to \`JSON.parse()\`.`;

type DiscoveredDeal = {
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

type DiscoveryResponse = {
  is_deal: boolean;
  deal: DiscoveredDeal | null;
};

function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[,.()株式会社株式会社]/g, "")
    .replace(/\s+(inc|corp|corporation|holdings|group|ltd|plc|ag|sa|nv|co|company|llc|llp|trust|reit|sas|gmbh|spa|kgaa|kabushiki|kaisha)\.?$/i, "")
    .trim();
}

async function extractApacDiscovery(c: TdnetDisclosure): Promise<DiscoveryResponse | null> {
  const anthropic = getAnthropic();
  const userMsg = `APAC DISCLOSURE
Source: ${c.source}
Date: ${c.date}
Company code: ${c.code}
Company: ${c.company}
Title: ${c.title}
URL: ${c.url}

(No detail text — extract from title + company + code alone.)`;

  const res = await anthropic.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 1500,
    system: [{ type: "text", text: APAC_DISCOVERY_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMsg }],
  });
  const block = res.content[0];
  const responseText = block && block.type === "text" ? block.text : "";
  return parseClaudeJson<DiscoveryResponse>(responseText);
}

export type ApacDiscoveryResult = {
  tdnetScanned: number;
  candidates: number;
  inserted: number;
  duplicates: number;
  errors: string[];
};

export async function discoverApacDeals(
  opts: { daysBack?: number; maxCases?: number } = {},
): Promise<ApacDiscoveryResult> {
  const daysBack = opts.daysBack ?? 7;
  const maxCases = opts.maxCases ?? 30;
  const errors: string[] = [];
  const admin = createAdminClient();

  // Dedup index: existing deals + queued proposals + applied updates.
  const { data: existing } = await admin.from("deals").select("nom, price");
  const existingNames = new Set<string>();
  const existingSyms = new Set<string>();
  for (const d of (existing ?? []) as Array<{ nom: string; price: unknown }>) {
    existingNames.add(normalize(d.nom));
    const pr = d.price as { sym?: string } | null;
    if (pr?.sym) existingSyms.add(normalize(pr.sym));
  }
  const seenSources = new Set<string>();
  const { data: queueRows } = await admin
    .from("review_queue")
    .select("source_url, proposition");
  for (const r of (queueRows ?? []) as Array<{ source_url: string | null; proposition: unknown }>) {
    if (r.source_url) seenSources.add(r.source_url);
    const p = r.proposition as { kind?: string; deal?: { nm?: string; pr?: { sym?: string } } };
    if (p?.kind === "new_deal" && p.deal?.nm) existingNames.add(normalize(p.deal.nm));
    if (p?.kind === "new_deal" && p.deal?.pr?.sym) existingSyms.add(normalize(p.deal.pr.sym));
  }
  const { data: appliedRows } = await admin
    .from("deal_updates")
    .select("source_url")
    .not("source_url", "is", null);
  for (const r of (appliedRows ?? []) as Array<{ source_url: string | null }>) {
    if (r.source_url) seenSources.add(r.source_url);
  }

  // Fetch APAC sources (only TDnet for now — Promise.allSettled-ready)
  const [tdnetRes] = await Promise.allSettled([
    fetchTdnetDisclosures({ daysBack, limit: maxCases }),
  ]);

  let tdnetCases: TdnetDisclosure[] = [];
  if (tdnetRes.status === "fulfilled") tdnetCases = tdnetRes.value;
  else errors.push(`TDnet: ${(tdnetRes.reason as Error).message}`);

  const all: TdnetDisclosure[] = [...tdnetCases];
  console.log(`[discovery-apac] fetched tdnet=${tdnetCases.length} total=${all.length}`);

  let candidates = 0;
  let inserted = 0;
  let duplicates = 0;
  let parseFailures = 0;
  let notDeal = 0;

  for (const c of all) {
    if (seenSources.has(c.url)) {
      console.log(`[discovery-apac] DUP_URL ${c.source} :: ${c.url}`);
      duplicates++;
      continue;
    }

    const resp = await extractApacDiscovery(c).catch((e) => {
      errors.push(`extract ${c.source} ${c.url}: ${(e as Error).message}`);
      return null;
    });
    if (resp === null) {
      parseFailures++;
      console.log(`[discovery-apac] PARSE_FAIL ${c.source} :: ${c.title}`);
      continue;
    }
    if (!resp.is_deal || !resp.deal) {
      notDeal++;
      console.log(`[discovery-apac] NOT_DEAL ${c.source} :: ${c.title}`);
      continue;
    }
    candidates++;
    console.log(`[discovery-apac] CANDIDATE ${c.source} :: ${resp.deal.nm} / ${resp.deal.acq}`);

    const d = resp.deal;
    const targetKey = normalize(d.nm);
    const symKey = normalize(d.pr?.sym);
    if (existingNames.has(targetKey)) {
      console.log(`[discovery-apac] DUP_NAME :: ${d.nm} -> "${targetKey}"`);
      duplicates++;
      continue;
    }
    if (symKey && existingSyms.has(symKey)) {
      console.log(`[discovery-apac] DUP_SYM :: ${d.pr?.sym}`);
      duplicates++;
      continue;
    }

    const { error: insErr } = await admin.from("review_queue").insert({
      proposition: { kind: "new_deal", deal: d } as unknown as Record<string, unknown>,
      source_url: c.url,
      confiance: 75,
      statut: "en_attente",
    });
    if (insErr) {
      errors.push(`queue insert ${c.url}: ${insErr.message}`);
      continue;
    }
    existingNames.add(targetKey);
    if (symKey) existingSyms.add(symKey);
    seenSources.add(c.url);
    inserted++;
    console.log(`[discovery-apac] INSERTED :: ${d.nm}`);
  }

  console.log(
    `[discovery-apac] funnel: scanned=${all.length} parseFail=${parseFailures} notDeal=${notDeal} candidates=${candidates} duplicates=${duplicates} inserted=${inserted}`,
  );

  return {
    tdnetScanned: tdnetCases.length,
    candidates,
    inserted,
    duplicates,
    errors,
  };
}
