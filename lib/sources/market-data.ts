import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

// ════════════════════════════════════════════════════════════════════
// Market data waterfall — Yahoo → Finnhub (US) → Twelve Data → Alpha Vantage
//
// Design:
// - Cache-first via public.market_prices (TTL 15 min). Reads that hit the
//   cache never touch a provider.
// - Batch endpoints wherever the provider allows (Yahoo ~1000/call,
//   Twelve Data 8/call). Reduces daily quota consumption by 20-200×.
// - Route by exchange: Finnhub for US real-time, Yahoo for everywhere
//   else in free tier, Twelve Data as universal fallback, Alpha Vantage
//   reserved for tiny historical batches.
// - Daily counter in public.api_usage — hard-stop at 90% of each free
//   quota so a runaway loop can't nuke the day.
// ════════════════════════════════════════════════════════════════════

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

// Free-tier daily quotas (safety margin baked in — hard-stop at 90%).
const QUOTAS: Record<string, number> = {
  yahoo: Number.POSITIVE_INFINITY, // no official cap, but 429 if hammered — throttled by call spacing
  finnhub: Number.POSITIVE_INFINITY, // 60/min cap enforced at call time, no daily cap
  twelvedata: 800,
  alphavantage: 25,
};

export type MarketPrice = {
  ticker: string;
  exchange?: string;
  price: number;
  currency: string;
  provider: string;
  fetchedAt: string; // ISO
};

// ── Ticker normalisation per provider ─────────────────────────────────
// Different providers use different exchange suffixes. Our internal
// ticker (`deal.pr.sym`) is stored as the "native" exchange code
// (e.g. "7203" for Tokyo, "00700" for HKEX, "BHP" for ASX). We enrich
// it with the right suffix per provider.

type ExchangeHint =
  | "NYSE"
  | "NASDAQ"
  | "LSE"
  | "TSE"
  | "HKEX"
  | "ASX"
  | "SGX"
  | "EURONEXT"
  | "XETRA"
  | "TSX"
  | "US"
  | "UNKNOWN";

// Guess exchange from source + flag combination. Source badges (from
// bucketSourceFromUrl) give us the discovery feed; the flag disambiguates
// within a source (SEC covers US listings, CMA covers UK, etc.).
export function guessExchange(
  source: string | undefined,
  flag: string | undefined,
): ExchangeHint {
  if (source === "SEC" || flag === "🇺🇸" || flag === "🇨🇦") return "US";
  if (source === "CMA" || flag === "🇬🇧") return "LSE";
  if (source === "TDnet" || flag === "🇯🇵") return "TSE";
  if (source === "HKEX" || flag === "🇭🇰" || flag === "🇨🇳") return "HKEX";
  if (source === "ASX" || flag === "🇦🇺" || flag === "🇳🇿") return "ASX";
  if (source === "SGX" || flag === "🇸🇬") return "SGX";
  if (source === "DG COMP") {
    if (flag === "🇩🇪") return "XETRA";
    if (flag === "🇫🇷" || flag === "🇳🇱" || flag === "🇧🇪") return "EURONEXT";
    return "EURONEXT";
  }
  return "UNKNOWN";
}

// Normalise a raw ticker string before applying an exchange suffix.
// Handles composite entries ("CRBG / EQH" → "CRBG") we sometimes see
// on multi-party deals + strips whitespace / any stray suffix.
function cleanTickerBase(ticker: string): string {
  const first = ticker.split(/[\/,;]/)[0]?.trim() ?? "";
  return first.toUpperCase().replace(/\s+/g, "");
}

function toYahooSymbol(ticker: string, exchange: ExchangeHint): string {
  const t = cleanTickerBase(ticker);
  switch (exchange) {
    case "LSE":
      return t.endsWith(".L") ? t : `${t}.L`;
    case "TSE":
      return t.match(/\.T$/i) ? t : `${t}.T`;
    case "HKEX": {
      // Shanghai A-share (6-digit code starting with 6) ends up here when
      // classified as "HKEX" by our flag heuristic — actually needs .SS.
      // Shenzhen A-share (6-digit starting with 0/3) needs .SZ.
      if (/^\d{6}$/.test(t)) {
        if (t.startsWith("6")) return `${t}.SS`;
        return `${t}.SZ`;
      }
      // Genuine HKEX: pad to 4 digits, not strip. "00513" → "0513", not "513".
      const digits = t.replace(/\D/g, "");
      const padded = digits.padStart(4, "0").slice(-4);
      return `${padded}.HK`;
    }
    case "ASX":
      return t.endsWith(".AX") ? t : `${t}.AX`;
    case "SGX":
      return t.endsWith(".SI") ? t : `${t}.SI`;
    case "XETRA":
      return t.endsWith(".DE") ? t : `${t}.DE`;
    case "EURONEXT":
      return t.endsWith(".PA") || t.endsWith(".AS") ? t : `${t}.PA`;
    case "TSX":
      return t.endsWith(".TO") ? t : `${t}.TO`;
    default:
      return t; // US / unknown → naked ticker
  }
}

// Twelve Data accepts several symbol formats. We cascade through them
// per ticker (first one that returns a valid quote wins) because the
// free-tier index has gaps that vary by exchange.
function toTwelveDataSymbolCandidates(ticker: string, exchange: ExchangeHint): string[] {
  const t = cleanTickerBase(ticker);
  const micMap: Partial<Record<ExchangeHint, string>> = {
    LSE: "XLON",
    TSE: "XTKS",
    HKEX: "XHKG",
    ASX: "XASX",
    SGX: "XSES",
    XETRA: "XETR",
    EURONEXT: "XPAR",
    TSX: "XTSE",
  };
  const yahooSuffixMap: Partial<Record<ExchangeHint, string>> = {
    LSE: ".L",
    TSE: ".T",
    HKEX: ".HK",
    ASX: ".AX",
    SGX: ".SI",
    XETRA: ".DE",
    EURONEXT: ".PA",
    TSX: ".TO",
  };
  const candidates: string[] = [];
  const mic = micMap[exchange];
  const yahoo = yahooSuffixMap[exchange];
  if (mic) candidates.push(`${t}:${mic}`);
  if (yahoo) candidates.push(`${t}${yahoo}`);
  candidates.push(t); // naked
  return candidates;
}

// ── Cache layer ───────────────────────────────────────────────────────

async function readCache(tickers: string[]): Promise<Map<string, MarketPrice>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("market_prices")
    .select("ticker, exchange, price, currency, provider, fetched_at")
    .in("ticker", tickers);
  const cutoff = Date.now() - CACHE_TTL_MS;
  const out = new Map<string, MarketPrice>();
  for (const row of (data ?? []) as Array<{
    ticker: string;
    exchange: string | null;
    price: number;
    currency: string | null;
    provider: string | null;
    fetched_at: string;
  }>) {
    if (new Date(row.fetched_at).getTime() < cutoff) continue;
    out.set(row.ticker, {
      ticker: row.ticker,
      exchange: row.exchange ?? undefined,
      price: row.price,
      currency: row.currency ?? "USD",
      provider: row.provider ?? "cache",
      fetchedAt: row.fetched_at,
    });
  }
  return out;
}

async function writeCache(prices: MarketPrice[]): Promise<void> {
  if (prices.length === 0) return;
  const admin = createAdminClient();
  const rows = prices.map((p) => ({
    ticker: p.ticker,
    exchange: p.exchange ?? null,
    price: p.price,
    currency: p.currency,
    provider: p.provider,
    fetched_at: p.fetchedAt,
  }));
  const { error } = await admin.from("market_prices").upsert(rows, { onConflict: "ticker" });
  if (error) console.error("[market-data] cache write failed:", error.message);
}

// ── Daily usage counter ───────────────────────────────────────────────

async function checkQuota(provider: string, need: number): Promise<boolean> {
  const cap = QUOTAS[provider];
  if (!Number.isFinite(cap)) return true;
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from("api_usage")
    .select("count")
    .eq("provider", provider)
    .eq("day", today)
    .maybeSingle();
  const used = ((data?.count as number | undefined) ?? 0) + need;
  const safeCap = Math.floor(cap * 0.9); // 10% safety margin
  return used <= safeCap;
}

async function bumpUsage(provider: string, delta: number): Promise<void> {
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from("api_usage")
    .select("count")
    .eq("provider", provider)
    .eq("day", today)
    .maybeSingle();
  const prev = (data?.count as number | undefined) ?? 0;
  await admin
    .from("api_usage")
    .upsert(
      { provider, day: today, count: prev + delta },
      { onConflict: "provider,day" },
    );
}

// ── Provider fetchers ────────────────────────────────────────────────

// Yahoo Finance chart endpoint — per-symbol, no auth needed. Yahoo
// hardened its /v7/finance/quote batch endpoint in 2024 (crumb + cookie
// dance now required), but /v8/finance/chart/{symbol} still returns
// quote data unauthenticated. We parallelise with Promise.all in chunks
// to keep total wall-clock reasonable for 100-200 tickers (~2-4s at 15
// concurrent).
const YAHOO_CONCURRENCY = 15;

async function fetchYahooOne(
  ticker: string,
  symbol: string,
): Promise<MarketPrice | null> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=1d&range=1d`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: {
            regularMarketPrice?: number;
            currency?: string;
            symbol?: string;
          };
        }>;
      };
    };
    const meta = body.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") return null;
    return {
      ticker,
      price: meta.regularMarketPrice,
      currency: meta.currency ?? "USD",
      provider: "yahoo",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function fetchYahooBatch(
  tickerToSymbol: Map<string, string>,
): Promise<Map<string, MarketPrice>> {
  const entries = Array.from(tickerToSymbol.entries());
  if (entries.length === 0) return new Map();
  const out = new Map<string, MarketPrice>();
  // Chunked Promise.all — 15 concurrent per wave, ~1-2s per wave.
  for (let i = 0; i < entries.length; i += YAHOO_CONCURRENCY) {
    const wave = entries.slice(i, i + YAHOO_CONCURRENCY);
    const results = await Promise.all(
      wave.map(([ticker, symbol]) => fetchYahooOne(ticker, symbol)),
    );
    for (const p of results) if (p) out.set(p.ticker, p);
  }

  // Retry pass 1: naked ticker for suffix-guessed tickers that failed.
  // Catches the "wrong exchange" case where a deal flagged 🇬🇧 (guessed
  // LSE) actually targets a US company (MKC, GETY, PLD, LEG on NYSE).
  const nakedRetry = entries.filter(([ticker, symbol]) => {
    if (out.has(ticker)) return false;
    const base = cleanTickerBase(ticker);
    return symbol !== base;
  });
  if (nakedRetry.length > 0) {
    console.log(`[market-data] yahoo retry naked: ${nakedRetry.length} tickers`);
    for (let i = 0; i < nakedRetry.length; i += YAHOO_CONCURRENCY) {
      const wave = nakedRetry.slice(i, i + YAHOO_CONCURRENCY);
      const results = await Promise.all(
        wave.map(([ticker]) => fetchYahooOne(ticker, cleanTickerBase(ticker))),
      );
      for (const p of results) if (p) out.set(p.ticker, p);
    }
  }

  // Retry pass 2: LSE suffix for EURONEXT-guessed tickers still missing.
  // Many "European" deals surfaced by DG COMP actually target UK-listed
  // targets (Schroders SDR = SDR.L, not SDR / SDR.PA).
  const lseRetry = entries.filter(([ticker, symbol]) => {
    if (out.has(ticker)) return false;
    return /\.PA$|\.AS$/.test(symbol); // was tried as Euronext
  });
  if (lseRetry.length > 0) {
    console.log(`[market-data] yahoo retry LSE: ${lseRetry.length} tickers`);
    for (let i = 0; i < lseRetry.length; i += YAHOO_CONCURRENCY) {
      const wave = lseRetry.slice(i, i + YAHOO_CONCURRENCY);
      const results = await Promise.all(
        wave.map(([ticker]) => fetchYahooOne(ticker, `${cleanTickerBase(ticker)}.L`)),
      );
      for (const p of results) if (p) out.set(p.ticker, p);
    }
  }

  console.log(`[market-data] yahoo returned ${out.size}/${entries.length} prices`);
  return out;
}

// Twelve Data per-ticker quote with symbol-format cascade. For each ticker
// we try the candidate formats in order (MIC → Yahoo suffix → naked) and
// stop at the first that returns a real quote. Free-tier index has gaps
// that vary by exchange (some listings only under MIC, some only under
// Yahoo suffix), so the cascade is what unlocks TSE/ASX modern tickers.
async function fetchTwelveDataBatch(
  tickerToCandidates: Map<string, string[]>,
): Promise<Map<string, MarketPrice>> {
  const out = new Map<string, MarketPrice>();
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) return out;
  const entries = Array.from(tickerToCandidates.entries());
  if (entries.length === 0) return out;
  const now = new Date().toISOString();
  let sampleLogged = false;

  // Free tier is 8 credits/min. Space calls at 7.6s to stay comfortably
  // under the ceiling instead of eating 429 storms mid-batch.
  const MIN_MS_BETWEEN_CALLS = 7600;
  let lastCallAt = 0;
  let rateLimited = false;

  outer: for (const [ticker, candidates] of entries) {
    let resolved = false;
    for (const symbol of candidates) {
      if (resolved) break;
      if (!(await checkQuota("twelvedata", 1))) {
        console.log(`[market-data] twelvedata quota exhausted, stopping`);
        break outer;
      }
      const wait = MIN_MS_BETWEEN_CALLS - (Date.now() - lastCallAt);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastCallAt = Date.now();
      const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        // Rate-limit response doesn't consume daily quota — don't bump.
        // Also abort the whole batch: further calls will just 429 too.
        if (res.status === 429) {
          console.log(`[market-data] twelvedata 429 ${symbol} — aborting batch (rate limit)`);
          rateLimited = true;
          break outer;
        }
        await bumpUsage("twelvedata", 1);
        if (!res.ok) {
          console.log(`[market-data] twelvedata ${res.status} ${symbol}`);
          continue;
        }
        const body = (await res.json()) as {
          close?: string | number;
          currency?: string;
          code?: number;
          status?: string;
          message?: string;
        };
        // Twelve Data returns {code, message, status} on errors even with HTTP 200.
        if (body.code || body.status === "error") {
          if (!sampleLogged) {
            console.log(`[market-data] twelvedata error sample: ${symbol} → ${JSON.stringify(body).slice(0, 200)}`);
            sampleLogged = true;
          }
          continue;
        }
        const raw = body.close;
        if (typeof raw === "undefined") continue;
        const price = typeof raw === "string" ? Number.parseFloat(raw) : raw;
        if (!Number.isFinite(price)) continue;
        out.set(ticker, {
          ticker,
          price,
          currency: body.currency ?? "USD",
          provider: "twelvedata",
          fetchedAt: now,
        });
        resolved = true;
      } catch (e) {
        console.log(`[market-data] twelvedata ${symbol} failed: ${(e as Error).message}`);
      }
    }
  }
  const suffix = rateLimited ? " (rate-limited mid-batch)" : "";
  console.log(`[market-data] twelvedata returned ${out.size}/${entries.length} prices${suffix}`);
  return out;
}

// Finnhub — one call per ticker, US real-time on free tier.
async function fetchFinnhubOne(ticker: string): Promise<MarketPrice | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;
  if (!(await checkQuota("finnhub", 1))) return null;
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`;
    const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    await bumpUsage("finnhub", 1);
    if (!res.ok) return null;
    const body = (await res.json()) as { c?: number };
    if (typeof body.c !== "number" || body.c === 0) return null;
    return {
      ticker,
      price: body.c,
      currency: "USD",
      provider: "finnhub",
      fetchedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.log(`[market-data] finnhub ${ticker} failed: ${(e as Error).message}`);
    return null;
  }
}

// Alpha Vantage — reserved for tiny historical backfills. 25/day.
async function fetchAlphaVantageOne(ticker: string): Promise<MarketPrice | null> {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  if (!apiKey) return null;
  if (!(await checkQuota("alphavantage", 1))) return null;
  try {
    const url =
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
    const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    await bumpUsage("alphavantage", 1);
    if (!res.ok) return null;
    const body = (await res.json()) as { "Global Quote"?: { "05. price"?: string } };
    const raw = body["Global Quote"]?.["05. price"];
    if (!raw) return null;
    const price = Number.parseFloat(raw);
    if (!Number.isFinite(price)) return null;
    return {
      ticker,
      price,
      currency: "USD",
      provider: "alphavantage",
      fetchedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.log(`[market-data] alphavantage ${ticker} failed: ${(e as Error).message}`);
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────

export type PriceRequest = {
  ticker: string; // native ticker as stored in deal.pr.sym
  exchange: ExchangeHint;
};

// Refresh prices for a batch of requests. Cache-first, then waterfall by
// geography. Returns a map ticker → MarketPrice for the ones we could
// resolve. Missing tickers stay off the map (caller decides what to do).
export async function refreshMarketPrices(
  requests: PriceRequest[],
): Promise<Map<string, MarketPrice>> {
  if (requests.length === 0) return new Map();

  // Dedup by ticker
  const uniqueByTicker = new Map<string, PriceRequest>();
  for (const r of requests) {
    if (!r.ticker) continue;
    if (!uniqueByTicker.has(r.ticker)) uniqueByTicker.set(r.ticker, r);
  }

  // Cache check
  const cached = await readCache(Array.from(uniqueByTicker.keys()));
  const misses: PriceRequest[] = [];
  for (const [ticker, req] of uniqueByTicker) {
    if (!cached.has(ticker)) misses.push(req);
  }
  console.log(
    `[market-data] cache: ${cached.size} hits, ${misses.length} misses (${uniqueByTicker.size} unique tickers)`,
  );

  if (misses.length === 0) return cached;

  // Split misses by geography for routing
  const usMisses = misses.filter((r) => r.exchange === "US");
  const nonUsMisses = misses.filter((r) => r.exchange !== "US");

  const results = new Map<string, MarketPrice>(cached);

  // Step 1: Yahoo Finance for everyone (unlimited, batch)
  const yahooMap = new Map<string, string>();
  for (const r of misses) yahooMap.set(r.ticker, toYahooSymbol(r.ticker, r.exchange));
  const yahooResults = await fetchYahooBatch(yahooMap);
  for (const [t, p] of yahooResults) results.set(t, p);

  // Step 2: Finnhub for US misses Yahoo didn't cover
  const finnhubTodo = usMisses.filter((r) => !results.has(r.ticker));
  if (finnhubTodo.length > 0 && process.env.FINNHUB_API_KEY) {
    for (const r of finnhubTodo) {
      const p = await fetchFinnhubOne(r.ticker);
      if (p) results.set(r.ticker, p);
    }
  }

  // Step 3: Twelve Data for non-US misses Yahoo didn't cover
  const tdTodo = nonUsMisses.filter((r) => !results.has(r.ticker));
  if (tdTodo.length > 0 && process.env.TWELVEDATA_API_KEY) {
    const tdMap = new Map<string, string[]>();
    for (const r of tdTodo) tdMap.set(r.ticker, toTwelveDataSymbolCandidates(r.ticker, r.exchange));
    const tdResults = await fetchTwelveDataBatch(tdMap);
    for (const [t, p] of tdResults) results.set(t, p);
  }

  // Step 4: Alpha Vantage as last resort (US only, tiny quota)
  const avTodo = misses.filter((r) => !results.has(r.ticker) && r.exchange === "US");
  if (avTodo.length > 0 && process.env.ALPHAVANTAGE_API_KEY) {
    for (const r of avTodo.slice(0, 5)) {
      // Cap AV usage to 5/call to protect the 25/day budget
      const p = await fetchAlphaVantageOne(r.ticker);
      if (p) results.set(r.ticker, p);
    }
  }

  // Persist all fresh (non-cached) results
  const toPersist: MarketPrice[] = [];
  for (const [ticker, p] of results) {
    if (!cached.has(ticker)) toPersist.push(p);
  }
  await writeCache(toPersist);

  return results;
}

// Convenience: read cached prices without triggering any refresh. Used
// by the deals fetcher to enrich display without inflating the API bill.
export async function readCachedPrices(tickers: string[]): Promise<Map<string, MarketPrice>> {
  if (tickers.length === 0) return new Map();
  return readCache(tickers);
}

// ── Tiering ───────────────────────────────────────────────────────────
// T1 Hot   : material spread + closing/litigation phase → refresh often
// T2 Active: everything still moving (Review, Phase II, Active...) → daily
// T3 Cold  : settled (Closed, Blocked, Dead, Withdrawn...) → skip

const HOT_STATUSES = new Set(["Closing", "Litigation", "Trial", "Closed Won"]);
const COLD_STATUSES = new Set([
  "Rumored",
  "Closed",
  "Blocked",
  "Dead",
  "Terminated",
  "Withdrawn",
  "Cancelled",
  "Canceled",
  "Failed",
  "Won",
]);

export type Tier = "hot" | "active" | "cold";

export function dealTier(row: {
  spread: number | null;
  statut: string | null;
}): Tier {
  const st = row.statut ?? "";
  if (COLD_STATUSES.has(st)) return "cold";
  const s = row.spread ?? 0;
  if (s > 0 && HOT_STATUSES.has(st)) return "hot";
  return "active";
}

// ── End-to-end refresh: pulls tickers from deals, waterfalls, writes back
//
// This is the single source of truth for the refresh flow. Both the
// server-action button and the Vercel cron call it. Callers do their own
// auth check (requireAdmin for the button, CRON_SECRET for the cron).
export type MarketRefreshResult = {
  scanned: number;
  requested: number;
  updated: number;
  errors: number;
  skippedCold: number;
  skippedNoTicker: number;
};

export async function runMarketPriceRefresh(opts?: {
  includeTiers?: Set<Tier>; // default {hot, active}
}): Promise<MarketRefreshResult> {
  const include = opts?.includeTiers ?? new Set<Tier>(["hot", "active"]);
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("deals")
    .select("id, price, flag, region, statut, spread, close_estimate");
  if (error) {
    console.error("[refreshMarketPrices] deals query failed:", error.message);
    return { scanned: 0, requested: 0, updated: 0, errors: 0, skippedCold: 0, skippedNoTicker: 0 };
  }
  type DealRow = {
    id: number;
    price: { sym?: string; cur?: string; u?: number; c?: number; o?: number; ad?: string } | null;
    flag: string | null;
    region: string | null;
    statut: string | null;
    spread: number | null;
    close_estimate: string | null;
  };
  const dealRows = (rows ?? []) as DealRow[];

  const { bucketSourceFromUrl, deriveSourceFromDeal } = await import("@/app/data/deals");
  const dealIds = dealRows.map((r) => r.id);
  const { data: creations } = await admin
    .from("deal_updates")
    .select("deal_id, source_url")
    .eq("champ_modifie", "_creation")
    .in("deal_id", dealIds);
  const sourceByDealId = new Map<number, string>();
  for (const c of (creations ?? []) as Array<{ deal_id: number; source_url: string | null }>) {
    if (c.source_url) sourceByDealId.set(c.deal_id, bucketSourceFromUrl(c.source_url));
  }

  const requests: Array<{ id: number; ticker: string; exchange: ExchangeHint }> = [];
  let skippedCold = 0;
  let skippedNoTicker = 0;
  for (const raw of dealRows) {
    const tier = dealTier(raw);
    if (!include.has(tier)) {
      if (tier === "cold") skippedCold++;
      continue;
    }
    const ticker = raw.price?.sym;
    if (!ticker) {
      skippedNoTicker++;
      continue;
    }
    const source =
      sourceByDealId.get(raw.id) ??
      deriveSourceFromDeal({ f: raw.flag ?? "", reg: raw.region ?? "" });
    const exchange = guessExchange(source, raw.flag ?? undefined);
    requests.push({ id: raw.id, ticker, exchange });
  }

  console.log(
    `[refreshMarketPrices] scanned=${dealRows.length} requesting=${requests.length} ` +
      `(skippedCold=${skippedCold} skippedNoTicker=${skippedNoTicker})`,
  );
  if (requests.length === 0) {
    return {
      scanned: dealRows.length,
      requested: 0,
      updated: 0,
      errors: 0,
      skippedCold,
      skippedNoTicker,
    };
  }

  const prices = await refreshMarketPrices(
    requests.map((r) => ({ ticker: r.ticker, exchange: r.exchange })),
  );
  console.log(`[refreshMarketPrices] got ${prices.size}/${requests.length} prices back`);

  // Diagnostic: which tickers didn't resolve on ANY provider? Group by
  // exchange so we spot patterns (e.g. all 🇨🇳 tickers → HKEX suffix
  // wrong, all 🇸🇦 → provider doesn't cover Tadawul, etc.). Dedup by
  // (exchange, ticker) so N deals sharing one ticker only print once.
  const unresolved = requests.filter((r) => !prices.has(r.ticker));
  if (unresolved.length > 0) {
    const byExchange = new Map<string, Set<string>>();
    for (const r of unresolved) {
      const bucket = byExchange.get(r.exchange) ?? new Set<string>();
      bucket.add(r.ticker);
      byExchange.set(r.exchange, bucket);
    }
    const totalUnique = Array.from(byExchange.values()).reduce((n, s) => n + s.size, 0);
    console.log(
      `[refreshMarketPrices] unresolved=${unresolved.length} rows (${totalUnique} unique tickers) — by exchange:`,
    );
    for (const [ex, tickers] of Array.from(byExchange.entries()).sort(
      (a, b) => b[1].size - a[1].size,
    )) {
      const arr = Array.from(tickers);
      const sample = arr.slice(0, 15).join(", ");
      const more = arr.length > 15 ? ` … +${arr.length - 15} more` : "";
      console.log(`  ${ex} (${arr.length}): ${sample}${more}`);
    }
  }

  // Currency mismatch guard: if the deal's offer was extracted in ¥
  // (JP), £ (UK), €, HK$, A$, etc. but Yahoo returns USD, our ticker
  // matched the wrong instrument (typically a similarly-named US
  // penny stock). Writing that price pollutes pr.c and drops the deal
  // out of the spread average. Guard here at write time.
  const CUR_SYMBOL_TO_ISO: Record<string, string> = {
    "$": "USD",
    "€": "EUR",
    "£": "GBP",
    "¥": "JPY",
    "HK$": "HKD",
    "A$": "AUD",
    "S$": "SGD",
    "CHF": "CHF",
    "CA$": "CAD",
    "SAR": "SAR",
    "AED": "AED",
    "₹": "INR",
    "₩": "KRW",
    "R$": "BRL",
    "$MX": "MXN",
    "R": "ZAR",
  };
  let updated = 0;
  let errors = 0;
  let skippedCurrency = 0;
  for (const req of requests) {
    const price = prices.get(req.ticker);
    if (!price) continue;
    const row = dealRows.find((r) => r.id === req.id);
    if (!row) continue;
    const existingPrice = row.price ?? { u: 0, c: 0, o: 0, sym: "", cur: "$", ad: "" };
    const existingCurSym = existingPrice.cur ?? "$";
    const existingCurIso = CUR_SYMBOL_TO_ISO[existingCurSym] ?? existingCurSym;
    const yahooCurIso = (price.currency ?? "USD").toUpperCase();
    // Only enforce the guard when the deal already carries a non-default
    // currency (i.e. the extractor knew the deal's real currency). A
    // default "$" means we haven't confirmed the currency yet — trust
    // Yahoo. This lets US deals still populate on the first refresh.
    if (existingCurSym !== "$" && existingCurIso !== yahooCurIso) {
      console.log(
        `[refreshMarketPrices] currency mismatch skip :: id=${req.id} sym=${req.ticker} expected=${existingCurIso} got=${yahooCurIso} — likely wrong-ticker match`,
      );
      skippedCurrency++;
      continue;
    }
    // Data model: pr.u = undisturbed (pre-announce baseline, stays as-is),
    // pr.c = current market price (updated every refresh), pr.o = offer.
    // For newly-discovered deals u might be 0 — seed it from c so the
    // PriceChart has a baseline to draw from until a proper historical
    // pre-announce price is backfilled.
    const newPrice = {
      ...existingPrice,
      c: price.price,
      u: (existingPrice.u ?? 0) > 0 ? existingPrice.u : price.price,
      cur: existingPrice.cur && existingPrice.cur !== "$" ? existingPrice.cur : price.currency,
    };
    const { error: upErr } = await admin
      .from("deals")
      .update({ price: newPrice, updated_at: new Date().toISOString() })
      .eq("id", req.id);
    if (upErr) {
      console.error(`[refreshMarketPrices] update failed ${req.id}: ${upErr.message}`);
      errors++;
      continue;
    }
    updated++;
  }

  console.log(
    `[refreshMarketPrices] DONE :: updated=${updated} errors=${errors} skippedCurrency=${skippedCurrency} (of ${requests.length})`,
  );
  return {
    scanned: dealRows.length,
    requested: requests.length,
    updated,
    errors,
    skippedCold,
    skippedNoTicker,
  };
}
