"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";

// Module-level locks: prevent concurrent runs of the same long-running action.
// In Next dev (single process) this is enough — clicking the button twice
// while it's still working returns immediately on the 2nd click instead of
// launching a parallel run that duplicates inserts and burns Claude tokens.
const locks: Record<string, Promise<void> | null> = {
  pipelineNow: null,
  fullScan: null,
  discoveryUs: null,
  discoveryEu: null,
  discoveryApac: null,
  reEnrich: null,
  rejectAllTbd: null,
  dgCompBackfill: null,
};

async function withLock(key: keyof typeof locks, fn: () => Promise<void>): Promise<void> {
  if (locks[key]) {
    console.log(`[${key}] another run is already in progress — ignoring this click`);
    return;
  }
  const p = (async () => {
    try {
      await fn();
    } finally {
      locks[key] = null;
    }
  })();
  locks[key] = p;
  await p;
}

type UpdateProposition = {
  kind?: undefined | "update";
  deal_id: number;
  champ_modifie: string;
  ancienne_valeur: string | null;
  nouvelle_valeur: string;
  resume?: string;
};

type DiscoveredDeal = {
  nm?: string;
  acq?: string;
  v?: string;
  c?: string;
  r?: string;
  st?: string;
  sc?: string;
  reg?: string;
  cl?: string;
  desc?: string;
  ai?: string;
  f?: string;
  pr?: { u?: number; c?: number; o?: number; sym?: string; cur?: string; ad?: string };
  tl?: Array<{ d: string; t: string; x: string }>;
};

type NewDealProposition = {
  kind: "new_deal";
  deal: DiscoveredDeal;
};

type Proposition = UpdateProposition | NewDealProposition;

function parseValue(field: string, v: string): string | number {
  if (field === "spread") return Number.parseFloat(v) || 0;
  if (field === "proba_close") return Number.parseInt(v) || 0;
  return v;
}

export async function approveItem(formData: FormData) {
  console.log("[approveItem] called");
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  console.log("[approveItem] id:", id);
  if (!id) return;
  const admin = createAdminClient();
  const { data: item, error: fetchErr } = await admin
    .from("review_queue")
    .select("proposition, source_url, confiance, statut")
    .eq("id", id)
    .single();
  if (fetchErr) {
    console.error("[approveItem] fetch failed:", fetchErr.message);
    return;
  }
  if (!item || item.statut !== "en_attente") {
    console.log("[approveItem] skip: no item or wrong status", item?.statut);
    return;
  }
  const p = item.proposition as Proposition;

  if (p.kind === "new_deal") {
    const d = p.deal ?? {};
    console.log("[approveItem] new_deal:", d.nm);

    // The deals table was seeded with explicit ids (1-213) which bypasses the
    // identity sequence. We compute MAX(id)+1 manually to avoid colliding with
    // already-used ids (sequence is stuck behind).
    const { data: maxRow } = await admin
      .from("deals")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextId = ((maxRow?.id as number | undefined) ?? 0) + 1;
    console.log("[approveItem] computed nextId:", nextId);

    // Defensive: fall back on safe defaults so a missing field never crashes the insert.
    const payload = {
      id: nextId,
      nom: d.nm ?? "Unknown target",
      acquereur: d.acq ?? null,
      valeur: d.v ?? null,
      regulateur: d.r ?? null,
      categorie: d.c ?? null,
      statut: d.st ?? "Review",
      region: d.reg ?? "US",
      description: d.desc ?? null,
      ai_commentary: d.ai ?? null,
      min_tier: "analyst",
      flag: d.f ?? null,
      score: d.sc ?? "G",
      close_estimate: d.cl ?? null,
      price: d.pr ?? { u: 0, c: 0, o: 0, sym: "", cur: "$", ad: "" },
      timeline: d.tl ?? [],
    };
    const { data: inserted, error: insErr } = await admin
      .from("deals")
      .insert(payload)
      .select("id")
      .single();
    if (insErr) {
      console.error("[approveItem] insert deal failed:", JSON.stringify(insErr));
      return;
    }
    console.log("[approveItem] inserted deal id:", inserted?.id);
    if (inserted?.id) {
      const { error: traceErr } = await admin.from("deal_updates").insert({
        deal_id: inserted.id,
        champ_modifie: "_creation",
        ancienne_valeur: null,
        nouvelle_valeur: `New deal created via Discovery: ${payload.nom} / ${payload.acquereur ?? "?"}`,
        source_url: item.source_url,
        confiance: item.confiance,
        auteur: "humain",
      });
      if (traceErr) console.error("[approveItem] trace failed:", traceErr.message);
    }
  } else {
    console.log("[approveItem] update deal:", p.deal_id, "field:", p.champ_modifie);
    const { error: upErr } = await admin
      .from("deals")
      .update({
        [p.champ_modifie]: parseValue(p.champ_modifie, p.nouvelle_valeur),
        updated_at: new Date().toISOString(),
      })
      .eq("id", p.deal_id);
    if (upErr) {
      console.error("[approveItem] update failed:", upErr.message);
      return;
    }
    const { error: traceErr } = await admin.from("deal_updates").insert({
      deal_id: p.deal_id,
      champ_modifie: p.champ_modifie,
      ancienne_valeur: p.ancienne_valeur,
      nouvelle_valeur: p.nouvelle_valeur,
      source_url: item.source_url,
      confiance: item.confiance,
      auteur: "humain",
    });
    if (traceErr) console.error("[approveItem] trace failed:", traceErr.message);
  }

  const { error: queueErr } = await admin
    .from("review_queue")
    .update({ statut: "approuve" })
    .eq("id", id);
  if (queueErr) console.error("[approveItem] queue update failed:", queueErr.message);
  console.log("[approveItem] === SUCCESS, redirecting ===");
  revalidatePath("/admin/review");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/archive");
  redirect("/admin/review");
}

export async function rejectItem(formData: FormData) {
  console.log("[rejectItem] === called ===");
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  console.log("[rejectItem] id:", id);
  if (!id) return;
  const admin = createAdminClient();
  const { error } = await admin.from("review_queue").update({ statut: "rejete" }).eq("id", id);
  if (error) console.error("[rejectItem] failed:", error.message);
  else console.log("[rejectItem] === SUCCESS, redirecting ===");
  revalidatePath("/admin/review");
  redirect("/admin/review");
}

export async function runPipelineNow(): Promise<void> {
  await withLock("pipelineNow", async () => {
    await requireAdmin();
    const { runPipeline } = await import("@/lib/pipeline");
    const result = await runPipeline({ maxDeals: 10, maxFilingsPerDeal: 2 });
    console.log("[runPipelineNow]", JSON.stringify(result));
    revalidatePath("/admin/review");
    revalidatePath("/admin");
  });
}

export async function runFullScan(): Promise<void> {
  await withLock("fullScan", async () => {
    await requireAdmin();
    const { runPipeline } = await import("@/lib/pipeline");
    const result = await runPipeline({ maxDeals: 250, maxFilingsPerDeal: 1, daysBack: 730 });
    console.log("[runFullScan]", JSON.stringify(result));
    revalidatePath("/admin/review");
    revalidatePath("/admin");
  });
}

export async function runDiscoveryNow(): Promise<void> {
  await withLock("discoveryUs", async () => {
    await requireAdmin();
    const { discoverNewDeals } = await import("@/lib/discovery");
    const result = await discoverNewDeals({ daysBack: 30, maxFilings: 100 });
    console.log("[runDiscoveryNow]", JSON.stringify(result));
    revalidatePath("/admin/review");
    revalidatePath("/admin");
  });
}

// EU discovery: scans CMA (UK Atom feed) + DG COMP (EU Commission Open Data
// JSON) in parallel and inserts new event-driven cases into the review queue.
export async function runEuDiscoveryNow(): Promise<void> {
  await withLock("discoveryEu", async () => {
    await requireAdmin();
    const { discoverEuDeals } = await import("@/lib/discovery-eu");
    const result = await discoverEuDeals({ daysBack: 30, maxCases: 50 });
    console.log("[runEuDiscoveryNow]", JSON.stringify(result));
    revalidatePath("/admin/review");
    revalidatePath("/admin");
  });
}

// APAC discovery: starts with TDnet (Tokyo). HKEX / ASX / SGX will plug into
// the same orchestrator via Promise.allSettled.
export async function runApacDiscoveryNow(): Promise<void> {
  await withLock("discoveryApac", async () => {
    await requireAdmin();
    const { discoverApacDeals } = await import("@/lib/discovery-apac");
    const result = await discoverApacDeals({ daysBack: 7, maxCases: 30 });
    console.log("[runApacDiscoveryNow]", JSON.stringify(result));
    revalidatePath("/admin/review");
    revalidatePath("/admin");
  });
}

// Retroactive 2nd-pass enrichment for items lacking deal value / per-share
// offer price. Covers BOTH:
//   1) pending review_queue items (proposition.deal.v == TBD || pr.o == 0)
//   2) approved deals (deals.valeur empty/TBD || price.o == 0) whose
//      original source_url survives in deal_updates._creation
//
// Routes each item to the right document fetcher (TDnet/HKEX = the URL
// itself is the PDF; CMA = scrape case page; DG COMP = lookup the
// decision PDF from the Open Data dataset; SEC = skipped, 1st pass had
// full text). Updates in place. Skips already-complete records so we
// don't burn Claude calls re-extracting things.
type EnrichableDeal = {
  nm: string;
  v: string;
  pr: { o: number; sym?: string; cur?: string; ad?: string; u?: number; c?: number };
  [k: string]: unknown;
};

async function resolvePdfUrl(
  sourceUrl: string,
  dgMap: Map<string, string>,
  findCmaCasePdf: (url: string) => Promise<string | null>,
): Promise<string | null> {
  if (!sourceUrl) return null;
  if (
    sourceUrl.includes("release.tdnet.info") ||
    sourceUrl.includes("hkexnews.hk") ||
    sourceUrl.includes("asx.com.au") ||
    sourceUrl.includes("links.sgx.com") ||
    sourceUrl.includes("sgx.com")
  ) {
    return sourceUrl;
  }
  if (sourceUrl.includes("gov.uk/cma-cases")) {
    return await findCmaCasePdf(sourceUrl).catch(() => null);
  }
  if (sourceUrl.includes("competition-cases.ec.europa.eu")) {
    const caseMatch = sourceUrl.match(/\/cases\/(M\.\d+)/);
    if (caseMatch) return dgMap.get(caseMatch[1]) ?? null;
  }
  return null; // SEC / other → skip
}

export async function reEnrichQueueItems(): Promise<void> {
  await withLock("reEnrich", async () => {
    await requireAdmin();
    const admin = createAdminClient();

    const { fetchPdfText } = await import("@/lib/pdf");
    const { enrichDealFromDocument } = await import("@/lib/enrich");
    const { findCmaCasePdf } = await import("@/lib/sources/cma");
    const { fetchDgCompCases } = await import("@/lib/sources/dg-comp");

    // ── Queue side: pending propositions ──────────────────────────────
    const { data: queueItems } = await admin
      .from("review_queue")
      .select("id, proposition, source_url")
      .eq("statut", "en_attente")
      .not("source_url", "is", null);

    // ── Deals side: rows missing value or offer price ─────────────────
    const { data: dealRows } = await admin
      .from("deals")
      .select(
        "id, nom, acquereur, valeur, regulateur, categorie, statut, region, description, ai_commentary, flag, score, close_estimate, price, timeline",
      );

    type DealRow = {
      id: number;
      nom: string;
      acquereur: string | null;
      valeur: string | null;
      regulateur: string | null;
      categorie: string | null;
      statut: string | null;
      region: string | null;
      description: string | null;
      ai_commentary: string | null;
      flag: string | null;
      score: string | null;
      close_estimate: string | null;
      price: { u?: number; c?: number; o?: number; sym?: string; cur?: string; ad?: string } | null;
      timeline: unknown;
    };

    const incompleteDeals = (dealRows ?? []).filter((row) => {
      const r = row as DealRow;
      const needsValue = !r.valeur || r.valeur === "TBD" || r.valeur === "";
      const needsPrice = !r.price || !r.price.o || r.price.o === 0;
      return needsValue || needsPrice;
    });

    // Build source-URL map for incomplete deals from deal_updates._creation
    const dealIds = incompleteDeals.map((r) => (r as DealRow).id);
    const dealSourceMap = new Map<number, string>();
    if (dealIds.length > 0) {
      const { data: creations } = await admin
        .from("deal_updates")
        .select("deal_id, source_url")
        .eq("champ_modifie", "_creation")
        .not("source_url", "is", null)
        .in("deal_id", dealIds);
      for (const c of (creations ?? []) as Array<{ deal_id: number; source_url: string | null }>) {
        if (c.source_url) dealSourceMap.set(c.deal_id, c.source_url);
      }
    }

    const queueCount = queueItems?.length ?? 0;
    const dealCount = incompleteDeals.length;
    console.log(
      `[reEnrich] candidates queue=${queueCount} deals=${dealCount} (${dealSourceMap.size} of ${dealCount} deals have source_url)`,
    );

    if (queueCount === 0 && dealSourceMap.size === 0) {
      console.log("[reEnrich] nothing to enrich");
      return;
    }

    // Build DG COMP caseNumber → pdfUrl map once (lazy: only if any row
    // we're about to process points at competition-cases.ec.europa.eu).
    const allUrls: string[] = [
      ...(queueItems ?? []).map((r) => String((r as { source_url: string | null }).source_url ?? "")),
      ...Array.from(dealSourceMap.values()),
    ];
    const dgMap = new Map<string, string>();
    if (allUrls.some((u) => u.includes("competition-cases.ec.europa.eu"))) {
      const cases = await fetchDgCompCases({ daysBack: 3650, limit: 5000 }).catch(() => []);
      for (const c of cases) {
        if (c.caseNumber && c.decisionPdfUrl) dgMap.set(c.caseNumber, c.decisionPdfUrl);
      }
      console.log(`[reEnrich] DG COMP pdf map built: ${dgMap.size} entries`);
    }

    let enriched = 0;
    let unchanged = 0;
    let skippedNoPdf = 0;
    let skippedNoName = 0;
    let skippedDupUrl = 0;

    // Skip deals whose name carries no useful signal — saves a Claude call
    // and avoids polluting the audit log with "TBD → TBD" no-ops.
    const isUselessName = (n: string | null | undefined): boolean => {
      const t = (n ?? "").trim().toLowerCase();
      return t === "" || t === "tbd" || t === "unknown" || t === "unknown target";
    };

    // Dedup within the deals pass: if two deal rows share the same
    // _creation source_url (same M&A approved twice into the DB), only
    // enrich one — the second would burn another Claude call on identical
    // input. Track here, scoped to this run.
    const seenSourceUrls = new Set<string>();

    // ── Pass 1: review_queue ──────────────────────────────────────────
    type QueueRow = { id: string; proposition: unknown; source_url: string | null };
    for (const raw of (queueItems ?? []) as QueueRow[]) {
      const prop = raw.proposition as { kind?: string; deal?: EnrichableDeal } | null;
      if (!prop || prop.kind !== "new_deal" || !prop.deal) continue;
      const deal = prop.deal;
      const url = String(raw.source_url ?? "");

      if (isUselessName(deal.nm)) {
        skippedNoName++;
        continue;
      }

      const needsValue = !deal.v || deal.v === "TBD" || deal.v === "";
      const needsPrice = !deal.pr || !deal.pr.o || deal.pr.o === 0;
      if (!needsValue && !needsPrice) continue;

      const pdfUrl = await resolvePdfUrl(url, dgMap, findCmaCasePdf);
      if (!pdfUrl) {
        console.log(`[reEnrich][queue] no pdf for ${deal.nm} :: ${url}`);
        skippedNoPdf++;
        continue;
      }
      const pdfText = await fetchPdfText(pdfUrl).catch(() => "");
      if (!pdfText) {
        console.log(`[reEnrich][queue] empty pdf text :: ${deal.nm} :: ${pdfUrl}`);
        skippedNoPdf++;
        continue;
      }

      const before = `v=${deal.v} pr.o=${deal.pr?.o ?? 0}`;
      const enrichedDeal = await enrichDealFromDocument(
        deal as Parameters<typeof enrichDealFromDocument>[0],
        pdfText,
      );
      const after = `v=${enrichedDeal.v} pr.o=${enrichedDeal.pr?.o ?? 0}`;
      if (before === after) {
        unchanged++;
        continue;
      }
      const { error } = await admin
        .from("review_queue")
        .update({ proposition: { kind: "new_deal", deal: enrichedDeal } })
        .eq("id", raw.id);
      if (error) {
        console.error(`[reEnrich][queue] update failed ${raw.id}: ${error.message}`);
        continue;
      }
      enriched++;
      console.log(`[reEnrich][queue] ENRICHED :: ${deal.nm} :: ${before} → ${after}`);
    }

    // ── Pass 2: deals table (already-approved deals) ──────────────────
    for (const row of incompleteDeals as DealRow[]) {
      const sourceUrl = dealSourceMap.get(row.id);
      if (!sourceUrl) continue; // no traceable origin → can't enrich

      if (isUselessName(row.nom)) {
        skippedNoName++;
        continue;
      }
      if (seenSourceUrls.has(sourceUrl)) {
        skippedDupUrl++;
        continue;
      }
      seenSourceUrls.add(sourceUrl);

      const pdfUrl = await resolvePdfUrl(sourceUrl, dgMap, findCmaCasePdf);
      if (!pdfUrl) {
        console.log(`[reEnrich][deals] no pdf for ${row.nom} :: ${sourceUrl}`);
        skippedNoPdf++;
        continue;
      }
      const pdfText = await fetchPdfText(pdfUrl).catch(() => "");
      if (!pdfText) {
        console.log(`[reEnrich][deals] empty pdf text :: ${row.nom} :: ${pdfUrl}`);
        skippedNoPdf++;
        continue;
      }

      // Convert the DB row to the DealLike shape the enrich helper expects.
      const dealLike = {
        nm: row.nom,
        acq: row.acquereur ?? "",
        v: row.valeur ?? "",
        c: row.categorie ?? "",
        r: row.regulateur ?? "",
        st: row.statut ?? "",
        sc: row.score ?? "G",
        reg: row.region ?? "",
        cl: row.close_estimate ?? "",
        desc: row.description ?? "",
        ai: row.ai_commentary ?? "",
        f: row.flag ?? "",
        pr: {
          u: row.price?.u ?? 0,
          c: row.price?.c ?? 0,
          o: row.price?.o ?? 0,
          sym: row.price?.sym ?? "",
          cur: row.price?.cur ?? "$",
          ad: row.price?.ad ?? "",
        },
        tl: Array.isArray(row.timeline) ? (row.timeline as Array<{ d: string; t: string; x: string }>) : [],
      };
      const before = `v=${dealLike.v} pr.o=${dealLike.pr.o}`;
      const enrichedDeal = await enrichDealFromDocument(dealLike, pdfText);
      const after = `v=${enrichedDeal.v} pr.o=${enrichedDeal.pr.o}`;
      if (before === after) {
        unchanged++;
        continue;
      }
      // Write back the fields the enrich pass can touch.
      const { error } = await admin
        .from("deals")
        .update({
          valeur: enrichedDeal.v,
          price: enrichedDeal.pr,
          close_estimate: enrichedDeal.cl,
          description: enrichedDeal.desc,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (error) {
        console.error(`[reEnrich][deals] update failed ${row.id}: ${error.message}`);
        continue;
      }
      // Audit trail
      await admin.from("deal_updates").insert({
        deal_id: row.id,
        champ_modifie: "_enrich_price",
        ancienne_valeur: before,
        nouvelle_valeur: after,
        source_url: sourceUrl,
        confiance: 80,
        auteur: "ia",
      });
      enriched++;
      console.log(`[reEnrich][deals] ENRICHED :: ${row.nom} :: ${before} → ${after}`);
    }

    console.log(
      `[reEnrich] DONE :: enriched=${enriched} unchanged=${unchanged} ` +
        `skippedNoPdf=${skippedNoPdf} skippedNoName=${skippedNoName} skippedDupUrl=${skippedDupUrl}`,
    );
    revalidatePath("/admin/review");
    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/archive");
  });
}

// Bulk-reject queue items whose target name carries no useful signal —
// "TBD" / "" / "Unknown" / "Unknown target". Discovery sometimes inserts
// these when the source headline says e.g. "(連結子会社の異動)" without
// disclosing the target, and they pile up in /admin/review. A single
// click clears them instead of N per-row rejects.
export async function rejectAllTbd(): Promise<void> {
  await withLock("rejectAllTbd", async () => {
    await requireAdmin();
    const admin = createAdminClient();
    const { data: items, error } = await admin
      .from("review_queue")
      .select("id, proposition")
      .eq("statut", "en_attente");
    if (error) {
      console.error("[rejectAllTbd] query failed:", error.message);
      return;
    }
    const isUseless = (n: string | null | undefined): boolean => {
      const t = (n ?? "").trim().toLowerCase();
      return t === "" || t === "tbd" || t === "unknown" || t === "unknown target";
    };
    const toReject: string[] = [];
    for (const item of (items ?? []) as Array<{ id: string; proposition: unknown }>) {
      const prop = item.proposition as
        | { kind?: string; deal?: { nm?: string } }
        | null;
      if (prop?.kind !== "new_deal") continue;
      if (isUseless(prop.deal?.nm)) toReject.push(item.id);
    }
    if (toReject.length === 0) {
      console.log("[rejectAllTbd] no TBD items to reject");
      return;
    }
    const { error: upErr } = await admin
      .from("review_queue")
      .update({ statut: "rejete" })
      .in("id", toReject);
    if (upErr) {
      console.error("[rejectAllTbd] update failed:", upErr.message);
      return;
    }
    console.log(`[rejectAllTbd] rejected ${toReject.length} TBD items`);
    revalidatePath("/admin/review");
    revalidatePath("/admin");
  });
}

// ══════════════════════════════════════════════════════════════════════
// Phase 5 — Historical backfill (DG COMP)
//
// Walks the DG COMP Open Data JSON (~10k cases since 1990), fetches the
// decision PDF for each, runs a focused Claude extraction with the
// outcome already known ("Closed"), and inserts directly into the
// deals table (no review_queue — these aren't candidates, they're
// settled historical events).
//
// Idempotent: dedupes against existing deals by normalized name AND
// against any DG COMP URL already in deal_updates.source_url. Rate-
// limits Claude calls to stay within Tier 1 (~50 req/min). Processes a
// fixed batch per click so each run takes ~6 min and you can do
// incremental nights.
// ══════════════════════════════════════════════════════════════════════

const HISTORICAL_BATCH_SIZE = 300;
const HISTORICAL_RATE_LIMIT_MS = 1200; // ~50 req/min

const HISTORICAL_DG_COMP_PROMPT = `You receive a DG COMP (EU Commission Directorate-General for Competition) merger case with the full text of its decision PDF. The case is CLOSED — the outcome (cleared / cleared with remedies / blocked) is already in the document. Extract the deal as a settled historical event-driven situation.

# Output

JSON only, no markdown fences, no preface, no suffix:

\`\`\`json
{
  "is_deal": true | false,
  "deal": {
    "nm": "Target Company",
    "acq": "Acquirer Company",
    "v": "€2.5B",
    "c": "MERGER" | "DISTRESSED" | "SPINOFF" | "REORG" | "TENDER",
    "r": "DG COMP",
    "st": "Closed" | "Blocked",
    "sc": "G" | "A" | "R",
    "reg": "EU",
    "cl": "MMM YYYY",
    "desc": "1-2 factual sentences about what the deal was and how it was resolved.",
    "ai": "1 analytical sentence on what the decision tells us (precedent / remedy type / market signal).",
    "f": "🇪🇺" | "🇫🇷" | "🇩🇪" | "🇮🇹" | "🇪🇸" | "🇳🇱" | etc.,
    "pr": { "u": 0, "c": 0, "o": 0, "sym": "", "cur": "€", "ad": "MMM YYYY" },
    "tl": [{ "d": "MMM YYYY", "t": "NOTIFIED", "x": "..." }, { "d": "MMM YYYY", "t": "CLEARED", "x": "..." }]
  }
}
\`\`\`

# Rules

- **st (status)**: \`Closed\` if cleared (with or without conditions/remedies). \`Blocked\` only if explicitly prohibited.
- **sc (score color)**: \`G\` = cleared without remedies, \`A\` = cleared with commitments / Phase II remedies, \`R\` = blocked.
- **f (flag)**: country flag if a single nationality dominates the deal; \`🇪🇺\` for cross-border / EU-wide deals.
- **v** (transaction value): "€X.XB" / "€XM" if disclosed in the decision text; "TBD" otherwise.
- **pr.ad** (announcement date): "MMM YYYY" of the notification — provided in the user message.
- **cl** (close date): "MMM YYYY" of the final clearance / decision date.
- **tl** (timeline): 2-3 entries minimum — NOTIFIED → (PHASE II if applicable) → CLEARED / BLOCKED with brief descriptions.
- **desc** + **ai** in English, factual, no speculation.
- If the document is actually a withdrawal, a no-jurisdiction finding, or a referral to a member state — return \`{"is_deal": false, "deal": null}\`.

# CRITICAL OUTPUT FORMAT

- FIRST char MUST be \`{\`.
- LAST char MUST be \`}\`.
- NO markdown fences, NO prose.
- Output is fed directly to JSON.parse().`;

type HistoricalDeal = {
  is_deal: boolean;
  deal: {
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
  } | null;
};

function normalizeName(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[,.()]/g, "")
    .replace(/\s+(inc|corp|corporation|holdings|group|ltd|plc|ag|sa|nv|co|company|llc|llp|trust|reit|sas|gmbh|spa|kgaa)\.?$/i, "")
    .trim();
}

export async function runDgCompHistoricalBatch(): Promise<void> {
  await withLock("dgCompBackfill", async () => {
    await requireAdmin();
    const admin = createAdminClient();

    const { fetchDgCompCases } = await import("@/lib/sources/dg-comp");
    const { fetchPdfText } = await import("@/lib/pdf");
    const { getAnthropic, EXTRACTION_MODEL, parseClaudeJson } = await import("@/lib/anthropic");

    // 1. Pull the full dataset (no date filter — we want history)
    const cases = await fetchDgCompCases({ daysBack: 365 * 50, limit: 50000 }).catch((e) => {
      console.error(`[dgCompBackfill] fetch failed: ${(e as Error).message}`);
      return [];
    });
    console.log(`[dgCompBackfill] fetched ${cases.length} DG COMP cases total`);
    if (cases.length === 0) return;

    // 2. Build dedup indexes
    const { data: existing } = await admin.from("deals").select("nom");
    const existingNames = new Set<string>();
    for (const d of (existing ?? []) as Array<{ nom: string }>) {
      existingNames.add(normalizeName(d.nom));
    }

    const { data: processed } = await admin
      .from("deal_updates")
      .select("source_url")
      .like("source_url", "%competition-cases.ec.europa.eu%");
    const processedUrls = new Set<string>();
    for (const r of (processed ?? []) as Array<{ source_url: string | null }>) {
      if (r.source_url) processedUrls.add(r.source_url);
    }

    // 3. Filter: must have a decision PDF + not already processed
    const todo = cases.filter(
      (c) => c.decisionPdfUrl && !processedUrls.has(c.url),
    );
    console.log(
      `[dgCompBackfill] todo=${todo.length} (after pdf+url filter from ${cases.length}); ` +
        `existing deals=${existingNames.size}, processed urls=${processedUrls.size}`,
    );

    // 4. Take the batch
    const batch = todo.slice(0, HISTORICAL_BATCH_SIZE);
    console.log(`[dgCompBackfill] processing batch of ${batch.length} this click`);

    let inserted = 0;
    let skippedDup = 0;
    let skippedNotDeal = 0;
    let skippedNoPdf = 0;
    let errors = 0;

    // Cache nextId locally — refresh from DB on each insert to avoid races
    // would be safer but slower; the lock prevents concurrent runs so a
    // simple monotonic counter starting from MAX(id) is fine.
    const { data: maxRow } = await admin
      .from("deals")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    let nextId = ((maxRow?.id as number | undefined) ?? 0) + 1;

    const anthropic = getAnthropic();

    for (let i = 0; i < batch.length; i++) {
      const c = batch[i];

      // Pre-fetch dedup by case title (cheap, avoids burning Claude on
      // names we already have)
      if (existingNames.has(normalizeName(c.title))) {
        skippedDup++;
        continue;
      }

      try {
        const pdfText = await fetchPdfText(c.decisionPdfUrl as string).catch(() => "");
        if (!pdfText || pdfText.length < 500) {
          skippedNoPdf++;
          continue;
        }

        const userMsg = `DG COMP CASE
Number: ${c.caseNumber ?? "(unknown)"}
Title: ${c.title}
Notified: ${c.date}
Case URL: ${c.url}

DECISION PDF TEXT (truncated):
${pdfText}`;

        const res = await anthropic.messages.create({
          model: EXTRACTION_MODEL,
          max_tokens: 1500,
          system: [
            { type: "text", text: HISTORICAL_DG_COMP_PROMPT, cache_control: { type: "ephemeral" } },
          ],
          messages: [{ role: "user", content: userMsg }],
        });
        const block = res.content[0];
        const responseText = block && block.type === "text" ? block.text : "";
        const parsed = parseClaudeJson<HistoricalDeal>(responseText);

        if (!parsed || !parsed.is_deal || !parsed.deal) {
          skippedNotDeal++;
          continue;
        }
        const d = parsed.deal;
        const targetKey = normalizeName(d.nm);
        if (!targetKey || existingNames.has(targetKey)) {
          skippedDup++;
          continue;
        }

        const payload = {
          id: nextId,
          nom: d.nm,
          acquereur: d.acq,
          valeur: d.v ?? "TBD",
          regulateur: d.r ?? "DG COMP",
          categorie: d.c ?? "MERGER",
          statut: "Closed",
          region: "EU",
          description: d.desc ?? null,
          ai_commentary: d.ai ?? null,
          min_tier: "analyst",
          flag: d.f ?? "🇪🇺",
          score: d.sc ?? "G",
          close_estimate: d.cl ?? c.date.slice(0, 7),
          price: d.pr ?? { u: 0, c: 0, o: 0, sym: "", cur: "€", ad: c.date.slice(0, 7) },
          timeline: d.tl ?? [],
          spread: 0,
          proba_close: 100,
          ev: 0,
        };

        const { error: insErr } = await admin.from("deals").insert(payload);
        if (insErr) {
          console.error(`[dgCompBackfill] insert failed ${c.caseNumber}: ${insErr.message}`);
          errors++;
          continue;
        }

        await admin.from("deal_updates").insert({
          deal_id: nextId,
          champ_modifie: "_creation",
          ancienne_valeur: null,
          nouvelle_valeur: `Historical backfill from DG COMP ${c.caseNumber ?? ""}: ${d.nm} / ${d.acq ?? "?"}`,
          source_url: c.url,
          confiance: 90,
          auteur: "ia",
        });

        existingNames.add(targetKey);
        processedUrls.add(c.url);
        inserted++;
        nextId++;

        if (inserted % 10 === 0) {
          console.log(
            `[dgCompBackfill] progress ${i + 1}/${batch.length} :: ` +
              `inserted=${inserted} dup=${skippedDup} notDeal=${skippedNotDeal} ` +
              `noPdf=${skippedNoPdf} errors=${errors}`,
          );
        }
      } catch (e) {
        errors++;
        console.error(`[dgCompBackfill] ${c.caseNumber} error: ${(e as Error).message}`);
      }

      // Rate limit ~50 req/min (Anthropic Tier 1)
      if (i < batch.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, HISTORICAL_RATE_LIMIT_MS));
      }
    }

    console.log(
      `[dgCompBackfill] DONE :: inserted=${inserted} dup=${skippedDup} notDeal=${skippedNotDeal} ` +
        `noPdf=${skippedNoPdf} errors=${errors} remaining≈${todo.length - batch.length}`,
    );
    revalidatePath("/admin/review");
    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/archive");
  });
}
