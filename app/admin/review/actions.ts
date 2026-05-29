"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";

type Proposition = {
  deal_id: number;
  champ_modifie: string;
  ancienne_valeur: string | null;
  nouvelle_valeur: string;
  resume?: string;
};

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
  await admin.from("review_queue").update({ statut: "approuve" }).eq("id", id);
  revalidatePath("/admin/review");
  revalidatePath("/admin");
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
  await runPipeline({ maxDeals: 10, maxFilingsPerDeal: 2 });
  revalidatePath("/admin/review");
  revalidatePath("/admin");
}
