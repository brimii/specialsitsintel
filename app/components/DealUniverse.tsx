"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { type Deal } from "../data/deals";
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

const REGIONS = [
  { id: "ALL", label: "All" },
  { id: "US", label: "🇺🇸 US" },
  { id: "EU", label: "🇪🇺 EU" },
  { id: "APAC", label: "🌏 APAC" },
];

const MONTHS: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

// Reproduit le tri par date approximatif de la maquette.
function parseDate(s?: string): number {
  if (!s) return 0;
  const p = s.split(/[\s,]+/);
  if (p.length >= 2 && MONTHS[p[0]]) return parseInt(p[1] || p[2] || "2026") * 100 + MONTHS[p[0]];
  if (p.length >= 2 && MONTHS[p[1]]) return parseInt(p[2] || p[0] || "2026") * 100 + MONTHS[p[1]];
  return 0;
}

export default function DealUniverse({
  deals,
  tier,
  archiveMode = false,
}: {
  deals: Deal[];
  tier: string;
  archiveMode?: boolean;
}) {
  const locked = tier === "free";
  const [cat, setCat] = useState("ALL");
  const [reg, setReg] = useState("ALL");
  const [q, setQ] = useState("");
  const [sortF, setSortF] = useState<SortField>("spread");
  const [sortD, setSortD] = useState(-1);
  const [selId, setSelId] = useState<number | null>(null);
  const [view, setView] = useState<"deals" | "catalysts">("deals");

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const d = deals.filter((x) => {
      if (cat !== "ALL" && x.c !== cat) return false;
      if (reg !== "ALL" && x.reg !== reg) return false;
      if (ql && !(x.nm + x.acq + x.c + x.r).toLowerCase().includes(ql)) return false;
      return true;
    });
    d.sort((a, b) => {
      if (sortF === "spread") return (b.s - a.s) * sortD;
      if (sortF === "prob") return (b.p - a.p) * sortD;
      if (sortF === "ev") return (b.ev - a.ev) * sortD;
      if (sortF === "name") return a.nm.localeCompare(b.nm) * sortD;
      if (sortF === "date") return (parseDate(b.pr?.ad) - parseDate(a.pr?.ad)) * sortD;
      return 0;
    });
    return d;
  }, [deals, cat, reg, q, sortF, sortD]);

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
    setReg("ALL");
    setQ("");
  };

  return (
    <div className="page active" id="page-u">
      <div className="universe-shell">
        <div className="universe-main">
          <AlertStrip />
          {archiveMode && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--sp-3)",
                flexWrap: "wrap",
                padding: "var(--sp-3) var(--sp-5)",
                background: "var(--bg-2)",
                borderBottom: "1px solid var(--border)",
                fontSize: 11,
                color: "var(--text-2)",
              }}
            >
              <span>📁 Historical archive — closed, settled or terminated deals.</span>
              <Link href="/" style={{ fontWeight: 700, whiteSpace: "nowrap", color: "var(--navy)" }}>
                ← Back to active deals
              </Link>
            </div>
          )}
          {!archiveMode && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                padding: "6px var(--sp-5)",
                background: "var(--bg-1)",
                borderBottom: "1px solid var(--border)",
                fontSize: 10,
              }}
            >
              <Link href="/archive" style={{ color: "var(--text-3)", whiteSpace: "nowrap" }}>
                📁 View historical archive →
              </Link>
            </div>
          )}
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
            <div className="filter-sep" />
            <span className="filter-label">REGION</span>
            {REGIONS.map((r) => (
              <button
                key={r.id}
                className={`filter-btn${reg === r.id ? " active" : ""}`}
                onClick={() => setReg(r.id)}
              >
                {r.label}
              </button>
            ))}
            <span className="count-pill" style={{ marginLeft: "auto", marginRight: "var(--sp-2)" }}>
              {filtered.length} situations
            </span>
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
              <Catalysts />
            )}
            {archiveMode === false ? null : null}
          </div>
        </div>

        <div className="side-panel">
          <div className="side-panel-hd">
            <span className="side-panel-title">Deal Detail</span>
            <span className="side-panel-sub">
              {selDeal ? `${selDeal.f} ${selDeal.nm}` : "Select a deal"}
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
