"use client";

import { useState } from "react";
import { STRATS } from "@/app/data/content";

const CATS = ["ALL", "MERGER", "ACTIVISM", "DISTRESSED", "SPINOFF", "REORG", "TENDER", "CAPSTRUCT"];

export default function StrategiesPage() {
  const [efilt, setEfilt] = useState("ALL");
  const list = efilt === "ALL" ? STRATS : STRATS.filter((x) => x.cat === efilt);

  return (
    <div className="page active" id="page-strategies">
      <div className="page-shell">
        <div className="page-hero">
          <div>
            <div className="hero-eyebrow">Knowledge Base</div>
            <h1 className="hero-h">
              Event-Driven Strategies,
              <br />
              <em>Institutionalized.</em>
            </h1>
          </div>
          <div>
            <p className="hero-sub" style={{ marginBottom: "var(--sp-4)" }}>
              Every strategy explained with real deal examples, quantitative frameworks, risk
              decomposition, and live situations. The knowledge layer powering every signal in the
              platform.
            </p>
            <div className="filter-pills" id="enav">
              {CATS.map((c) => (
                <button
                  key={c}
                  className={`filter-pill${c === efilt ? " active" : ""}`}
                  onClick={() => setEfilt(c)}
                >
                  {c === "ALL" ? "All Strategies" : c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="edu-grid stagger" id="sgrid">
          {list.map((st) => (
            <div className="strat-card" key={st.title}>
              <div className="strat-card-top">
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 8,
                    textTransform: "uppercase",
                    letterSpacing: ".12em",
                    color: "var(--text-3)",
                    marginBottom: 5,
                  }}
                >
                  {st.cat} STRATEGY
                </div>
                <div className="strat-card-nm" style={{ color: st.col }}>
                  {st.title}
                </div>
                <div className="strat-card-mt">{st.sub}</div>
              </div>
              <div className="strat-card-body">
                <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7, marginBottom: "var(--sp-3)" }}>
                  {st.desc}
                </div>
                <div className="metrics-grid">
                  <div className="metric-box">
                    <div className="metric-l">Typical Return</div>
                    <div className="metric-v" style={{ color: st.col }}>
                      {st.ret}
                    </div>
                  </div>
                  <div className="metric-box">
                    <div className="metric-l">Sharpe Ratio</div>
                    <div className="metric-v" style={{ color: st.col }}>
                      {st.sr}
                    </div>
                  </div>
                  <div className="metric-box">
                    <div className="metric-l">Max Drawdown</div>
                    <div className="metric-v" style={{ color: "var(--crimson)" }}>
                      {st.dd}
                    </div>
                  </div>
                </div>
                <div className="section-title" style={{ marginTop: 0 }}>
                  Key Concepts
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: "var(--sp-3)" }}>
                  {st.concepts.map((c, i) => (
                    <div
                      key={i}
                      style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.6, paddingLeft: 10, position: "relative" }}
                    >
                      <span style={{ position: "absolute", left: 0, color: "var(--navy)", fontWeight: 700 }}>·</span>
                      {c}
                    </div>
                  ))}
                </div>
                <div className="risks-box">
                  <div className="risks-title">Primary Risks</div>
                  {st.risks.map((r, i) => (
                    <div className="risk-item" key={i}>
                      {r}
                    </div>
                  ))}
                </div>
                <div className="section-title">Live Examples</div>
                <div className="example-chips">
                  {st.exs.map((e, i) => (
                    <span className="example-chip" key={i}>
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
