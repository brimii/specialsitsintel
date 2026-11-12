// Thin re-export of the v2 data layer. Keeps the old import path
// (`@/lib/deals`) working for every consumer that pre-dates the
// rebuild; the real implementation lives in lib/deals-v2.ts.
export * from "./deals-v2";
