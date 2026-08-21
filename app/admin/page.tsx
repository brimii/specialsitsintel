import { createAdminClient } from "@/lib/supabase/server";
import { bucketSourceFromUrl } from "@/app/data/deals";
import { computeSpread, pickMarketAnchor } from "@/lib/deals";

const PRICE: Record<string, number> = { analyst: 150, institutional: 600, enterprise: 2500 };

// Re-export the shared source bucketer under the local name the rest of
// this file used to call. Same behaviour, dedupes the helper.
const sourceLabel = bucketSourceFromUrl;

function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "—";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default async function AdminOverview() {
  const admin = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [profilesRes, subsRes, dealsRes, queueRes, creationsRes, autoPubRes] = await Promise.all([
    admin.from("profiles").select("tier"),
    admin.from("subscriptions").select("tier,status"),
    admin
      .from("deals")
      .select("id, region, statut, valeur, price, close_estimate"),
    admin
      .from("review_queue")
      .select("id, statut, source_url"),
    admin
      .from("deal_updates")
      .select("deal_id, source_url, created_at")
      .eq("champ_modifie", "_creation"),
    admin
      .from("deal_updates")
      .select("deal_id, nouvelle_valeur, created_at")
      .eq("champ_modifie", "_auto_publish")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false }),
  ]);

  const profiles = profilesRes.data ?? [];
  const subs = (subsRes.data ?? []).filter((s) => s.status === "active");
  type DealRow = {
    id: number;
    region: string | null;
    statut: string | null;
    valeur: string | null;
    price: { u?: number; c?: number; o?: number; sym?: string; cur?: string; ad?: string } | null;
    close_estimate?: string | null;
  };
  const deals = (dealsRes.data ?? []) as DealRow[];
  type QueueRow = { id: string; statut: string; source_url: string | null };
  const queue = (queueRes.data ?? []) as QueueRow[];
  type Creation = { deal_id: number; source_url: string | null; created_at: string };
  const creations = (creationsRes.data ?? []) as Creation[];
  type AutoPub = { deal_id: number; nouvelle_valeur: string | null; created_at: string };
  const autoPubs = (autoPubRes.data ?? []) as AutoPub[];

  // ── Headline KPIs ───────────────────────────────────────────────────
  const byTier = profiles.reduce<Record<string, number>>((acc, p) => {
    const t = (p.tier as string) ?? "free";
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});
  const mrr = subs.reduce((sum, s) => sum + (PRICE[s.tier as string] ?? 0), 0);

  const headline = [
    {
      l: "Users",
      v: String(profiles.length),
      s: `free ${byTier.free ?? 0} · analyst ${byTier.analyst ?? 0} · inst ${byTier.institutional ?? 0} · ent ${byTier.enterprise ?? 0}`,
    },
    { l: "Active subs", v: String(subs.length), s: "status = active" },
    { l: "Estimated MRR", v: `€${mrr.toLocaleString("en-US")}`, s: "sum of active tier prices" },
    { l: "Deals in DB", v: String(deals.length), s: "public deals table" },
  ];

  // ── Coverage — by region + by source ────────────────────────────────
  const byRegion: Record<string, number> = { US: 0, EU: 0, APAC: 0, Other: 0 };
  for (const d of deals) {
    const r = (d.region ?? "Other").toUpperCase();
    if (r === "US" || r === "EU" || r === "APAC") byRegion[r]++;
    else byRegion.Other++;
  }

  const creationByDealId = new Map<number, Creation>();
  for (const c of creations) creationByDealId.set(c.deal_id, c);
  const bySource: Record<string, number> = {};
  for (const d of deals) {
    const c = creationByDealId.get(d.id);
    const label = sourceLabel(c?.source_url);
    bySource[label] = (bySource[label] ?? 0) + 1;
  }

  // Last creation per source label
  const latestBySource: Record<string, string> = {};
  for (const c of creations) {
    const label = sourceLabel(c.source_url);
    const cur = latestBySource[label];
    if (!cur || c.created_at > cur) latestBySource[label] = c.created_at;
  }

  // ── Data quality ────────────────────────────────────────────────────
  const isClosed = (s: string | null) => {
    const t = (s ?? "").toLowerCase();
    return t === "closed" || t === "blocked" || t === "dead" || t === "terminated";
  };
  const closedCount = deals.filter((d) => isClosed(d.statut)).length;
  const activeCount = deals.length - closedCount;

  const hasValue = (d: DealRow) =>
    d.valeur != null && d.valeur !== "" && d.valeur.trim().toUpperCase() !== "TBD";
  const hasPrice = (d: DealRow) => (d.price?.o ?? 0) > 0;
  const withValueCount = deals.filter(hasValue).length;
  const withPriceCount = deals.filter(hasPrice).length;
  const pct = (n: number) => (deals.length === 0 ? "—" : `${Math.round((n / deals.length) * 100)}%`);

  // ── Spread coverage funnel — where do we lose deals? ─────────────────
  // Walk the same gate as rowToDeal(): pr.o present → market anchor OK
  // → sane premium. Records the reason each deal drops out so admin
  // can see exactly where coverage bleeds.
  type DealFull = DealRow & { close_estimate?: string | null };
  const activeDeals = deals.filter((d) => !isClosed(d.statut)) as DealFull[];
  let noOffer = 0;
  let noMarket = 0;
  let broken = 0;
  let withSpread = 0;
  for (const d of activeDeals) {
    const price = d.price ?? { u: 0, c: 0, o: 0, sym: "", cur: "$", ad: "" };
    if ((price.o ?? 0) <= 0) {
      noOffer++;
      continue;
    }
    if (pickMarketAnchor(price as never) <= 0) {
      noMarket++;
      continue;
    }
    const s = computeSpread(price as never, d.close_estimate ?? null);
    if (s > 0) withSpread++;
    else broken++;
  }
  const spreadPct = activeDeals.length === 0 ? "—" : `${Math.round((withSpread / activeDeals.length) * 100)}%`;

  // ── Pipeline activity (review queue) ────────────────────────────────
  const queuePending = queue.filter((q) => q.statut === "en_attente").length;
  const queueApproved = queue.filter((q) => q.statut === "approuve").length;
  const queueRejected = queue.filter((q) => q.statut === "rejete").length;
  const queueBySource: Record<string, number> = {};
  for (const q of queue.filter((q) => q.statut === "en_attente")) {
    const label = sourceLabel(q.source_url);
    queueBySource[label] = (queueBySource[label] ?? 0) + 1;
  }
  const pendingSourceBreakdown = Object.entries(queueBySource)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}`)
    .join(" · ") || "—";

  // Break down auto-publications by the field that was updated
  // (statut / spread / close_estimate / ...). nouvelle_valeur is stored
  // as "champ=value" in the marker row so we split on the first "=".
  const autoPubByField: Record<string, number> = {};
  for (const a of autoPubs) {
    const field = (a.nouvelle_valeur ?? "").split("=")[0] || "?";
    autoPubByField[field] = (autoPubByField[field] ?? 0) + 1;
  }
  const autoPubFieldBreakdown = Object.entries(autoPubByField)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}`)
    .join(" · ") || "—";

  return (
    <>
      <div className="port-kpis" style={{ marginBottom: "var(--sp-5)" }}>
        {headline.map((c) => (
          <div className="port-kpi" key={c.l}>
            <div className="port-kpi-l">{c.l}</div>
            <div className="port-kpi-v">{c.v}</div>
            <div className="port-kpi-d">{c.s}</div>
          </div>
        ))}
      </div>

      <DashSection label="Coverage" hint="How the deals table breaks down across regions and discovery sources.">
        <DashCell label="US" value={String(byRegion.US)} hint={`${pct(byRegion.US)} of total`} />
        <DashCell label="EU" value={String(byRegion.EU)} hint={`${pct(byRegion.EU)} of total`} />
        <DashCell label="APAC" value={String(byRegion.APAC)} hint={`${pct(byRegion.APAC)} of total`} />
        <DashCell
          label="By source"
          value={String(Object.keys(bySource).length)}
          hint={
            Object.entries(bySource)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => `${k} ${v}`)
              .join(" · ") || "—"
          }
        />
      </DashSection>

      <DashSection
        label="Data quality"
        hint="Share of deals with real values and per-share prices, active vs settled split, and the spread-computation funnel showing exactly where deals drop out (no offer, no market anchor, broken data)."
      >
        <DashCell label="With value" value={pct(withValueCount)} hint={`${withValueCount} of ${deals.length} have v ≠ TBD`} />
        <DashCell label="With offer price" value={pct(withPriceCount)} hint={`${withPriceCount} of ${deals.length} have pr.o > 0`} />
        <DashCell label="Active" value={String(activeCount)} hint={`${pct(activeCount)} of total`} />
        <DashCell label="Closed / Blocked" value={String(closedCount)} hint={`${pct(closedCount)} of total`} />
        <DashCell
          label="With spread"
          value={spreadPct}
          hint={`${withSpread} of ${activeDeals.length} active · lost: ${noOffer} no-offer, ${noMarket} no-market, ${broken} broken`}
        />
      </DashSection>

      <DashSection
        label="Pipeline activity"
        hint="What's sitting in the review queue right now, when each source last produced an approved deal, and how many minor high-confidence updates the pipeline auto-published (Phase 4)."
      >
        <DashCell label="Pending review" value={String(queuePending)} hint={pendingSourceBreakdown} />
        <DashCell label="Approved" value={String(queueApproved)} hint="cumulative" />
        <DashCell label="Rejected" value={String(queueRejected)} hint="cumulative" />
        <DashCell
          label="Last approved deal"
          value={
            (Object.values(latestBySource).sort().reverse()[0] &&
              fmtRelative(Object.values(latestBySource).sort().reverse()[0])) || "—"
          }
          hint={
            Object.entries(latestBySource)
              .sort((a, b) => (a[1] > b[1] ? -1 : 1))
              .slice(0, 4)
              .map(([k, v]) => `${k} ${fmtRelative(v)}`)
              .join(" · ") || "—"
          }
        />
        <DashCell
          label="Auto-published (30d)"
          value={String(autoPubs.length)}
          hint={
            autoPubs.length > 0
              ? `last ${fmtRelative(autoPubs[0]?.created_at)} · ${autoPubFieldBreakdown}`
              : "no auto-publications yet — MINEUR + conf≥90 + ≥2 sources needed"
          }
        />
      </DashSection>
    </>
  );
}

function DashSection({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "var(--sp-4)" }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: ".08em",
          color: "var(--text-3)",
          textTransform: "uppercase",
          marginBottom: "var(--sp-2)",
        }}
      >
        {label}
      </div>
      <div className="port-kpis" style={{ marginBottom: "var(--sp-2)" }}>
        {children}
      </div>
      <div style={{ fontSize: 10, color: "var(--text-3)", lineHeight: 1.5 }}>{hint}</div>
    </div>
  );
}

function DashCell({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="port-kpi">
      <div className="port-kpi-l">{label}</div>
      <div className="port-kpi-v">{value}</div>
      <div className="port-kpi-d">{hint}</div>
    </div>
  );
}
