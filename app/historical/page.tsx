"use client";

import { useState } from "react";
import { HIST, type HistDeal } from "@/app/data/content";

const CATS = ["ALL", "MERGER", "ACTIVISM", "DISTRESSED", "SPINOFF", "REORG"];
const catCol: Record<string, string> = {
  MERGER: "var(--cobalt)",
  ACTIVISM: "var(--violet)",
  DISTRESSED: "var(--crimson)",
  SPINOFF: "var(--navy)",
  REORG: "var(--amber)",
};

// Graphique de prix procédural (SVG déterministe, seedé par nom+année) — porté
// fidèlement de la maquette.
function HistChart({ h, idx }: { h: HistDeal; idx: number }) {
  const W = 280,
    H = 88,
    pL = 4,
    pR = 4,
    pT = 6,
    pB = 22;
  const iW = W - pL - pR,
    iH = H - pT - pB;
  const retNum = parseFloat(h.ret.replace(/[^0-9.-]/g, "")) * (h.ret.includes("-") ? -1 : 1) || 0;
  const hexCol = retNum > 0 ? "#162f68" : retNum < 0 ? "#a83232" : "#9c6d2a";
  const cssCol = retNum > 0 ? "var(--navy)" : retNum < 0 ? "var(--crimson)" : "var(--amber)";

  let seed = h.nm.length * 17 + parseInt(h.yr) * 3;
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const N = 80,
    ann = 22;
  const prices: number[] = [100];
  let px = 100;
  for (let i = 1; i < ann; i++) {
    px += (rng() - 0.5) * 1.8;
    px = Math.max(88, Math.min(112, px));
    prices.push(px);
  }
  const jump = retNum > 0 ? Math.min(retNum * 0.45, 38) : Math.max(retNum * 0.45, -38);
  px += jump;
  prices.push(px);
  const finalPx = 100 + retNum * 0.65;
  for (let i = ann + 1; i < N; i++) {
    const t = (i - ann) / (N - ann);
    const tgt = (ap: number) => ap + (finalPx - ap) * Math.pow(t, 1.1);
    px = prices[i - 1] + (tgt(prices[ann]) - prices[i - 1]) * 0.15 + (rng() - 0.5) * Math.abs(retNum || 5) * 0.04;
    prices.push(px);
  }

  let mn = Math.min(...prices),
    mx = Math.max(...prices);
  const rng2 = mx - mn || 1;
  mn -= rng2 * 0.05;
  mx += rng2 * 0.08;
  const ys = (p: number) => pT + iH - ((p - mn) / (mx - mn)) * iH;
  const xs = (i: number) => pL + (i / (N - 1)) * iW;

  let path = `M ${xs(0)} ${ys(prices[0])}`;
  for (let i = 1; i < N; i++) path += ` L ${xs(i)} ${ys(prices[i])}`;
  const area = path + ` L ${xs(N - 1)} ${pT + iH} L ${pL} ${pT + iH} Z`;
  const annX = xs(ann),
    curX = xs(N - 1);
  const yr = parseInt(h.yr) || 2015;
  const durYrs = parseFloat(h.dur) || 1;
  const endYr = yr + Math.ceil(durYrs);
  const midYr = Math.round((yr + endYr) / 2);
  const xlbls = [
    { x: xs(0), t: yr.toString() },
    { x: annX, t: "EVENT" },
    { x: xs(Math.floor(N / 2)), t: midYr.toString() },
    { x: curX, t: endYr.toString() },
  ];
  const gid = `hg-${idx}`;

  return (
    <div style={{ background: "var(--bg-2)", borderRadius: "var(--r-sm)", padding: "var(--sp-2)", marginBottom: "var(--sp-3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 7.5, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--text-3)" }}>
          {h.sym || h.acq.split(" ")[0]} · {h.yr}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: cssCol }}>{h.ret}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 70, display: "block" }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hexCol} stopOpacity=".2" />
            <stop offset="100%" stopColor={hexCol} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={annX} y1={pT} x2={annX} y2={pT + iH} stroke="rgba(54,96,160,.55)" strokeWidth=".9" strokeDasharray="2,2" />
        <path d={area} fill={`url(#${gid})`} />
        <path d={path} fill="none" stroke={hexCol} strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx={curX} cy={ys(prices[N - 1])} r="3" fill={hexCol} stroke="var(--bg-2)" strokeWidth="1.2" />
        {xlbls.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={pT + iH + 13}
            fill={l.t === "EVENT" ? "#3660a0" : "var(--text-3)"}
            fontFamily="DM Mono,monospace"
            fontSize="8"
            textAnchor="middle"
            fontWeight={l.t === "EVENT" ? "600" : "400"}
          >
            {l.t}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default function HistoricalPage() {
  const [filt, setFilt] = useState("ALL");
  const filtered = filt === "ALL" ? HIST : HIST.filter((h) => h.cat === filt);

  return (
    <div className="page active" id="page-historical">
      <div className="page-shell">
        <div className="page-hero">
          <div>
            <div className="hero-eyebrow">Hall of Fame</div>
            <h1 className="hero-h">
              Iconic
              <br />
              <em>Event-Driven Deals.</em>
            </h1>
            <p className="hero-sub" style={{ marginTop: "var(--sp-4)" }}>
              The most consequential special situations of the past 25 years. Each entry: outcome,
              alpha generated, lessons learned, and what it taught the institutional community.
            </p>
          </div>
          <div>
            <div className="cur-regime" style={{ background: "linear-gradient(135deg,var(--bg-1),var(--bg-2))" }}>
              <div className="cr-icon" style={{ color: "var(--navy)" }}>
                ★
              </div>
              <div>
                <div className="cr-lbl">Curated Library</div>
                <div className="cr-name" style={{ color: "var(--navy)" }}>
                  25 Legendary Situations
                </div>
                <div className="cr-desc">
                  From RJR Nabisco to Microsoft/Activision — the deals that defined modern merger
                  arbitrage, activism, distressed, and spin-off playbooks.
                </div>
              </div>
              <div className="cr-meta">
                <div className="cr-meta-v">5 categories</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)" }}>curated</div>
              </div>
            </div>
          </div>
        </div>

        <div className="filter-pills" id="hist-nav">
          {CATS.map((c) => {
            const count = c === "ALL" ? HIST.length : HIST.filter((h) => h.cat === c).length;
            return (
              <button key={c} className={`filter-pill${c === filt ? " active" : ""}`} onClick={() => setFilt(c)}>
                {c === "ALL" ? `All (${count})` : `${c} (${count})`}
              </button>
            );
          })}
        </div>

        <div className="hist-grid stagger" id="hist-grid">
          {filtered.map((h, idx) => {
            const col = catCol[h.cat] || "var(--navy)";
            return (
              <div className="hist-card" key={h.nm}>
                <div className="hist-card-top">
                  <div className="hist-card-tl">
                    <div className="hist-card-cat" style={{ color: col }}>
                      {h.cat}
                    </div>
                    <div className="hist-card-nm">{h.nm}</div>
                    <div className="hist-card-mt">
                      {h.acq} · {h.v}
                    </div>
                  </div>
                  <div className="hist-card-yr">{h.yr}</div>
                </div>
                <div className="hist-card-body">
                  <HistChart h={h} idx={idx} />
                  <div className="hist-stats">
                    <div className="hist-stat">
                      <div className="hist-stat-l">Deal Size</div>
                      <div className="hist-stat-v">{h.v}</div>
                    </div>
                    <div className="hist-stat">
                      <div className="hist-stat-l">Return</div>
                      <div className="hist-stat-v" style={{ color: h.ret.includes("-") ? "var(--crimson)" : "var(--navy)" }}>
                        {h.ret}
                      </div>
                    </div>
                    <div className="hist-stat">
                      <div className="hist-stat-l">Duration</div>
                      <div className="hist-stat-v">{h.dur}</div>
                    </div>
                  </div>
                  <div className="hist-desc">{h.desc}</div>
                  <div className="hist-outcome">
                    <div className="hist-outcome-l">Outcome</div>
                    <div className="hist-outcome-v">{h.out}</div>
                  </div>
                  <div className="hist-lesson">
                    <div className="hist-lesson-l">★ Lesson Learned</div>
                    <div className="hist-lesson-v">{h.lesson}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
