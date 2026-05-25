// Barre KPI — valeurs statiques de la maquette.
// `Avg Ann. Spread` et `Avg Close Prob.` restent à "—" : ils seront calculés
// à partir des deals une fois la donnée branchée (étape 2 / Supabase).
const CELLS = [
  { label: "Active Situations", value: "213", color: "var(--text)", sub: "7 categories · 14 countries" },
  { label: "Avg Ann. Spread", value: "—", color: "var(--navy)", sub: "Spread-weighted" },
  { label: "Avg Close Prob.", value: "—", color: "var(--cobalt)", sub: "AI multi-factor model" },
  { label: "Live Alerts", value: "12", color: "var(--crimson)", sub: "3 urgent · 9 info" },
  { label: "Merger Arb", value: "20", color: "var(--navy)", sub: "Cash · Stock · Collar" },
  { label: "Distressed", value: "10", color: "var(--crimson)", sub: "BK · OOC · 363" },
];

export default function KpiBar() {
  return (
    <div className="kpi-bar">
      {CELLS.map((c) => (
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
