import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// True si l'auth est configurée (env présents).
export const isSupabaseConfigured = Boolean(url && anon);

// Client Supabase navigateur (clé anon). Stocke la session dans des cookies
// (via @supabase/ssr) pour que le serveur puisse la lire.
// Renvoie null si l'env n'est pas configuré (évite tout crash sans Supabase).
export function createClient() {
  if (!url || !anon) return null;
  return createBrowserClient(url, anon);
}
