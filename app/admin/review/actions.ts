"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";

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
    // Defensive: fall back on safe defaults so a missing field never crashes the insert.
    const payload = {
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
  console.log("[approveItem] done, revalidating");
  revalidatePath("/admin/review");
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function rejectItem(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const admin = createAdminClient();
  const { error } = await admin.from("review_queue").update({ statut: "rejete" }).eq("id", id);
  if (error) console.error("[rejectItem] failed:", error.message);
  revalidatePath("/admin/review");
}

export async function runPipelineNow(): Promise<void> {
  await requireAdmin();
  const { runPipeline } = await import("@/lib/pipeline");
  const result = await runPipeline({ maxDeals: 10, maxFilingsPerDeal: 2 });
  console.log("[runPipelineNow]", JSON.stringify(result));
  revalidatePath("/admin/review");
  revalidatePath("/admin");
}

export async function runFullScan(): Promise<void> {
  await requireAdmin();
  const { runPipeline } = await import("@/lib/pipeline");
  const result = await runPipeline({ maxDeals: 250, maxFilingsPerDeal: 1, daysBack: 730 });
  console.log("[runFullScan]", JSON.stringify(result));
  revalidatePath("/admin/review");
  revalidatePath("/admin");
}

export async function runDiscoveryNow(): Promise<void> {
  await requireAdmin();
  const { discoverNewDeals } = await import("@/lib/discovery");
  const result = await discoverNewDeals({ daysBack: 30, maxFilings: 100 });
  console.log("[runDiscoveryNow]", JSON.stringify(result));
  revalidatePath("/admin/review");
  revalidatePath("/admin");
}
