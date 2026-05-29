"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";

const TIERS = new Set(["free", "analyst", "institutional", "enterprise"]);
const ROLES = new Set(["user", "admin"]);

export async function changeUserTier(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const tier = String(formData.get("tier") ?? "");
  if (!userId || !TIERS.has(tier)) return;
  const admin = createAdminClient();
  await admin.from("profiles").update({ tier }).eq("id", userId);
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function changeUserRole(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!userId || !ROLES.has(role)) return;
  const admin = createAdminClient();
  await admin.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/admin/users");
}
