import { getAllDeals } from "@/lib/deals";

// Barre KPI — stats agrégées (publiques) sur l'ensemble des situations :
// nombre, spread moyen (deals à spread positif), proba de close moyenne.
export default async function KpiBar() {
  const deals = await getAllDeals();
  const arb = deals.filter((d) => d.s > 0);
  const avgSpread = arb.length ? (arb.reduce((s, d) => s + d.s, 0) / arb.length).toFixed(1) + "%" : "—";
  const avgProb = deals.length ? (deals.reduce((s, d) => s + d.p, 0) / deals.length).toFixed(0) + "%" : "—";

  const cells = [
    { label: "Active Situations", value: String(deals.length), color: "var(--text)", sub: "7 categories · 14 countries" },
    { label: "Avg Ann. Spread", value: avgSpread, color: "var(--navy)", sub: "Spread-weighted" },
    { label: "Avg Close Prob.", value: avgProb, color: "var(--cobalt)", sub: "AI multi-factor model" },
    { label: "Live Alerts", value: "12", color: "var(--crimson)", sub: "3 urgent · 9 info" },
    { label: "Merger Arb", value: "20", color: "var(--navy)", sub: "Cash · Stock · Collar" },
    { label: "Distressed", value: "10", color: "var(--crimson)", sub: "BK · OOC · 363" },
  ];

  return (
    <div className="kpi-bar">
      {cells.map((c) => (
        <div className="kpi-cell" key={c.label}>
          <div className="kpi-label">{c.label}</div>
          <div className="kpi-value" style={{ color: c.color }}>
            {c.value}
          </div>
          <div className="kpi-sub">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
