import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Garde : 404 si l'utilisateur n'est pas connecté ou n'a pas le rôle admin.
// À appeler en haut de chaque page/server-action du dossier /admin.
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  console.log("[requireAdmin] user.id:", user?.id, "email:", user?.email, "userErr:", userError?.message);
  if (!user) notFound();
  const { data, error: profileError } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .single();
  console.log("[requireAdmin] profile:", data, "profileErr:", profileError?.message);
  if (data?.role !== "admin") notFound();
  return { user, supabase };
}
