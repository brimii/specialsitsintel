"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  type Deal,
  fmtCap,
  partyLabels,
  countryFlag,
  annualisedSpread,
} from "../data/deals";
import { type Alert } from "../data/content";
import DealTable, { type SortField } from "./DealTable";
import DealDetail from "./DealDetail";
import AlertStrip from "./AlertStrip";
import Catalysts from "./Catalysts";

const CATS: { id: string; label: string; style?: CSSProperties }[] = [
  { id: "ALL", label: "All" },
  { id: "MERGER", label: "Merger Arb", style: { color: "var(--cobalt)", borderColor: "var(--cobalt-bd)" } },
  { id: "ACTIVISM", label: "Activism", style: { color: "var(--violet)", borderColor: "var(--violet-bd)" } },
  { id: "DISTRESSED", label: "Distressed", style: { color: "var(--crimson)", borderColor: "var(--crimson-bd)" } },
  { id: "SPINOFF", label: "Spin-offs", style: { color: "var(--cobalt)", borderColor: "var(--cobalt-bd)" } },
  { id: "REORG", label: "Restructuring", style: { color: "var(--amber)", borderColor: "var(--amber-bd)" } },
  { id: "TENDER", label: "Tender" },
];

// Client-side CSV export against the new schema's named columns.
function exportDealsCsv(rows: Deal[]) {
  if (rows.length === 0) return;
  const headers = [
    "Target", "Target Ticker", "Counterparty", "Category", "Sub-type",
    "Status", "Transaction Value USD", "Ann. Spread %", "Close Prob %",
    "Regulators", "Current Px", "Offer Px", "Currency",
    "Announced", "Expected Close", "Last Updated",
  ];
  const esc = (v: unknown): string => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((d) => {
      const spread = annualisedSpread(d);
      return [
        esc(d.target_name),
        esc(d.target_ticker),
        esc(d.counterparty_name),
        esc(d.category),
        esc(d.sub_type),
        esc(d.status),
        esc(d.transaction_value_usd),
        esc(spread != null ? spread.toFixed(2) : ""),
        esc(d.closing_probability),
        esc((d.primary_regulators || []).join("|")),
        esc(d.current_price),
        esc(d.offer_total_per_share),
        esc(d.currency),
        esc(d.announce_date),
        esc(d.expected_close),
        esc(d.updated_at),
      ].join(",");
    }),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ssi-deals-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const CLOSED_STATUSES = new Set(["closed", "blocked", "dead", "terminated", "withdrawn"]);

function StatsCell({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
      <span style={{ color: "var(--text-3)" }}>{label}</span>
      <span style={{ color: "var(--text)", fontWeight: 600 }}>{value}</span>
      {hint ? <span style={{ color: "var(--text-3)" }}>{hint}</span> : null}
    </span>
  );
}

function StatsStrip({ deals }: { deals: Deal[] }) {
  const total = deals.length;
  if (total === 0) return null;
  const closed = deals.filter((d) => CLOSED_STATUSES.has((d.status ?? "").toLowerCase())).length;
  const active = total - closed;
  const withOffer = deals.filter((d) => (d.offer_total_per_share ?? 0) > 0).length;
  const withValue = deals.filter((d) => (d.transaction_value_usd ?? 0) > 0).length;
  const totalCap = deals.reduce((sum, d) => sum + (d.transaction_value_usd ?? 0), 0);
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
  return (
    <div
      style={{
        display: "flex",
        gap: "var(--sp-4)",
        flexWrap: "wrap",
        alignItems: "center",
        padding: "8px var(--sp-5)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        color: "var(--text-2)",
        background: "var(--bg-2)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <StatsCell label="Shown" value={String(total)} />
      <StatsCell label="Active" value={String(active)} hint={`(${pct(active)})`} />
      <StatsCell label="Closed" value={String(closed)} hint={`(${pct(closed)})`} />
      <StatsCell label="With value" value={pct(withValue)} hint={`(${withValue})`} />
      <StatsCell label="With offer price" value={pct(withOffer)} hint={`(${withOffer})`} />
      <StatsCell label="Total cap" value={fmtCap(totalCap)} />
    </div>
  );
}

export default function DealUniverse({
  deals,
  tier,
  alerts,
}: {
  deals: Deal[];
  tier: string;
  alerts?: Alert[];
}) {
  const locked = tier === "free";
  const [cat, setCat] = useState("ALL");
  const [q, setQ] = useState("");
  const [sortF, setSortF] = useState<SortField>("spread");
  const [sortD, setSortD] = useState(-1);
  const [selId, setSelId] = useState<number | null>(null);
  const [view, setView] = useState<"deals" | "catalysts">("deals");

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const d = deals.filter((x) => {
      if (cat !== "ALL" && x.category !== cat) return false;
      if (ql) {
        const hay = `${x.target_name} ${x.counterparty_name ?? ""} ${x.category} ${(x.primary_regulators ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
    d.sort((a, b) => {
      const sa = annualisedSpread(a) ?? -Infinity;
      const sb = annualisedSpread(b) ?? -Infinity;
      if (sortF === "spread") return (sb - sa) * sortD;
      if (sortF === "prob") return ((b.closing_probability ?? 0) - (a.closing_probability ?? 0)) * sortD;
      if (sortF === "size") return ((b.transaction_value_usd ?? 0) - (a.transaction_value_usd ?? 0)) * sortD;
      if (sortF === "name") return a.target_name.localeCompare(b.target_name) * sortD;
      if (sortF === "date") {
        const ad = a.announce_date ?? "";
        const bd = b.announce_date ?? "";
        return bd.localeCompare(ad) * sortD;
      }
      return 0;
    });
    return d;
  }, [deals, cat, q, sortF, sortD]);

  const selDeal = selId == null ? null : deals.find((d) => d.id === selId) ?? null;

  const onSort = (f: SortField) => {
    if (sortF === f) setSortD((v) => v * -1);
    else {
      setSortF(f);
      setSortD(-1);
    }
  };
  const onReset = () => {
    setCat("ALL");
    setQ("");
  };

  return (
    <div className="page active" id="page-u">
      <div className="universe-shell">
        <div className="universe-main">
          <AlertStrip alerts={alerts} />
          {locked && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--sp-3)",
                flexWrap: "wrap",
                padding: "var(--sp-3) var(--sp-5)",
                background: "var(--navy-bg)",
                borderBottom: "1px solid var(--navy-bd)",
                fontSize: 11,
                color: "var(--navy)",
              }}
            >
              <span>
                🔒 Free preview — 5 situations. AI commentary, FTC scoring and price charts are
                reserved for Analyst+ subscribers.
              </span>
              <Link href="/home" style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                Upgrade to Analyst →
              </Link>
            </div>
          )}
          <div className="filter-bar">
            <span className="filter-label">CATEGORY</span>
            {CATS.map((c) => (
              <button
                key={c.id}
                className={`filter-btn${cat === c.id ? " active" : ""}`}
                style={c.style}
                onClick={() => setCat(c.id)}
              >
                {c.label}
              </button>
            ))}
            <span className="count-pill" style={{ marginLeft: "auto", marginRight: "var(--sp-2)" }}>
              {filtered.length} situations
            </span>
            <button
              type="button"
              className="filter-btn"
              onClick={() => exportDealsCsv(filtered)}
              title="Download the current filter as a CSV"
            >
              ⤓ CSV
            </button>
            <button
              className={`filter-btn${view === "deals" ? " active" : ""}`}
              onClick={() => setView("deals")}
            >
              ▤ Deals
            </button>
            <button
              className={`filter-btn${view === "catalysts" ? " active" : ""}`}
              onClick={() => setView("catalysts")}
            >
              ◷ Upcoming Catalysts
            </button>
            <div className="search-wrap">
              <span style={{ color: "var(--text-3)", fontSize: 11 }}>⌕</span>
              <input
                value={q}
                placeholder="Search deals…"
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          <StatsStrip deals={filtered} />

          <div className="universe-table">
            {view === "deals" ? (
              <DealTable
                deals={filtered}
                selectedId={selId}
                onSelect={setSelId}
                sortF={sortF}
                sortD={sortD}
                onSort={onSort}
                onReset={onReset}
              />
            ) : (
              <Catalysts deals={deals} />
            )}
          </div>
        </div>

        <div className="side-panel">
          <div className="side-panel-hd">
            <span className="side-panel-title">Deal Detail</span>
            <span className="side-panel-sub">
              {selDeal ? `${countryFlag(selDeal.target_country)} ${selDeal.target_name}` : "Select a deal"}
            </span>
          </div>
          <div id="side">
            <DealDetail deal={selDeal} locked={locked} />
          </div>
        </div>
      </div>
    </div>
  );
}
// partyLabels is used inside DealTable/DealDetail; keep the import here
// as a reminder of the shared vocabulary surface.
void partyLabels;
