"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";

const TIERS = new Set(["free", "analyst", "institutional", "enterprise"]);

export async function changeDealMinTier(formData: FormData) {
  await requireAdmin();
  const dealId = Number(formData.get("deal_id"));
  const minTier = String(formData.get("min_tier") ?? "");
  if (!dealId || !TIERS.has(minTier)) return;
  const admin = createAdminClient();
  await admin.from("deals").update({ min_tier: minTier }).eq("id", dealId);
  revalidatePath("/admin/deals");
  revalidatePath("/"); // l'aperçu free peut changer
}
