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
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const admin = createAdminClient();
  const { data: item } = await admin
    .from("review_queue")
    .select("proposition, source_url, confiance, statut")
    .eq("id", id)
    .single();
  if (!item || item.statut !== "en_attente") return;
  const p = item.proposition as Proposition;

  if (p.kind === "new_deal") {
    // Insertion d'un NOUVEAU deal (mode Découverte)
    const d = p.deal;
    const { data: inserted, error: insErr } = await admin
      .from("deals")
      .insert({
        nom: d.nm,
        acquereur: d.acq,
        valeur: d.v,
        regulateur: d.r,
        categorie: d.c,
        statut: d.st,
        region: d.reg,
        description: d.desc,
        ai_commentary: d.ai,
        min_tier: "analyst",
        flag: d.f,
        score: d.sc,
        close_estimate: d.cl,
        price: d.pr,
        timeline: d.tl,
      })
      .select("id")
      .single();
    if (insErr) {
      console.error("[approve new_deal] insert failed:", insErr.message);
      return;
    }
    if (inserted?.id) {
      await admin.from("deal_updates").insert({
        deal_id: inserted.id,
        champ_modifie: "_creation",
        ancienne_valeur: null,
        nouvelle_valeur: `Nouveau deal créé via Découverte : ${d.nm} / ${d.acq}`,
        source_url: item.source_url,
        confiance: item.confiance,
        auteur: "humain",
      });
    }
  } else {
    // Mise à jour d'un deal existant (mode classique)
    await admin
      .from("deals")
      .update({
        [p.champ_modifie]: parseValue(p.champ_modifie, p.nouvelle_valeur),
        updated_at: new Date().toISOString(),
      })
      .eq("id", p.deal_id);
    await admin.from("deal_updates").insert({
      deal_id: p.deal_id,
      champ_modifie: p.champ_modifie,
      ancienne_valeur: p.ancienne_valeur,
      nouvelle_valeur: p.nouvelle_valeur,
      source_url: item.source_url,
      confiance: item.confiance,
      auteur: "humain",
    });
  }

  await admin.from("review_queue").update({ statut: "approuve" }).eq("id", id);
  revalidatePath("/admin/review");
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function rejectItem(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const admin = createAdminClient();
  await admin.from("review_queue").update({ statut: "rejete" }).eq("id", id);
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

// Mode Découverte : trouve de NOUVEAUX deals event-driven via EDGAR.
export async function runDiscoveryNow(): Promise<void> {
  await requireAdmin();
  const { discoverNewDeals } = await import("@/lib/discovery");
  const result = await discoverNewDeals({ daysBack: 7, maxFilings: 25 });
  console.log("[runDiscoveryNow]", JSON.stringify(result));
  revalidatePath("/admin/review");
  revalidatePath("/admin");
}
