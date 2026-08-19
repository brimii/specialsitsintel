-- ════════════════════════════════════════════════════════════
-- SpecialSitsIntel — Market data cache + API usage counter
-- À coller dans l'éditeur SQL Supabase après 0003_tier_policy.sql.
--
-- market_prices : cache TTL 15min des prix live/EOD par ticker. Évite de
--   re-taper Yahoo / Twelve Data / Finnhub à chaque render de /.
--
-- api_usage : compteur quotidien par provider pour hard-stop avant de
--   dépasser les free tiers (Twelve Data 800/j, Alpha Vantage 25/j).
--   Reset natif via la clé composite (provider, day).
-- ════════════════════════════════════════════════════════════

create table if not exists public.market_prices (
  ticker text primary key,
  exchange text,
  price numeric(18, 6),
  currency text,
  provider text,
  fetched_at timestamptz not null default now()
);

create index if not exists market_prices_fetched_at_idx
  on public.market_prices (fetched_at);

create table if not exists public.api_usage (
  provider text not null,
  day date not null,
  count integer not null default 0,
  primary key (provider, day)
);

create index if not exists api_usage_day_idx
  on public.api_usage (day);

-- Toutes les écritures sont faites côté serveur avec le service_role
-- (bypass RLS). On enable RLS quand même en défense en profondeur pour
-- interdire tout accès direct depuis le browser.
alter table public.market_prices enable row level security;
alter table public.api_usage enable row level security;

-- Grants explicites pour service_role (comme dans les autres migrations).
grant select, insert, update, delete on public.market_prices to service_role;
grant select, insert, update, delete on public.api_usage to service_role;
