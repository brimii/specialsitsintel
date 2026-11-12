"use client";

import { useEffect, useMemo, useState } from "react";
import { DEALS, countryFlag, annualisedSpread, type Deal } from "@/app/data/deals";

type Position = {
  dealId: number;
  notional: number;
  entry: number;
  dir: "LONG" | "SHORT";
  addedAt: string;
};

const PORT_KEY = "ssi_port_v2";

const catCol: Record<string, string> = {
  MERGER: "var(--cobalt)",
  ACTIVISM: "var(--violet)",
  DISTRESSED: "var(--crimson)",
  SPINOFF: "var(--navy)",
  REORG: "var(--amber)",
  TENDER: "var(--navy)",
};

const fmt = (n: number, decimals = 0) =>
  n === undefined || isNaN(n) ? "—" : (n >= 0 ? "+" : "") + n.toFixed(decimals) + "%";

const fmtE = (n: number) =>
  n === undefined || isNaN(n)
    ? "—"
    : "€" + (Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(2) + "M" : (n / 1e3).toFixed(1) + "K");

const pcolP = (p: number) => (p >= 80 ? "var(--navy)" : p >= 60 ? "var(--amber)" : "var(--crimson)");
const mono = (size: number) => ({ fontFamily: "var(--font-mono)" as const, fontSize: size });

// Mounted to defer Supabase-backed deals until the client has them. For
// now `DEALS` is the empty fallback (rebuild starts from zero); once the
// watchlist feature lands, this component will pull from a server route
// and the Add-Position dropdown will populate from the live universe.
export default function PortfolioPage() {
  const [port, setPort] = useState<Position[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [paDeal, setPaDeal] = useState<number | null>(null);
  const [paNotional, setPaNotional] = useState("");
  const [paEntry, setPaEntry] = useState("");
  const [paDir, setPaDir] = useState<"LONG" | "SHORT">("LONG");

  useEffect(() => {
    try {
      const s = localStorage.getItem(PORT_KEY);
      if (s) setPort(JSON.parse(s));
    } catch {}
  }, []);

  const save = (next: Position[]) => {
    setPort(next);
    try {
      localStorage.setItem(PORT_KEY, JSON.stringify(next));
    } catch {}
  };

  const addable = useMemo(
    () =>
      DEALS.filter(
        (d) => d.status !== "Closed" && d.status !== "Liquidated" && d.status !== "Dead",
      ),
    [],
  );

  const openAdd = () => {
    setShowAdd(true);
    setPaDeal(addable[0]?.id ?? null);
    setPaNotional("");
    setPaEntry("");
    setPaDir("LONG");
  };

  const addPosition = () => {
    if (paDeal == null) return;
    const deal = DEALS.find((d) => d.id === paDeal);
    if (!deal) return;
    const notional = Number(paNotional) || 100000;
    const entry = Number(paEntry) || deal.current_price || 100;
    const next = [
      ...port,
      { dealId: paDeal, notional, entry, dir: paDir, addedAt: new Date().toLocaleDateString("fr-FR") },
    ];
    save(next);
    setShowAdd(false);
  };

  const removePosition = (i: number) => {
    save(port.filter((_, idx) => idx !== i));
    setSelIdx(null);
  };

  const clearAll = () => {
    if (confirm("Clear all positions?")) save([]);
  };

  const calc = useMemo(() => {
    interface Row {
      d: Deal;
      cur: number;
      pnlPct: number;
      pnlAbs: number;
      notional: number;
    }
    const rows: Row[] = port
      .map((pos) => {
        const d = DEALS.find((x) => x.id === pos.dealId);
        if (!d) return null;
        const cur = d.current_price ?? pos.entry;
        const pnlPct =
          pos.dir === "LONG"
            ? ((cur - pos.entry) / pos.entry) * 100
            : ((pos.entry - cur) / pos.entry) * 100;
        const pnlAbs = (pnlPct / 100) * pos.notional;
        return { d, cur, pnlPct, pnlAbs, notional: pos.notional };
      })
      .filter((r): r is Row => r !== null);

    const totalNav = rows.reduce((a, r) => a + r.notional, 0);
    const totalPnl = rows.reduce((a, r) => a + r.pnlAbs, 0);
    const wSpread = rows.reduce((a, r) => {
      const s = annualisedSpread(r.d) ?? 0;
      return a + (s > 0 ? s * r.notional : 0);
    }, 0);
    const wN = rows.reduce((a, r) => {
      const s = annualisedSpread(r.d) ?? 0;
      return a + (s > 0 ? r.notional : 0);
    }, 0);
    const wProb = rows.reduce(
      (a, r) => a + (r.d.closing_probability ?? 0) * r.notional,
      0,
    );
    const cats = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.d.category] = (acc[r.d.category] || 0) + r.notional;
      return acc;
    }, {});
    return { rows, totalNav, totalPnl, wSpread, wProb, wN, cats };
  }, [port]);

  const empty = port.length === 0;
  const pnlCol = calc.totalPnl >= 0 ? "var(--navy)" : "var(--crimson)";
  const sel = selIdx != null ? calc.rows[selIdx] : null;
  const selPos = selIdx != null ? port[selIdx] : null;

  return (
    <div className="page active" id="page-portfolio">
      <div className="port-shell">
        <div className="port-main">
          <div className="port-hd">
            <h2>My Portfolio</h2>
            <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
              <span style={{ ...mono(9), color: "var(--text-3)" }}>Total NAV:</span>
              <span style={{ ...mono(15), fontWeight: 600 }}>
                {empty ? "—" : fmtE(calc.totalNav)}
              </span>
              <button
                className="btn btn-primary btn-sm"
                onClick={openAdd}
                disabled={addable.length === 0}
                title={addable.length === 0 ? "Deal universe empty — add deals via admin first" : undefined}
              >
                + Add Position
              </button>
              <button className="btn btn-secondary btn-sm" onClick={clearAll}>
                Clear All
              </button>
            </div>
          </div>

          <div className="port-kpis">
            <div className="port-kpi">
              <div className="port-kpi-l">Positions</div>
              <div className="port-kpi-v">{empty ? "—" : port.length}</div>
              <div className="port-kpi-d">active situations</div>
            </div>
            <div className="port-kpi">
              <div className="port-kpi-l">Total P&amp;L</div>
              <div className="port-kpi-v" style={empty ? undefined : { color: pnlCol }}>
                {empty
                  ? "—"
                  : (calc.totalPnl >= 0 ? "+" : "") +
                    fmtE(calc.totalPnl).replace("-", "") +
                    (calc.totalPnl < 0 ? " loss" : " gain")}
              </div>
              <div className="port-kpi-d">unrealized</div>
            </div>
            <div className="port-kpi">
              <div className="port-kpi-l">Avg Spread</div>
              <div className="port-kpi-v">
                {empty ? "—" : calc.wN > 0 ? (calc.wSpread / calc.wN).toFixed(1) + "%" : "—"}
              </div>
              <div className="port-kpi-d">weighted by notional</div>
            </div>
            <div className="port-kpi">
              <div className="port-kpi-l">Avg Close Prob</div>
              <div className="port-kpi-v">
                {empty ? "—" : (calc.wProb / calc.totalNav).toFixed(0) + "%"}
              </div>
              <div className="port-kpi-d">portfolio weighted</div>
            </div>
          </div>

          {showAdd && (
            <div
              style={{
                background: "var(--bg-1)",
                border: "1px solid var(--navy-bd)",
                borderRadius: "var(--r-lg)",
                padding: "var(--sp-4)",
                marginBottom: "var(--sp-4)",
              }}
            >
              <div
                style={{
                  ...mono(8.5),
                  textTransform: "uppercase",
                  letterSpacing: ".1em",
                  color: "var(--navy)",
                  marginBottom: "var(--sp-3)",
                }}
              >
                ADD POSITION
              </div>
              <div style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label className="form-label">Deal</label>
                  <select
                    className="form-input"
                    style={{ minWidth: 200 }}
                    value={paDeal ?? ""}
                    onChange={(e) => setPaDeal(Number(e.target.value))}
                  >
                    {addable.map((d) => (
                      <option key={d.id} value={d.id}>
                        {countryFlag(d.target_country)} {d.target_name} ({d.category})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label className="form-label">Notional (€)</label>
                  <input
                    type="number"
                    placeholder="100000"
                    className="form-input"
                    style={{ width: 120 }}
                    value={paNotional}
                    onChange={(e) => setPaNotional(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label className="form-label">Entry Price</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Auto"
                    className="form-input"
                    style={{ width: 100 }}
                    value={paEntry}
                    onChange={(e) => setPaEntry(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label className="form-label">Direction</label>
                  <select
                    className="form-input"
                    value={paDir}
                    onChange={(e) => setPaDir(e.target.value as "LONG" | "SHORT")}
                  >
                    <option value="LONG">Long Target</option>
                    <option value="SHORT">Short Acquirer</option>
                  </select>
                </div>
                <button className="btn btn-primary btn-sm" onClick={addPosition}>
                  Add →
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!empty && (
            <div
              style={{
                marginBottom: "var(--sp-3)",
                background: "var(--bg-1)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-md)",
                padding: "var(--sp-3) var(--sp-4)",
              }}
            >
              <div style={{ ...mono(8), textTransform: "uppercase", letterSpacing: ".1em", color: "var(--text-3)", marginBottom: 7 }}>
                ALLOCATION BY STRATEGY
              </div>
              <div>
                {Object.entries(calc.cats).map(([c, n]) => (
                  <div key={c} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
                    <span style={{ ...mono(9), color: "var(--text-3)", width: 80 }}>{c}</span>
                    <div style={{ flex: 1, height: 6, background: "var(--bg-3)", borderRadius: 3, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${((n / calc.totalNav) * 100).toFixed(1)}%`,
                          background: catCol[c] || "var(--navy)",
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    <span style={{ ...mono(9), color: "var(--text-2)", width: 34, textAlign: "right" }}>
                      {((n / calc.totalNav) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
            <div className="port-table-hd">
              <span>Situation</span>
              <span>Notional</span>
              <span>Entry</span>
              <span>Current</span>
              <span>P&amp;L</span>
              <span>Spread</span>
              <span>Prob</span>
            </div>
            <div id="port-tbody">
              {empty ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)", fontSize: 12, lineHeight: 1.8 }}>
                  No positions yet.
                  <br />
                  Click <b>+ Add Position</b> to build your special sits book.
                  {addable.length === 0 ? (
                    <>
                      <br />
                      <br />
                      <span style={{ fontSize: 10, color: "var(--text-4)" }}>
                        (Deal universe is empty — add deals via admin first.)
                      </span>
                    </>
                  ) : null}
                </div>
              ) : (
                calc.rows.map((row, i) => {
                  const d = row.d;
                  const rowPnlCol = row.pnlAbs >= 0 ? "var(--navy)" : "var(--crimson)";
                  const spread = annualisedSpread(d) ?? 0;
                  const prob = d.closing_probability ?? 0;
                  return (
                    <div className="port-row" key={i} onClick={() => setSelIdx(i)}>
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {countryFlag(d.target_country)} {d.target_name}
                        </div>
                        <div style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                          {d.category} · {port[i].dir} · {port[i].addedAt}
                        </div>
                      </div>
                      <span style={mono(10.5)}>{fmtE(port[i].notional)}</span>
                      <span style={mono(10.5)}>{port[i].entry.toFixed(2)}</span>
                      <span style={mono(10.5)}>{row.cur.toFixed(2)}</span>
                      <span style={{ ...mono(10.5), color: rowPnlCol, fontWeight: 600 }}>
                        {fmt(row.pnlPct, 1)}
                      </span>
                      <span style={{ ...mono(10), color: spread > 0 ? "var(--navy)" : "var(--text-3)" }}>
                        {spread > 0 ? spread.toFixed(1) + "%" : "—"}
                      </span>
                      <span style={{ ...mono(10), color: pcolP(prob) }}>{prob.toFixed(0)}%</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="port-side">
          <div
            style={{
              padding: "var(--sp-3) var(--sp-4)",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--sp-3)",
              position: "sticky",
              top: 0,
              background: "var(--bg-2)",
              zIndex: 5,
            }}
          >
            <span style={{ ...mono(8.5), textTransform: "uppercase", letterSpacing: ".1em", color: "var(--text-3)" }}>
              POSITION DETAIL
            </span>
          </div>
          <div id="port-detail">
            {sel && selPos ? (
              <PortDetail row={sel} pos={selPos} idx={selIdx!} onRemove={removePosition} />
            ) : (
              <div style={{ padding: "40px var(--sp-4)", textAlign: "center", color: "var(--text-3)", fontSize: 11, lineHeight: 1.7 }}>
                Click a position to view
                <br />
                deal detail, AI signals
                <br />
                and Kelly analysis.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PortDetail({
  row,
  pos,
  idx,
  onRemove,
}: {
  row: { d: Deal; cur: number; pnlPct: number; pnlAbs: number };
  pos: Position;
  idx: number;
  onRemove: (i: number) => void;
}) {
  const { d, pnlPct, pnlAbs } = row;
  const prob = d.closing_probability ?? 0;
  const spread = annualisedSpread(d) ?? 0;
  const kelly = prob && spread ? ((prob / 100) * (spread / 100) - (100 - prob) / 100) / (spread / 100) * 100 : 0;
  const kellySug = Math.max(0, kelly / 2);
  const pnlCol = pnlAbs >= 0 ? "var(--navy)" : "var(--crimson)";

  return (
    <div style={{ padding: "var(--sp-3)" }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
        {countryFlag(d.target_country)} {d.target_name}
      </div>
      <div style={{ ...mono(9), color: "var(--text-2)", marginBottom: 11 }}>
        {d.category} · {pos.dir} · Entry {pos.entry.toFixed(2)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 11 }}>
        <div className="kpi-mini">
          <div className="kpi-mini-label">P&amp;L %</div>
          <div className="kpi-mini-value" style={{ color: pnlCol }}>
            {pnlPct >= 0 ? "+" : ""}
            {pnlPct.toFixed(2)}%
          </div>
        </div>
        <div className="kpi-mini">
          <div className="kpi-mini-label">P&amp;L €</div>
          <div className="kpi-mini-value" style={{ fontSize: 13, color: pnlCol }}>
            {fmtE(Math.abs(pnlAbs))}
          </div>
        </div>
        <div className="kpi-mini">
          <div className="kpi-mini-label">Ann. Spread</div>
          <div className="kpi-mini-value" style={{ color: "var(--navy)" }}>
            {spread > 0 ? spread.toFixed(1) + "%" : "—"}
          </div>
        </div>
        <div className="kpi-mini">
          <div className="kpi-mini-label">Close Prob</div>
          <div className="kpi-mini-value" style={{ color: pcolP(prob) }}>
            {prob.toFixed(0)}%
          </div>
        </div>
      </div>
      <div className="ai-block navy" style={{ marginBottom: 10 }}>
        <div className="ai-block-label">Kelly Analysis</div>
        <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.7 }}>
          Full Kelly: <b style={{ color: "var(--navy)" }}>{Math.max(0, kelly).toFixed(1)}%</b> of NAV
          <br />
          Half-Kelly (recommended): <b style={{ color: "var(--navy)" }}>{kellySug.toFixed(1)}%</b> of NAV
          <br />
          Current allocation: <b>{((pos.notional / 1e5) * 100).toFixed(1)}%</b> of €100K base
        </div>
      </div>
      {d.ai_commentary ? (
        <div className="ai-block cobalt">
          <div className="ai-block-label">AI Commentary</div>
          <div style={{ fontSize: 10.5, color: "var(--text-2)", lineHeight: 1.6 }}>{d.ai_commentary}</div>
        </div>
      ) : null}
      <button
        onClick={() => onRemove(idx)}
        style={{
          width: "100%",
          marginTop: 10,
          padding: 7,
          background: "var(--crimson-bg)",
          border: "1px solid var(--crimson-bd)",
          color: "var(--crimson)",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: ".08em",
          cursor: "pointer",
          borderRadius: "var(--r-sm)",
          textTransform: "uppercase",
        }}
      >
        Remove position
      </button>
    </div>
  );
}
