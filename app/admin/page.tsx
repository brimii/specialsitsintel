import { createAdminClient } from "@/lib/supabase/server";

const PRICE: Record<string, number> = { analyst: 150, institutional: 600, enterprise: 2500 };

export default async function AdminOverview() {
  const admin = createAdminClient();
  const [profilesRes, subsRes, dealsRes] = await Promise.all([
    admin.from("profiles").select("tier"),
    admin.from("subscriptions").select("tier,status"),
    admin.from("deals").select("id"),
  ]);

  const profiles = profilesRes.data ?? [];
  const subs = (subsRes.data ?? []).filter((s) => s.status === "active");
  const deals = dealsRes.data ?? [];

  const byTier = profiles.reduce<Record<string, number>>((acc, p) => {
    const t = (p.tier as string) ?? "free";
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});
  const mrr = subs.reduce((sum, s) => sum + (PRICE[s.tier as string] ?? 0), 0);

  const cells = [
    { l: "Utilisateurs", v: String(profiles.length), s: `free ${byTier.free ?? 0} · analyst ${byTier.analyst ?? 0} · inst ${byTier.institutional ?? 0} · ent ${byTier.enterprise ?? 0}` },
    { l: "Abos actifs", v: String(subs.length), s: "status = active" },
    { l: "MRR estimé", v: `€${mrr.toLocaleString("fr-FR")}`, s: "somme des paliers actifs" },
    { l: "Deals en base", v: String(deals.length), s: "table publique deals" },
  ];

  return (
    <div className="port-kpis" style={{ marginBottom: "var(--sp-6)" }}>
      {cells.map((c) => (
        <div className="port-kpi" key={c.l}>
          <div className="port-kpi-l">{c.l}</div>
          <div className="port-kpi-v">{c.v}</div>
          <div className="port-kpi-d">{c.s}</div>
        </div>
      ))}
    </div>
  );
}
