import "server-only";
import { createClient } from "@supabase/supabase-js";

// Client serveur à privilèges (service_role) — IGNORE la RLS.
// Strictement serveur : la clé n'est jamais exposée au navigateur.
// Utilisé pour les lectures/écritures de confiance (ex. lecture des deals
// avant filtrage par palier, webhook Stripe en Phase 1).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase non configuré : définir NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
