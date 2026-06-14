import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { getAnthropic, EXTRACTION_MODEL, parseClaudeJson } from "@/lib/anthropic";
import { fetchCmaCases, fetchCmaCaseText, findCmaCasePdf, type CmaCase } from "@/lib/sources/cma";
import { fetchDgCompCases, fetchDgCompCaseText, type DgCompCase } from "@/lib/sources/dg-comp";
import { fetchPdfText } from "@/lib/pdf";
import { enrichDealFromDocument, nmEqualsAcq, type DealLike } from "@/lib/enrich";

// ════════════════════════════════════════════════════════════════════
// European discovery — UK CMA + EU Commission DG COMP.
// Mirrors lib/discovery.ts (SEC) but consumes regulator publication feeds.
// ════════════════════════════════════════════════════════════════════

const EU_DISCOVERY_SYSTEM_PROMPT = `You are an institutional event-driven analyst specialized in European M&A (mergers, acquisitions, divestitures, spin-offs, restructurings, tender offers). Given a case from a European regulator publication (UK CMA or EU Commission DG COMP), decide if it represents a NEW event-driven deal and extract its full structure.

# Output

JSON only, no markdown fences, no preface, no suffix:

\`\`\`json
{
  "is_deal": true | false,
  "deal": {
    "nm": "Target Company",
    "acq": "Acquirer Company",
    "v": "€2.5B",
    "c": "MERGER" | "ACTIVISM" | "DISTRESSED" | "SPINOFF" | "REORG" | "TENDER",
    "r": "CMA" | "DG COMP" | "CMA/DG COMP",
    "st": "Review" | "Phase II Review" | "Cleared" | "Blocked",
    "sc": "G" | "A" | "R" | "P" | "B",
    "reg": "EU",
    "cl": "Q3 2026",
    "desc": "1-2 factual sentences.",
    "ai": "1 analytical sentence (signals to watch).",
    "f": "🇬🇧" | "🇪🇺" | "🇫🇷" | "🇩🇪" | "🇮🇹" | etc.,
    "pr": { "u": 0, "c": 0, "o": 0, "sym": "", "cur": "€", "ad": "Apr 2026" },
    "tl": [{ "d": "Apr 2026", "t": "ANNOUNCED", "x": "Brief description" }]
  }
}
\`\`\`

If \`is_deal\` is false, return \`"deal": null\`.

# Rules

- **Source-aware flags**: CMA cases → 🇬🇧 default (UK target). DG COMP → 🇪🇺 for cross-border / EU-wide, or country flag if a single nationality is clear from the case (🇫🇷, 🇩🇪, 🇪🇸, 🇮🇹, 🇳🇱, etc.).
- **Regulator (r)**: "CMA" for UK Phase I/II, "DG COMP" for EU notifications, "CMA/DG COMP" if mentioned in both jurisdictions.
- **Status (st)**:
  - Initial notification → \`Review\`
  - Phase II reference → \`Phase II Review\`
  - Cleared (unconditional or with remedies accepted) → \`Cleared\`
  - Prohibited → \`Blocked\`
  - Withdrawn / abandoned → return \`is_deal: false\` (we don't track dead deals as new).
- **Score (sc)**:
  - \`G\` = cleared without significant remedies
  - \`A\` = Phase II / under review / uncertain
  - \`R\` = blocked or contested
  - \`P\` = multi-party complex (consortium, activist-driven)
  - \`B\` = neutral/informational
- **Currency (pr.cur)**: \`€\` for DG COMP and continental EU targets, \`£\` for CMA UK-domestic deals.
- **Ticker (pr.sym)**: leave empty unless an explicit listed-issuer ticker is in the source.
- **Announcement date (pr.ad)**: "MMM YYYY" (e.g. "Apr 2026") from the case notification date.
- **Categories**: vast majority are MERGER. Use TENDER only for explicit tender offers, REORG for restructurings, SPINOFF for divestitures structured as spin-offs, ACTIVISM only if explicitly mentioned (rare in regulator filings).

# Anti-hallucination

- If the case is NOT clearly an event-driven deal (e.g. cartel investigation, state aid, antitrust complaint without a transaction), return \`{"is_deal": false, "deal": null}\`.
- Don't invent values. Use "TBD" for unknown text fields, 0 for unknown numerics, "" for unknown ticker.
- Don't propose \`spread\` or \`proba_close\` — those are computed downstream.

# Deal value & price (CRITICAL — do not skip)

CMA case pages and DG COMP press releases frequently — though not always — state the deal value. When they do, extract aggressively:

- **v** (total deal value, string): "€2.5B", "£800M". Look for phrases like "transaction valued at", "consideration of approximately", "equity value of", "enterprise value", "target's market capitalisation". Format with the deal's currency and SI suffix.
- **pr.o** (offer price per share, number): float if explicitly stated (e.g. \`4.85\`, \`31.20\`). Many regulator filings don't include the per-share price — leave at \`0\` in that case rather than guess.
- **pr.cur**: \`"€"\` for DG COMP / continental deals, \`"£"\` for CMA UK-domestic deals.

If the case page genuinely doesn't disclose a value, set \`v: "TBD"\` and \`pr.o: 0\` — never hallucinate. But if the press release mentions even a rough order of magnitude ("approximately £500 million"), capture it as \`v: "£500M"\`.

# CRITICAL OUTPUT FORMAT

- The FIRST character of your response MUST be \`{\`.
- The LAST character of your response MUST be \`}\`.
- NO markdown code fences (no \`\`\`json, no \`\`\`).
- NO prose before or after the JSON.
- NO language preface ("Here's the JSON:", "Sure!", "I'll analyze...", etc).
- Your entire output is passed directly to \`JSON.parse()\`. Any extra character crashes the parser.`;

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
    .replace(/[,.()]/g, "")
    .replace(/\s+(inc|corp|corporation|holdings|group|ltd|plc|ag|sa|nv|co|company|llc|llp|trust|reit|sas|gmbh|spa|kgaa)\.?$/i, "")
    .trim();
}

type EuCase = (CmaCase | DgCompCase) & { detailText: string };

async function extractEuDiscovery(c: EuCase): Promise<DiscoveryResponse | null> {
  if (!c.detailText) return null;
  const anthropic = getAnthropic();
  const userMsg = `EUROPEAN REGULATOR CASE:
Source: ${c.source}
Title: ${c.title}
Date: ${c.date}
URL: ${c.url}

SUMMARY (from feed):
${c.summary || "(no summary)"}

DETAIL PAGE (HTML stripped, may contain navigation noise):
${c.detailText}`;

  const res = await anthropic.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 1500,
    system: [{ type: "text", text: EU_DISCOVERY_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMsg }],
  });
  const block = res.content[0];
  const text = block && block.type === "text" ? block.text : "";
  return parseClaudeJson<DiscoveryResponse>(text);
}

export type EuDiscoveryResult = {
  cmaScanned: number;
  dgCompScanned: number;
  candidates: number;
  inserted: number;
  duplicates: number;
  errors: string[];
};

export async function discoverEuDeals(opts: { daysBack?: number; maxCases?: number } = {}): Promise<EuDiscoveryResult> {
  const daysBack = opts.daysBack ?? 30;
  const maxCases = opts.maxCases ?? 50;
  const errors: string[] = [];
  const admin = createAdminClient();

  // Dedup against existing deals (by name + ticker)
  const { data: existing } = await admin.from("deals").select("nom, price");
  const existingNames = new Set<string>();
  const existingSyms = new Set<string>();
  for (const d of (existing ?? []) as Array<{ nom: string; price: unknown }>) {
    existingNames.add(normalize(d.nom));
    const pr = d.price as { sym?: string } | null;
    if (pr?.sym) existingSyms.add(normalize(pr.sym));
  }

  // Dedup against review_queue (any status) + deal_updates source URLs
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

  // Fetch both sources in parallel — each fails independently
  const [cmaRes, dgCompRes] = await Promise.allSettled([
    fetchCmaCases({ daysBack, limit: maxCases }),
    fetchDgCompCases({ daysBack, limit: maxCases }),
  ]);

  let cmaCases: CmaCase[] = [];
  let dgCompCases: DgCompCase[] = [];
  if (cmaRes.status === "fulfilled") cmaCases = cmaRes.value;
  else errors.push(`CMA fetch: ${(cmaRes.reason as Error).message}`);
  if (dgCompRes.status === "fulfilled") dgCompCases = dgCompRes.value;
  else errors.push(`DG COMP fetch: ${(dgCompRes.reason as Error).message}`);

  let candidates = 0;
  let inserted = 0;
  let duplicates = 0;

  const all: Array<CmaCase | DgCompCase> = [...cmaCases, ...dgCompCases];
  console.log(`[discovery-eu] fetched cma=${cmaCases.length} dgcomp=${dgCompCases.length} total=${all.length}`);
  let parseFailures = 0;
  let notDeal = 0;

  for (const c of all) {
    if (seenSources.has(c.url)) {
      console.log(`[discovery-eu] DUP_URL ${c.source} :: ${c.url}`);
      duplicates++;
      continue;
    }
    const detailText = c.source === "CMA"
      ? await fetchCmaCaseText(c.url).catch(() => "")
      : await fetchDgCompCaseText(c.url).catch(() => "");

    const resp = await extractEuDiscovery({ ...c, detailText } as EuCase).catch((e) => {
      errors.push(`extract ${c.source} ${c.url}: ${(e as Error).message}`);
      return null;
    });
    if (resp === null) {
      parseFailures++;
      console.log(`[discovery-eu] PARSE_FAIL ${c.source} :: ${c.title}`);
      continue;
    }
    if (!resp.is_deal || !resp.deal) {
      notDeal++;
      console.log(`[discovery-eu] NOT_DEAL ${c.source} :: ${c.title}`);
      continue;
    }
    candidates++;
    console.log(`[discovery-eu] CANDIDATE ${c.source} :: ${resp.deal.nm} / ${resp.deal.acq}`);

    let d = resp.deal;
    const targetKey = normalize(d.nm);
    const symKey = normalize(d.pr?.sym);
    if (existingNames.has(targetKey)) {
      console.log(`[discovery-eu] DUP_NAME :: ${d.nm} -> "${targetKey}"`);
      duplicates++;
      continue;
    }
    if (symKey && existingSyms.has(symKey)) {
      console.log(`[discovery-eu] DUP_SYM :: ${d.pr?.sym}`);
      duplicates++;
      continue;
    }

    // 2nd pass: pull the regulator's decision/notice PDF and let Claude
    // refine deal value + per-share price from it. CMA exposes the PDF on
    // the case page; DG COMP carries it in the JSON dataset's decisions[].
    // Best-effort — sparse cases just keep the 1st-pass deal.
    let pdfUrl: string | null = null;
    if (c.source === "CMA") pdfUrl = await findCmaCasePdf(c.url).catch(() => null);
    else if (c.source === "DG COMP") pdfUrl = (c as DgCompCase).decisionPdfUrl ?? null;
    if (pdfUrl) {
      const pdfText = await fetchPdfText(pdfUrl).catch(() => "");
      if (pdfText) {
        const before = `v=${d.v} pr.o=${d.pr?.o ?? 0}`;
        d = await enrichDealFromDocument(d as DealLike, pdfText);
        console.log(
          `[discovery-eu] ENRICHED ${c.source} :: ${d.nm} :: ${before} → v=${d.v} pr.o=${d.pr?.o ?? 0} (pdf=${pdfUrl})`,
        );
      } else {
        console.log(`[discovery-eu] enrich skipped (empty pdf text) :: ${d.nm} :: ${pdfUrl}`);
      }
    } else {
      console.log(`[discovery-eu] no decision pdf found :: ${c.source} :: ${d.nm}`);
    }

    // Self-disclosure check: same entity as target and acquirer = not a
    // real M&A, drop it.
    if (nmEqualsAcq(d.nm, d.acq)) {
      console.log(`[discovery-eu] SELF_NAME :: ${d.nm} == ${d.acq}`);
      notDeal++;
      continue;
    }

    const { error: insErr } = await admin.from("review_queue").insert({
      proposition: { kind: "new_deal", deal: d } as unknown as Record<string, unknown>,
      source_url: c.url,
      confiance: 80,
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
    console.log(`[discovery-eu] INSERTED :: ${d.nm}`);
  }

  console.log(`[discovery-eu] funnel: scanned=${all.length} parseFail=${parseFailures} notDeal=${notDeal} candidates=${candidates} duplicates=${duplicates} inserted=${inserted}`);

  return {
    cmaScanned: cmaCases.length,
    dgCompScanned: dgCompCases.length,
    candidates,
    inserted,
    duplicates,
    errors,
  };
}
