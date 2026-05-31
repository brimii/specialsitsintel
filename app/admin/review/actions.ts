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

// Retroactive 2nd-pass enrichment for pending review_queue items.
// Only touches items where v is empty/TBD OR pr.o is 0 — we don't burn
// Claude calls re-extracting already-complete proposals. Routes each item
// to the right document fetcher based on the source URL pattern, runs
// enrich, and writes the updated proposition back into the queue row.
export async function reEnrichQueueItems(): Promise<void> {
  await withLock("reEnrich", async () => {
    await requireAdmin();
    const admin = createAdminClient();
    const { data: items, error } = await admin
      .from("review_queue")
      .select("id, proposition, source_url")
      .eq("statut", "en_attente")
      .not("source_url", "is", null);
    if (error) {
      console.error("[reEnrich] query failed:", error.message);
      return;
    }
    if (!items?.length) {
      console.log("[reEnrich] no pending items with source_url");
      return;
    }

    const { fetchPdfText } = await import("@/lib/pdf");
    const { enrichDealFromDocument } = await import("@/lib/enrich");
    const { findCmaCasePdf } = await import("@/lib/sources/cma");
    const { fetchDgCompCases } = await import("@/lib/sources/dg-comp");

    // DG COMP PDF URLs aren't stored on the queue row; if we need any,
    // re-fetch the dataset once and build a caseNumber → pdfUrl map.
    const dgCompUrls = items.filter((r) => {
      const u = String((r as { source_url: string | null }).source_url ?? "");
      return u.includes("competition-cases.ec.europa.eu");
    });
    const dgMap = new Map<string, string>();
    if (dgCompUrls.length > 0) {
      const cases = await fetchDgCompCases({ daysBack: 3650, limit: 5000 }).catch(() => []);
      for (const c of cases) {
        if (c.caseNumber && c.decisionPdfUrl) dgMap.set(c.caseNumber, c.decisionPdfUrl);
      }
      console.log(`[reEnrich] DG COMP pdf map built: ${dgMap.size} entries`);
    }

    let scanned = 0;
    let skippedComplete = 0;
    let skippedNoPdf = 0;
    let enriched = 0;
    let unchanged = 0;

    type QueueRow = { id: string; proposition: unknown; source_url: string | null };
    type DealShape = {
      nm: string;
      v: string;
      pr: { o: number; sym?: string; cur?: string; ad?: string; u?: number; c?: number };
      [k: string]: unknown;
    };

    for (const raw of items as QueueRow[]) {
      scanned++;
      const prop = raw.proposition as { kind?: string; deal?: DealShape } | null;
      if (!prop || prop.kind !== "new_deal" || !prop.deal) continue;
      const deal = prop.deal;
      const url = String(raw.source_url ?? "");

      const needsValue = !deal.v || deal.v === "TBD" || deal.v === "";
      const needsPrice = !deal.pr || !deal.pr.o || deal.pr.o === 0;
      if (!needsValue && !needsPrice) {
        skippedComplete++;
        continue;
      }

      let pdfUrl: string | null = null;
      if (url.includes("release.tdnet.info") || url.includes("hkexnews.hk")) {
        pdfUrl = url; // already a PDF
      } else if (url.includes("gov.uk/cma-cases")) {
        pdfUrl = await findCmaCasePdf(url).catch(() => null);
      } else if (url.includes("competition-cases.ec.europa.eu")) {
        const caseMatch = url.match(/\/cases\/(M\.\d+)/);
        if (caseMatch) pdfUrl = dgMap.get(caseMatch[1]) ?? null;
      } else {
        // SEC and other sources: skip — 1st pass already had full text.
        skippedNoPdf++;
        continue;
      }
      if (!pdfUrl) {
        console.log(`[reEnrich] no pdf for ${deal.nm} :: ${url}`);
        skippedNoPdf++;
        continue;
      }

      const pdfText = await fetchPdfText(pdfUrl).catch(() => "");
      if (!pdfText) {
        console.log(`[reEnrich] empty pdf text :: ${deal.nm} :: ${pdfUrl}`);
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
        console.log(`[reEnrich] no change :: ${deal.nm} :: ${before}`);
        continue;
      }

      const { error: upErr } = await admin
        .from("review_queue")
        .update({ proposition: { kind: "new_deal", deal: enrichedDeal } })
        .eq("id", raw.id);
      if (upErr) {
        console.error(`[reEnrich] update failed ${raw.id}: ${upErr.message}`);
        continue;
      }
      enriched++;
      console.log(`[reEnrich] ENRICHED :: ${deal.nm} :: ${before} → ${after}`);
    }

    console.log(
      `[reEnrich] scanned=${scanned} enriched=${enriched} unchanged=${unchanged} ` +
        `skippedComplete=${skippedComplete} skippedNoPdf=${skippedNoPdf}`,
    );
    revalidatePath("/admin/review");
    revalidatePath("/admin");
  });
}
