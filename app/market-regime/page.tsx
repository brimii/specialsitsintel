import { CUR_REGIME, MACRO, REGIMES } from "@/app/data/content";

const mc = (c: string) =>
  c === "g" ? "var(--navy)" : c === "a" ? "var(--amber)" : c === "r" ? "var(--crimson)" : "var(--text-2)";
const arr = (t: string) => (t === "up" ? "↗" : t === "down" ? "↘" : "→");
const expoColor = (c: string) =>
  c === "g" ? "#162f68" : c === "a" ? "#9c6d2a" : c === "r" ? "#a83232" : "#374160";

const mono8 = {
  fontFamily: "var(--font-mono)",
  fontSize: 8,
  textTransform: "uppercase" as const,
  letterSpacing: ".1em",
};

export default function MarketRegimePage() {
  return (
    <div className="page active" id="page-regime">
      <div className="page-shell">
        <div className="page-hero">
          <div>
            <div className="hero-eyebrow">Strategy Environment Intelligence</div>
            <h1 className="hero-h">
              Market Regime
              <br />
              <em>&amp; Strategy Fit.</em>
            </h1>
            <p className="hero-sub" style={{ marginTop: "var(--sp-4)" }}>
              Real-time macro regime detection mapped to event-driven sub-strategies. When do mergers
              close? When does distressed outperform? The institutional answer, refreshed daily.
            </p>
          </div>
          <div>
            <div className="cur-regime" id="cur-regime">
              <div className="cr-icon">{CUR_REGIME.icon}</div>
              <div>
                <div className="cr-lbl">Current Market Regime</div>
                <div className="cr-name">{CUR_REGIME.name}</div>
                <div className="cr-desc">{CUR_REGIME.desc}</div>
              </div>
              <div className="cr-meta">
                <div className="cr-meta-v">VIX {CUR_REGIME.vix}</div>
                <div className="cr-meta-v">Fed {CUR_REGIME.fedfunds}%</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)" }}>
                  as of {CUR_REGIME.asOf}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-eyebrow" style={{ marginBottom: "var(--sp-4)" }}>
          Live Macro Indicators
        </div>
        <div className="macro-grid stagger" id="macro-grid">
          {MACRO.map((m) => (
            <div className="macro-card" key={m.l}>
              <div className="macro-card-l">{m.l}</div>
              <div className="macro-card-v" style={{ color: mc(m.col) }}>
                {m.v}
              </div>
              <div className="macro-card-d">
                {m.d}
                <span style={{ color: mc(m.col) }}>{arr(m.tr)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="hero-eyebrow" style={{ marginBottom: "var(--sp-4)", marginTop: "var(--sp-8)" }}>
          Strategy Environment Matrix
        </div>
        <div className="regime-grid stagger" id="regime-grid">
          {REGIMES.map((s) => (
            <div className="regime-card" key={s.title}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--sp-3)", marginBottom: "var(--sp-3)" }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--r-md)",
                    background: s.bg,
                    border: `1px solid ${s.bd}`,
                    color: s.col,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {s.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.01em", color: s.col, marginBottom: 3 }}>
                    {s.title}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, color: "var(--text-3)" }}>{s.sub}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ ...mono8, fontSize: 7, letterSpacing: ".08em", color: "var(--text-3)", marginBottom: 2 }}>
                    Current
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: "var(--r-sm)",
                      background: s.curBg,
                      border: `1px solid ${s.curCol}44`,
                      color: s.curCol,
                    }}
                  >
                    {s.current}
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: "var(--text-2)",
                  lineHeight: 1.55,
                  padding: "var(--sp-2) var(--sp-3)",
                  background: "var(--bg-2)",
                  borderRadius: "var(--r-sm)",
                  marginBottom: "var(--sp-3)",
                }}
              >
                {s.curNote}
              </div>
              <div style={{ ...mono8, color: "var(--navy)", marginBottom: 7 }}>● Performs Best In</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: "var(--sp-3)" }}>
                {s.best.map((w, i) => (
                  <div key={i} style={{ fontSize: 10.5, lineHeight: 1.5 }}>
                    <b style={{ color: "var(--text)" }}>{w.t}.</b> <span style={{ color: "var(--text-2)" }}>{w.d}</span>
                  </div>
                ))}
              </div>
              <div style={{ ...mono8, color: "var(--crimson)", marginBottom: 7 }}>● Underperforms In</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: "var(--sp-3)" }}>
                {s.worst.map((w, i) => (
                  <div key={i} style={{ fontSize: 10.5, lineHeight: 1.5 }}>
                    <b style={{ color: "var(--text)" }}>{w.t}.</b> <span style={{ color: "var(--text-2)" }}>{w.d}</span>
                  </div>
                ))}
              </div>
              <div style={{ ...mono8, color: "var(--text-3)", marginBottom: 7 }}>Factor Exposures</div>
              <div className="exposure-grid">
                {s.exposures.map((e, i) => (
                  <div className="exposure-item" key={i}>
                    <div className="exposure-l">{e.l}</div>
                    <div className="exposure-bar">
                      <div className="exposure-fill" style={{ width: `${e.v}%`, background: expoColor(e.c) }} />
                    </div>
                    <div className="exposure-v" style={{ color: expoColor(e.c) }}>
                      {e.v}%
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                      {e.dir.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "var(--sp-3)", paddingTop: "var(--sp-3)", borderTop: "1px solid var(--border)" }}>
                <div style={{ ...mono8, color: "var(--text-3)", marginBottom: 7 }}>Historical Regime Track Record</div>
                {s.history.map((h, i) => (
                  <div key={i} style={{ display: "flex", gap: "var(--sp-2)", marginBottom: 6, fontSize: 10, lineHeight: 1.5 }}>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-3)", minWidth: 72, flexShrink: 0 }}>{h.p}</span>
                    <span style={{ color: "var(--text-2)" }}>{h.d}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
