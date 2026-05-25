-- ════════════════════════════════════════════════════════════
-- SpecialSitsIntel — Stripe (Phase 1)
-- À coller dans l'éditeur SQL Supabase après 0001_init.sql.
-- ════════════════════════════════════════════════════════════

-- Lie le client Stripe au profil (1 customer par utilisateur)
alter table public.profiles add column if not exists stripe_customer_id text;

-- Permet l'upsert de l'abonnement par son id Stripe (cible de conflit)
create unique index if not exists subscriptions_stripe_subscription_id_key
  on public.subscriptions (stripe_subscription_id);
