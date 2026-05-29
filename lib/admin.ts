import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Garde : 404 si l'utilisateur n'est pas connecté ou n'a pas le rôle admin.
// À appeler en haut de chaque page/server-action du dossier /admin.
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (data?.role !== "admin") notFound();
  return { user, supabase };
}
