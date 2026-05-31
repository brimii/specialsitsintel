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
  if (sourceUrl.includes("release.tdnet.info") || sourceUrl.includes("hkexnews.hk")) {
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

    // ── Pass 1: review_queue ──────────────────────────────────────────
    type QueueRow = { id: string; proposition: unknown; source_url: string | null };
    for (const raw of (queueItems ?? []) as QueueRow[]) {
      const prop = raw.proposition as { kind?: string; deal?: EnrichableDeal } | null;
      if (!prop || prop.kind !== "new_deal" || !prop.deal) continue;
      const deal = prop.deal;
      const url = String(raw.source_url ?? "");

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
      `[reEnrich] DONE :: enriched=${enriched} unchanged=${unchanged} skippedNoPdf=${skippedNoPdf}`,
    );
    revalidatePath("/admin/review");
    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/archive");
  });
}
