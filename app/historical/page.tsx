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

// Parse strings like "4 mo", "9 yr hold", "17 mo", "6 yr", "21 mo",
// "3 yr post", "12 yr+", "Ongoing", "363 days". Returns duration in
// MONTHS (float) so downstream date math is uniform. The previous
// implementation did `parseFloat(h.dur) || 1` which read "4 mo" as 4
// YEARS — every sub-year deal had a nonsense end date.
function parseDurationMonths(dur: string | undefined): number {
  if (!dur) return 12;
  const s = dur.toLowerCase().trim();
  if (s.includes("ongoing")) return 30; // fallback for live deals
  const num = parseFloat(dur);
  if (!Number.isFinite(num) || num <= 0) return 12;
  if (/\byr|\byear/.test(s)) return num * 12;
  if (/\bday/.test(s)) return num / 30;
  if (/\bmo|\bmonth/.test(s)) return num;
  // Unlabelled: short numbers are months, long are years.
  return num < 24 ? num : num * 12;
}

// Add N months (possibly fractional) to a date.
function addMonths(d: Date, months: number): Date {
  const dd = new Date(d);
  const whole = Math.floor(months);
  const rem = months - whole;
  dd.setMonth(dd.getMonth() + whole);
  dd.setDate(dd.getDate() + Math.round(rem * 30));
  return dd;
}

const fmtDateShort = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();

// Graphique de prix procédural (SVG déterministe, seedé par nom+année).
// Timeline X axis now reflects real calendar dates driven by h.yr and
// h.dur, not fixed index positions.
function HistChart({ h, idx }: { h: HistDeal; idx: number }) {
  const W = 320,
    H = 118,
    pL = 10,
    pR = 10,
    pT = 10,
    pB = 30;
  const iW = W - pL - pR,
    iH = H - pT - pB;
  const retNum = parseFloat(h.ret.replace(/[^0-9.-]/g, "")) * (h.ret.includes("-") ? -1 : 1) || 0;
  // Neon Grid palette: cyan for positive, crimson for negative, amber
  // for neutral / unknown. Matches the deal-detail PriceChart rework.
  const hexCol = retNum > 0 ? "#4a9cff" : retNum < 0 ? "#ff5078" : "#ffa94d";
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

  // Real dates — start month defaults to Jan of h.yr, event date lands
  // at the announce index (~3-4 months in for short deals, longer for
  // multi-year ones), end date is start + parsed duration.
  const startYear = parseInt(h.yr) || 2015;
  const start = new Date(startYear, 0, 15);
  const durMonths = parseDurationMonths(h.dur);
  const end = addMonths(start, durMonths);
  const eventOffsetMonths = (ann / (N - 1)) * durMonths;
  const event = addMonths(start, eventOffsetMonths);

  let path = `M ${xs(0)} ${ys(prices[0])}`;
  for (let i = 1; i < N; i++) path += ` L ${xs(i)} ${ys(prices[i])}`;
  const area = path + ` L ${xs(N - 1)} ${pT + iH} L ${pL} ${pT + iH} Z`;
  const annX = xs(ann),
    curX = xs(N - 1);
  const gid = `hg-${idx}`;

  const durLabel = h.dur || "";

  return (
    <div
      style={{
        background: "var(--bg-2)",
        borderRadius: "var(--r-sm)",
        padding: "var(--sp-3)",
        marginBottom: "var(--sp-3)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: ".12em",
            color: "var(--text-3)",
          }}
        >
          {h.sym || h.acq.split(" ")[0]} · {fmtDateShort(start)} → {fmtDateShort(end)}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 600,
            color: cssCol,
            letterSpacing: ".02em",
          }}
        >
          {h.ret}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: 100, display: "block" }}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hexCol} stopOpacity=".3" />
            <stop offset="100%" stopColor={hexCol} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Baseline rule — bottom of the chart area */}
        <line
          x1={pL}
          y1={pT + iH}
          x2={pL + iW}
          y2={pT + iH}
          stroke="rgba(74,156,255,.25)"
          strokeWidth="0.6"
        />

        {/* Announce / event marker */}
        <line
          x1={annX}
          y1={pT}
          x2={annX}
          y2={pT + iH}
          stroke="rgba(74,156,255,.55)"
          strokeWidth=".9"
          strokeDasharray="2,2"
        />

        <path d={area} fill={`url(#${gid})`} />
        <path d={path} fill="none" stroke={hexCol} strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx={curX} cy={ys(prices[N - 1])} r="3" fill={hexCol} stroke="var(--bg-2)" strokeWidth="1.3" />

        {/* X-axis labels: three evenly spaced calendar anchors. Left =
            deal start, centre = event date, right = end. */}
        <text
          x={pL}
          y={pT + iH + 14}
          fill="var(--text-3)"
          fontFamily="IBM Plex Mono, monospace"
          fontSize="9"
          textAnchor="start"
          letterSpacing=".04em"
        >
          {fmtDateShort(start)}
        </text>
        <text
          x={annX}
          y={pT + iH + 14}
          fill="#4a9cff"
          fontFamily="IBM Plex Mono, monospace"
          fontSize="9"
          textAnchor="middle"
          letterSpacing=".04em"
          fontWeight="600"
        >
          {fmtDateShort(event)}
        </text>
        <text
          x={pL + iW}
          y={pT + iH + 14}
          fill="var(--text-3)"
          fontFamily="IBM Plex Mono, monospace"
          fontSize="9"
          textAnchor="end"
          letterSpacing=".04em"
        >
          {fmtDateShort(end)}
        </text>
        <text
          x={annX}
          y={pT + iH + 24}
          fill="var(--text-4)"
          fontFamily="IBM Plex Mono, monospace"
          fontSize="7.5"
          textAnchor="middle"
          letterSpacing=".1em"
        >
          EVENT · {durLabel}
        </text>
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
