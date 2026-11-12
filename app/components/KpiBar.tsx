import { getAllDeals } from "@/lib/deals";
import { annualisedSpread } from "@/app/data/deals";

// Public KPI strip. Everything is aggregated so it's safe to show
// unauthenticated — no deal-level provenance leaks out.
export default async function KpiBar() {
  const deals = await getAllDeals();

  const spreads: number[] = [];
  const probs: number[] = [];
  for (const d of deals) {
    const s = annualisedSpread(d);
    if (s != null && s > 0) spreads.push(s);
    if (d.closing_probability != null) probs.push(d.closing_probability);
  }
  const avgSpread = spreads.length
    ? (spreads.reduce((a, b) => a + b, 0) / spreads.length).toFixed(1) + "%"
    : "—";
  const avgProb = probs.length
    ? (probs.reduce((a, b) => a + b, 0) / probs.length).toFixed(0) + "%"
    : "—";

  const mergers = deals.filter((d) => d.category === "MERGER").length;
  const distressed = deals.filter((d) => d.category === "DISTRESSED").length;

  const cells = [
    { label: "Active Situations", value: String(deals.length), color: "var(--text)", sub: "US event-driven · 6 categories" },
    { label: "Avg Ann. Spread", value: avgSpread, color: "var(--navy)", sub: "Spread-weighted" },
    { label: "Avg Close Prob.", value: avgProb, color: "var(--cobalt)", sub: "AI multi-factor model" },
    { label: "Live Alerts", value: "—", color: "var(--crimson)", sub: "Daily refresh" },
    { label: "Merger Arb", value: String(mergers), color: "var(--navy)", sub: "Cash · Stock · Mixed" },
    { label: "Distressed", value: String(distressed), color: "var(--crimson)", sub: "Ch.11 · OOC · A&E" },
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
