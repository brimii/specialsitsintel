import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { getAnthropic, EXTRACTION_MODEL, parseClaudeJson } from "@/lib/anthropic";
import { fetchTdnetDisclosures, type TdnetDisclosure } from "@/lib/sources/tdnet";
import { fetchHkexDisclosures, type HkexDisclosure } from "@/lib/sources/hkex";
import { fetchAsxDisclosures, type AsxDisclosure } from "@/lib/sources/asx";
import { fetchSgxDisclosures, type SgxDisclosure } from "@/lib/sources/sgx";
import { fetchPdfText } from "@/lib/pdf";
import {
  enrichDealFromDocument,
  enrichDealFromPressRelease,
  isUselessName,
  nmEqualsAcq,
  type DealLike,
} from "@/lib/enrich";

type ApacDisclosure = TdnetDisclosure | HkexDisclosure | AsxDisclosure | SgxDisclosure;

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

# HKEX (Hong Kong) — English disclosures

HKEX disclosure headlines are all-caps English with a regulatory category up front. Common deal-signal categories:
- **DISCLOSEABLE TRANSACTION** = HK Listing Rule 14.06 — transaction sized at 5-25% of the issuer's tests.
- **MAJOR TRANSACTION** = 25-100% test — shareholder approval required.
- **VERY SUBSTANTIAL ACQUISITION** / **VERY SUBSTANTIAL DISPOSAL** = >100% test, treated as reverse takeover.
- **CONNECTED TRANSACTION** = related-party deal, may also be classified as Discloseable / Major.
- **MAJOR AND CONNECTED TRANSACTION** = both rules apply.
- **COMPOSITE DOCUMENT** = combined offeror/offeree document under the Takeovers Code.
- **JOINT ANNOUNCEMENT** = typically the deal announcement signed by both parties.
- **PRE-CONDITIONAL VOLUNTARY OFFER** / **VOLUNTARY CONDITIONAL CASH OFFER** = takeover offers.
- **MANDATORY UNCONDITIONAL CASH OFFER** = triggered when a holder crosses 30% (HK Code Rule 26).
- **SCHEME OF ARRANGEMENT** = HK / Cayman court-sanctioned merger or privatisation.
- **PROPOSED PRIVATISATION** = take-private transaction.
- **RESPONSE TO OFFER** / **OFFEREE BOARD CIRCULAR** = target's reply to a takeover.

The company code is a **5-digit** HKEX ticker (e.g. "00700" = Tencent, "09988" = Alibaba, "01299" = AIA, "02899" = Zijin Mining). Strip leading zeros for display but keep the full 5-digit form in \`pr.sym\`.

# ASX (Australia) — English disclosures

ASX announcement headers identify M&A / event-driven categories explicitly:
- **TAKEOVER / OFF-MARKET BID / ON-MARKET BID** = a takeover offer under Chapter 6 of the Corporations Act.
- **BIDDER'S STATEMENT** / **TARGET'S STATEMENT** = the two mandatory statements in a takeover bid; the target statement is the offeree board's response.
- **SCHEME OF ARRANGEMENT** / **SCHEME BOOKLET** = court-sanctioned merger/privatisation, governed by Pt 5.1 of the Corporations Act. Schemes need ~75% shareholder approval + court approval; cleaner than a takeover bid.
- **MERGER** / **ACQUISITION** / **PROPOSED ACQUISITION** = generic deal announcements (often the press release accompanying a Scheme or Bid).
- **BINDING AGREEMENT** / **BID IMPLEMENTATION** = the signed agreement between bidder and target.
- **DEMERGER** / **DIVESTMENT** / **DISPOSAL** = spin-offs and asset sales (→ \`SPINOFF\`).
- **BECOMING A SUBSTANTIAL HOLDER** / **CHANGE IN SUBSTANTIAL HOLDING** = >5% disclosure (analogous to a US 13D); for an activist intent flag as \`ACTIVISM\`.
- **COMPULSORY ACQUISITION** = post-90% mop-up of remaining minority shares (close stage).

The company code is a **3-letter** ASX ticker (e.g. "BHP" = BHP Group, "CBA" = Commonwealth Bank, "ALU" = Altium). The takeovers regulator is the Australian Securities and Investments Commission (\`ASIC\`); the antitrust regulator is the Australian Competition and Consumer Commission (\`ACCC\`); foreign-investment review is the Foreign Investment Review Board (\`FIRB\`).

# SGX (Singapore) — English disclosures

SGX announcement titles classify M&A under the Singapore Takeovers Code and Listing Rules:
- **VOLUNTARY GENERAL OFFER** / **VOLUNTARY CONDITIONAL OFFER** = a non-mandatory takeover bid.
- **MANDATORY CONDITIONAL CASH OFFER** / **MANDATORY UNCONDITIONAL OFFER** = triggered when a holder crosses 30% (Singapore Takeovers Code Rule 14).
- **PRE-CONDITIONAL** = an indicative offer subject to regulatory clearances.
- **OFFER DOCUMENT** / **OFFEREE CIRCULAR** = the bidder's and target's mandatory documents.
- **SCHEME OF ARRANGEMENT** = court-sanctioned merger or privatisation under Section 210 of the Companies Act.
- **COMPULSORY ACQUISITION** = post-90% mop-up of remaining minority shares.
- **PROPOSED ACQUISITION** / **PROPOSED DISPOSAL** / **PROPOSED MERGER** = generic deal announcements.
- **DISCLOSEABLE TRANSACTION** / **MAJOR TRANSACTION** / **VERY SUBSTANTIAL ACQUISITION/DISPOSAL** = Listing Rules Chapter 10 size-test categories (5-25% / 25-100% / >100%).
- **INTERESTED PERSON TRANSACTION** = related-party deal (Chapter 9).
- **DELISTING** / **EXIT OFFER** = privatisation route via voluntary delisting + cash exit offer.

The company code is a **3-4 character alphanumeric** SGX ticker (e.g. "D05" = DBS Group, "U11" = UOB, "Z74" = SingTel, "C6L" = SIA, "Y92" = ThaiBev). The takeovers regulator is the **Securities Industry Council** (\`SIC\`); the financial regulator is the **Monetary Authority of Singapore** (\`MAS\`); the antitrust regulator is the **Competition and Consumer Commission of Singapore** (\`CCCS\`).

# Language (CRITICAL)

ALL output text fields MUST be in **English**. The terminal serves an English-speaking institutional audience — no Japanese characters (kanji, hiragana, katakana, full-width romans) may appear in any field.

- \`nm\` (target) and \`acq\` (acquirer): use the company's **official English name** when it exists (e.g. トヨタ自動車 → "Toyota Motor", カカクコム → "Kakaku.com", カルチュア・コンビニエンス・クラブ → "Culture Convenience Club", 神戸物産 → "Kobe Bussan", ワタミ → "Watami", オリンパス → "Olympus", きんでん → "Kinden", ジモティー → "Jimoty"). Otherwise transliterate to **Romaji** (e.g. ニチリョク → "Nichiryoku", アクセルマーク → "Axel Mark", マキヤ → "Makiya", 弘電社 → "Kodensha"). Strip Japanese corporate suffixes: 株式会社 / ㈱ / (株) → drop entirely; HD / ホールディングス → "Holdings"; Ｇ－ (full-width "G-") → drop.
- \`desc\` and \`ai\`: English sentences. Translate the Japanese disclosure title into a factual English description.
- \`v\` (deal value): keep the original currency symbol with English number format (e.g. "¥320B", "¥45.2B"). No Japanese characters.
- \`cl\` (expected close): English (e.g. "Q3 2026", "Apr 2026").
- \`tl[].x\` (timeline blurb): English.

If a company name is genuinely unknown from the title (e.g. "連結子会社" = "subsidiary" with no specific name disclosed), output \`"TBD"\` rather than leave Japanese characters or generic Japanese descriptors.

# Rules

- **f (flag)**: 🇯🇵 for TDnet (Japan), 🇭🇰 for HKEX (Hong Kong), 🇦🇺 for ASX (Australia), 🇸🇬 for SGX (Singapore).
- **r (regulator)**: For TDnet, default \`JFTC\` (antitrust) / \`TSE listing rules\` (pure disclosure) / \`METI\` (FEFTA foreign-investment). For HKEX, default \`SFC\` / \`HKEX listing rules\` / \`MOFCOM\` if mainland Chinese antitrust review is mentioned. For ASX, default \`ASIC\` for takeover bids and schemes / \`ACCC\` if antitrust framing is explicit / \`FIRB\` if a foreign acquirer triggers foreign-investment review. For SGX, default \`SIC\` for takeover bids and schemes / \`MAS\` for financial-sector deals / \`CCCS\` if antitrust framing is explicit / \`SGX listing rules\` for pure disclosure obligations.
- **st (status)**: announcement of a new tender offer or M&A agreement → \`Review\`; completed / settled → \`Closed\`; rumored → \`Rumored\`.
- **sc (score color)**: G = clean / cleared, A = pending review / amber, R = contested or blocked, P = activist-driven, B = neutral.
- **pr.cur**: \`¥\` for Japan, \`HK$\` for Hong Kong, \`A$\` for Australia, \`S$\` for Singapore.
- **pr.sym**: the 4-digit code for Tokyo (e.g. \`"7203"\`), the 5-digit code for HKEX (e.g. \`"00700"\`), the 3-letter code for ASX (e.g. \`"BHP"\`), the 3-4 character code for SGX (e.g. \`"D05"\`, \`"Y92"\`), or the exchange ticker elsewhere.
- **pr.ad**: month + year of the disclosure (e.g. \`"Apr 2026"\`).
- **nm / acq**: extract from the title. Japanese title patterns:
  - "AAAAによるBBBBに対する公開買付け" → \`acq: "AAAA", nm: "BBBB"\`.
  - "BBBBの完全子会社化" → \`nm: "BBBB"\` (acquirer from filer / company name).
  - "AAAAとBBBBの経営統合" → \`nm: "BBBB", acq: "AAAA"\` (or both as merger of equals).
- Categories: TOB / 公開買付 → \`TENDER\`. MBO → \`MERGER\` (privatization). 株式取得 / 子会社化 → \`MERGER\`. 株式譲渡 (selling subsidiary) → \`SPINOFF\`. 株式交換 / 経営統合 / 合併 → \`MERGER\`. 会社分割 → \`SPINOFF\`. 資本業務提携 → \`MERGER\` if stake is material; otherwise \`is_deal: false\`.
- HKEX categories: PROPOSED PRIVATISATION / SCHEME OF ARRANGEMENT / MANDATORY UNCONDITIONAL CASH OFFER / PRE-CONDITIONAL VOLUNTARY OFFER / VOLUNTARY CONDITIONAL CASH OFFER → \`MERGER\` or \`TENDER\` (use TENDER when the headline contains "OFFER"). VERY SUBSTANTIAL DISPOSAL / DISPOSAL → \`SPINOFF\`. DISCLOSEABLE / MAJOR / VERY SUBSTANTIAL ACQUISITION → \`MERGER\`. COMPOSITE DOCUMENT / JOINT ANNOUNCEMENT → category drives from the underlying transaction described; if unclear from headline alone, default \`MERGER\`. CONNECTED TRANSACTION alone (no acquisition framing) → \`is_deal: false\` unless the headline also flags a transfer of control.

# Deal value & price (CRITICAL — do not skip)

TDnet titles often (not always) include the TOB tender-offer price or aggregate transaction size — extract aggressively when present:

- **v** (total deal value, string): "¥320B", "¥45.2B". Look for figures in the title or company name:
  - Japanese unit conversion: 億 = 100 million, 兆 = 1 trillion. So "320億円" → "¥32B"; "1兆2,000億円" → "¥1.2T"; "450億円" → "¥45B".
  - Always format as "¥XB", "¥XM" or "¥XT" with English scale letters (NEVER Japanese 億 / 兆 in the output).
- **pr.o** (offer price per share, number): yen value as a plain number, no currency symbol. TOB announcements frequently state "1株あたり3,500円" or "公開買付価格 3,500円" or "TOB価格1,200円" → extract \`3500\` / \`1200\`. Strip commas. NEVER leave at 0 when the title mentions a per-share TOB price.
- **pr.cur**: \`"¥"\` for Japan.

If the title is a generic 株式取得 (share acquisition) or 子会社化 (subsidiarization) with no price disclosed, set \`v: "TBD"\` and \`pr.o: 0\`. Don't hallucinate a number.

# Anti-hallucination

- If the disclosure is NOT a clear event-driven transaction (e.g. earnings release that happens to mention an old deal, board reshuffle, governance update), return \`{"is_deal": false, "deal": null}\`.
- If you can't identify a clear target or acquirer from the title alone (no detail page available for TDnet), still produce a best-effort structure with what's available — but mark \`sc: "B"\` and \`st: "Rumored"\` if either party is unclear.
- Don't invent ticker symbols or transaction values. Use \`"TBD"\` / \`""\` / \`0\` for unknowns.
- When you don't know a name, the placeholder is **always "TBD"** — NEVER write "N/A", "N\\A", "Not Available", "Not Disclosed", "None", "Null", "Undisclosed", or any other variation. Use "TBD" for text and 0 for numeric.

# Self-disclosure filter (CRITICAL — do not skip)

A frequent false positive on TDnet, HKEX and ASX is a disclosure where the **filer company is just talking about itself** — a self-tender / share buyback (自己株式取得 / 自社株買い), an AGM circular, a structural notice (board change, restructuring inside the same group), a connected-party loan, or a defensive measure against an unsolicited bid (buyout defense plan). The 1st pass tends to fill in the filer's name as BOTH the target and the acquirer, producing a non-deal that looks structurally valid.

Rules to AVOID this:

- If \`nm\` (target) and \`acq\` (acquirer) would refer to the **same legal entity** (same company name even after stripping suffixes like 株式会社 / Holdings / HD / Inc / Corp / Ltd), return \`{"is_deal": false, "deal": null}\`. A company cannot acquire itself.
- Treat the following Japanese title patterns as **NOT deals** by default:
  - **自己株式取得** / **自己株式の公開買付け** / **自社株買い** → share buyback. \`is_deal: false\`.
  - **大量買付行為への対応方針** / **買収防衛策** / **株式の大規模な買付行為に関する対応方針** → buyout defense policy. \`is_deal: false\`.
  - **連結子会社間の合併** → intra-group reorg (the same parent on both sides). \`is_deal: false\` unless a third-party divestiture is announced.
  - **資本業務提携** alone (no transfer of control) → strategic alliance / minority stake under 5%. \`is_deal: false\` unless the title explicitly mentions a stake ≥ 20%.
- Treat the following English/Cantonese HKEX titles as **NOT deals**:
  - **CIRCULAR FOR THE ANNUAL GENERAL MEETING** / **NOTICE OF AGM** → governance only.
  - **CONTINUING CONNECTED TRANSACTION** with no acquisition framing → related-party operations, not M&A.
  - **CHANGE OF DIRECTORS** / **APPOINTMENT OF INDEPENDENT FINANCIAL ADVISER** → governance only.
- Treat the following ASX titles as **NOT deals**:
  - **Becoming / Change in / Ceasing to be a substantial holder** when the holder is a known passive index fund (BlackRock, Vanguard, State Street, MUFG, GPIF, Norges Bank, Fidelity, T. Rowe Price, Capital Group). Mark \`is_deal: false\`. Only flag as \`ACTIVISM\` when an explicitly activist holder is named (Elliott, Starboard, Engaged Capital, Pershing Square, etc.) or when the title literally says "intention to seek board representation" / "requisitioning a meeting".

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

async function extractApacDiscovery(c: ApacDisclosure): Promise<DiscoveryResponse | null> {
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
  hkexScanned: number;
  asxScanned: number;
  sgxScanned: number;
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

  // Fetch APAC sources in parallel — each fails independently.
  const [tdnetRes, hkexRes, asxRes, sgxRes] = await Promise.allSettled([
    fetchTdnetDisclosures({ daysBack, limit: maxCases }),
    fetchHkexDisclosures({ daysBack, limit: maxCases }),
    fetchAsxDisclosures({ daysBack, limit: maxCases }),
    fetchSgxDisclosures({ daysBack, limit: maxCases }),
  ]);

  let tdnetCases: TdnetDisclosure[] = [];
  let hkexCases: HkexDisclosure[] = [];
  let asxCases: AsxDisclosure[] = [];
  let sgxCases: SgxDisclosure[] = [];
  if (tdnetRes.status === "fulfilled") tdnetCases = tdnetRes.value;
  else errors.push(`TDnet: ${(tdnetRes.reason as Error).message}`);
  if (hkexRes.status === "fulfilled") hkexCases = hkexRes.value;
  else errors.push(`HKEX: ${(hkexRes.reason as Error).message}`);
  if (asxRes.status === "fulfilled") asxCases = asxRes.value;
  else errors.push(`ASX: ${(asxRes.reason as Error).message}`);
  if (sgxRes.status === "fulfilled") sgxCases = sgxRes.value;
  else errors.push(`SGX: ${(sgxRes.reason as Error).message}`);

  const all: ApacDisclosure[] = [...tdnetCases, ...hkexCases, ...asxCases, ...sgxCases];
  console.log(
    `[discovery-apac] fetched tdnet=${tdnetCases.length} hkex=${hkexCases.length} ` +
      `asx=${asxCases.length} sgx=${sgxCases.length} total=${all.length}`,
  );

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

    let d = resp.deal;
    const symKey = normalize(d.pr?.sym);
    if (symKey && existingSyms.has(symKey)) {
      console.log(`[discovery-apac] DUP_SYM :: ${d.pr?.sym}`);
      duplicates++;
      continue;
    }

    // If the 1st-pass name is real, dedup against existing deals NOW —
    // saves a Claude enrich call on a guaranteed dupe. If the name is
    // useless ("TBD" / "" / "Unknown"), DON'T dedup yet: "tbd"-keyed
    // dedup is meaningless and we'd block real new deals just because
    // the title was ambiguous. Try the 2nd-pass enrich first, then
    // re-check after it (hopefully) fills in the real name.
    const nameWasUseful = !isUselessName(d.nm);
    if (nameWasUseful && existingNames.has(normalize(d.nm))) {
      console.log(`[discovery-apac] DUP_NAME :: ${d.nm} -> "${normalize(d.nm)}"`);
      duplicates++;
      continue;
    }

    // 2nd pass: fetch the disclosure PDF and ask Claude to fill in price /
    // value / close-date AND any TBD party names when the document
    // discloses them. The 1st pass only saw the headline (TDnet and HKEX
    // both publish title + PDF link, no detail HTML). Best-effort: if PDF
    // fetch or extraction fails the 1st-pass deal goes through unchanged.
    const pdfText = await fetchPdfText(c.url).catch(() => "");
    if (pdfText) {
      const before = `nm=${d.nm} acq=${d.acq} v=${d.v} pr.o=${d.pr?.o ?? 0}`;
      d = await enrichDealFromDocument(d as DealLike, pdfText);
      const after = `nm=${d.nm} acq=${d.acq} v=${d.v} pr.o=${d.pr?.o ?? 0}`;
      console.log(`[discovery-apac] ENRICHED ${c.source} :: ${before} → ${after}`);
    } else {
      console.log(`[discovery-apac] enrich skipped (no pdf text) :: ${d.nm}`);
    }

    // 3rd pass: if v / pr.o are still empty after the PDF, try the
    // press-release wires. Asian exchange PDFs often disclose the
    // structure but not the financials — the acquirer's PRN / BW / RNS
    // release usually names the number.
    const stillNeedsValue = !d.v || d.v === "TBD" || d.v === "";
    const stillNeedsPrice = !d.pr || !d.pr.o || d.pr.o === 0;
    if ((stillNeedsValue || stillNeedsPrice) && !isUselessName(d.nm)) {
      const before = `v=${d.v} pr.o=${d.pr?.o ?? 0}`;
      const { deal: enriched, pressRelease } = await enrichDealFromPressRelease(
        d as DealLike,
      );
      if (pressRelease) {
        d = enriched;
        const after = `v=${d.v} pr.o=${d.pr?.o ?? 0}`;
        console.log(
          `[discovery-apac] PR-ENRICHED ${pressRelease.source} :: ${d.nm} :: ${before} → ${after}`,
        );
      }
    }

    // Post-enrich dedup: if we held off because the name was useless and
    // the enrich filled in a real one, dedup now.
    if (!nameWasUseful && !isUselessName(d.nm) && existingNames.has(normalize(d.nm))) {
      console.log(`[discovery-apac] DUP_NAME (post-enrich) :: ${d.nm} -> "${normalize(d.nm)}"`);
      duplicates++;
      continue;
    }

    // Self-disclosure check: if the target and acquirer normalise to the
    // same entity, the 1st pass parsed a buyback / AGM / restructuring
    // notice as an M&A. Drop it — these are never real deals.
    if (nmEqualsAcq(d.nm, d.acq)) {
      console.log(`[discovery-apac] SELF_NAME :: ${d.nm} == ${d.acq}`);
      notDeal++;
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
    if (!isUselessName(d.nm)) existingNames.add(normalize(d.nm));
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
    hkexScanned: hkexCases.length,
    asxScanned: asxCases.length,
    sgxScanned: sgxCases.length,
    candidates,
    inserted,
    duplicates,
    errors,
  };
}
