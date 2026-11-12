import { createAdminClient } from "@/lib/supabase/server";

// Placeholder pending the full admin rewrite in Step 4 of the v2 rebuild.
// The previous overview depended on the review_queue table + old deal
// column names which no longer exist. Keeping a minimal "live counts"
// panel so the /admin landing page still renders between steps.

const PRICE: Record<string, number> = { analyst: 150, institutional: 600, enterprise: 2500 };

export default async function AdminOverview() {
  const admin = createAdminClient();
  const [profilesRes, subsRes, dealsRes] = await Promise.all([
    admin.from("profiles").select("tier"),
    admin.from("subscriptions").select("tier,status"),
    admin.from("deals").select("id, status, category, min_tier, updated_at"),
  ]);

  const profiles = profilesRes.data ?? [];
  const subs = (subsRes.data ?? []).filter((s: { status: string }) => s.status === "active");
  const deals = dealsRes.data ?? [];

  const byTier: Record<string, number> = {};
  for (const p of profiles as { tier: string }[]) {
    byTier[p.tier ?? "free"] = (byTier[p.tier ?? "free"] ?? 0) + 1;
  }

  const mrr = subs.reduce(
    (sum, s: { tier: string }) => sum + (PRICE[s.tier] ?? 0),
    0,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <div
        style={{
          padding: "var(--sp-4)",
          background: "var(--amber-bg)",
          border: "1px solid var(--amber-bd)",
          borderRadius: "var(--r-md)",
          color: "var(--amber)",
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        ⚠ Admin overview is in transition — the full dashboard rebuilds in Step 4 of the v2 rebuild
        (new schema fields, manual deal entry form, Claude commentary generator). This is a minimal
        placeholder.
      </div>

      <div className="port-kpis">
        <div className="port-kpi">
          <div className="port-kpi-l">Users</div>
          <div className="port-kpi-v">{profiles.length}</div>
          <div className="port-kpi-d">registered profiles</div>
        </div>
        <div className="port-kpi">
          <div className="port-kpi-l">Active Subs</div>
          <div className="port-kpi-v">{subs.length}</div>
          <div className="port-kpi-d">paying tiers</div>
        </div>
        <div className="port-kpi">
          <div className="port-kpi-l">MRR est.</div>
          <div className="port-kpi-v">€{mrr.toLocaleString("en-US")}</div>
          <div className="port-kpi-d">from active subs</div>
        </div>
        <div className="port-kpi">
          <div className="port-kpi-l">Deals</div>
          <div className="port-kpi-v">{deals.length}</div>
          <div className="port-kpi-d">in Supabase</div>
        </div>
      </div>

      <div
        style={{
          padding: "var(--sp-4)",
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
          fontSize: 11,
          color: "var(--text-2)",
          fontFamily: "var(--font-mono)",
        }}
      >
        Tier mix:{" "}
        {Object.entries(byTier)
          .sort((a, b) => b[1] - a[1])
          .map(([t, n]) => `${t}=${n}`)
          .join(" · ")}
      </div>
    </div>
  );
}
