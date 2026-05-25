-- ════════════════════════════════════════════════════════════
-- SpecialSitsIntel — Restriction des deals par palier (Phase 1)
-- À coller dans l'éditeur SQL Supabase après 0002_stripe.sql.
-- Défense en profondeur : le filtrage réel se fait aussi côté serveur
-- (lib/deals.ts → getDealsForTier). Cette policy protège tout accès direct
-- au client (anon/authenticated) si jamais il interrogeait la table.
-- ════════════════════════════════════════════════════════════

drop policy if exists "deals_select_by_tier" on public.deals;
create policy "deals_select_by_tier" on public.deals
  for select to authenticated
  using (
    public.tier_rank((select tier from public.profiles where id = auth.uid()))
    >= public.tier_rank(min_tier)
  );
