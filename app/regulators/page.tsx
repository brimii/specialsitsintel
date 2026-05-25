import { REGS } from "@/app/data/content";

export default function RegulatorsPage() {
  return (
    <div className="page active" id="page-regulators">
      <div className="page-shell">
        <div className="page-hero">
          <div>
            <div className="hero-eyebrow">Global Regulatory Intelligence</div>
            <h1 className="hero-h">
              15 Regulators.
              <br />
              <em>One Dashboard.</em>
            </h1>
          </div>
          <div>
            <p className="hero-sub">
              Historical clearance rates, current enforcement posture, process timelines, and live
              monitoring across every major antitrust and foreign investment jurisdiction. Updated
              daily.
            </p>
          </div>
        </div>

        <div className="reg-grid stagger" id="rgrid">
          {REGS.map((r) => {
            const col = r.col === "G" ? "var(--navy)" : r.col === "R" ? "var(--crimson)" : "var(--amber)";
            const statusBg =
              r.col === "G" ? "var(--navy-bg)" : r.col === "R" ? "var(--crimson-bg)" : "var(--amber-bg)";
            const statusBd =
              r.col === "G" ? "var(--navy-bd)" : r.col === "R" ? "var(--crimson-bd)" : "var(--amber-bd)";
            return (
              <div className="reg-card" key={r.nm}>
                <div className="reg-card-hd">
                  <div>
                    <div className="reg-card-nm">{r.nm}</div>
                    <div className="reg-card-jd">{r.cn}</div>
                  </div>
                  <span
                    className="reg-card-status"
                    style={{ background: statusBg, color: col, border: `1px solid ${statusBd}` }}
                  >
                    {r.pos}
                  </span>
                </div>
                <div className="reg-card-body">
                  <div className="reg-metrics">
                    <div className="reg-metric">
                      <div className="reg-metric-l">Clearance</div>
                      <div className="reg-metric-v" style={{ color: col }}>
                        {r.rate}%
                      </div>
                    </div>
                    <div className="reg-metric">
                      <div className="reg-metric-l">Phase I</div>
                      <div className="reg-metric-v" style={{ fontSize: 10 }}>
                        {r.avg2}
                      </div>
                    </div>
                    <div className="reg-metric">
                      <div className="reg-metric-l">Phase II</div>
                      <div className="reg-metric-v" style={{ fontSize: 10 }}>
                        {r.avg}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 8,
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                      color: "var(--text-3)",
                      marginBottom: 5,
                    }}
                  >
                    Clearance rate
                  </div>
                  <div className="reg-bar">
                    <div className="reg-bar-fill" style={{ width: `${r.rate}%`, background: r.fill }} />
                  </div>
                  <div className="reg-desc">{r.desc}</div>
                  {r.stages && (
                    <div className="reg-stages">
                      <div className="reg-stages-l">Process Stages</div>
                      {r.stages.map((s, i) => (
                        <div className="reg-stage-item" key={i}>
                          <span style={{ color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                            {i + 1}.
                          </span>
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
