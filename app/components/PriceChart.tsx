"use client";

import { useEffect, useState } from "react";
import { type Deal, partyLabels } from "../data/deals";

// Deterministic merger-arb price path seeded by deal.id. Three phases:
//
//   [0 .. ann-1]   pre-announce — target drifts around the undisturbed
//                  price (`u`) with small noise.
//   [ann]          announcement — a visible gap up to ~90% of the offer
//                  distance. Real tapes show a near-vertical jump the
//                  moment the deal hits the wire.
//   [ann+1 .. N-1] post-announce arbitrage — shape depends on the deal
//                  status + closing probability, always lands on `c`.
//
// Status-driven trajectory (what the user described):
//   closing / cleared → smooth ease toward offer, spread tightens to 0
//   active / review   → modest drift to c, random walk around the mean
//   litigation / low  → spread WIDENS mid-window as doubts price in,
//                       recovers partially if prob > 50%, stays wide
//                       below offer if prob low
//   blocked / dead    → price CRASHES back toward u in the last quarter
//   closed            → pinned at offer at the final point
function genPrices(deal: Deal, N = 100) {
  const { u, c, o } = deal.pr;
  const hasOffer = o > 0;
  const prob = deal.p ?? 70;
  const st = (deal.st || "").toLowerCase();
  const isClosed = /closed|completed|cleared/.test(st);
  const isBlocked = /blocked|dead|terminated|withdrawn|failed/.test(st);
  const isLitigation = /litig|court|appeal|trial|cfius|second request/.test(st);
  const isClosing = /closing|imminent/.test(st);

  const ann = Math.floor(N * 0.3);
  const target = hasOffer ? o : c;
  const annPx = u + (target - u) * 0.9; // leave a small residual spread on announce

  let seed = deal.id * 17 + 3;
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const prices: number[] = [];

  // Pre-announce: random walk around u, ±2% band.
  for (let i = 0; i < ann; i++) {
    const noise = (rng() - 0.5) * u * 0.035;
    prices.push(u + noise);
  }

  // Announce bar — pinned (the vertical gap is the story).
  prices.push(annPx);

  // Final price always lands on `c`. The trajectory between annPx and c
  // carries the narrative, parameterised by status.
  const postN = N - ann - 1;
  const spreadMag = Math.abs(annPx - c) || Math.abs(c) * 0.02;
  const vol = spreadMag * 0.18 + Math.abs(c) * 0.004;

  for (let i = 1; i <= postN; i++) {
    const t = i / postN; // 0 → 1
    let base: number;

    if (isClosed) {
      // Already closed — settle at offer across the back half.
      base = i < postN * 0.5 ? annPx + (target - annPx) * (i / (postN * 0.5)) : target;
    } else if (isBlocked) {
      // Hold around annPx, then CRASH back toward u in the last ~25%.
      if (t < 0.75) {
        base = annPx + (annPx * 0.97 - annPx) * (t / 0.75);
      } else {
        const crashT = (t - 0.75) / 0.25;
        base = annPx * (1 - crashT) + c * crashT;
      }
    } else if (isLitigation) {
      // Spread widens into a mid-window sag, then partially recovers to c.
      // Depth of the sag scales with how low the probability is.
      const linear = annPx + (c - annPx) * t;
      const sagDepth = spreadMag * (1 - prob / 100) * 1.2;
      const sag = Math.sin(t * Math.PI) * sagDepth;
      base = linear - sag;
    } else if (isClosing || prob >= 85) {
      // Smooth ease-out convergence toward c (which is near offer).
      const eased = 1 - Math.pow(1 - t, 2.2);
      base = annPx + (c - annPx) * eased;
    } else {
      // Active / normal — gentle drift toward c with mild oscillation.
      base = annPx + (c - annPx) * t;
    }

    const noise = (rng() - 0.5) * vol;
    prices.push(base + noise);
  }

  // Ensure the series ends exactly at the known current price — otherwise
  // the KPI strip ("current $X") would disagree with the chart's last
  // point, which no analyst would forgive.
  if (prices.length >= N) prices[N - 1] = c;

  return { prices, annIdx: ann, annPx };
}

// Parse the stored announce-date string ("Apr 2026", "Sep 2026", …) to a
// mid-month Date. Returns null if unparseable so the chart can fall back
// to a neutral timeline anchored on today.
function parseAnnounceDate(ad: string | undefined): Date | null {
  if (!ad) return null;
  const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const m = ad.match(/([A-Za-z]{3,9})\s+(\d{4})/);
  if (!m) return null;
  const monIdx = months.indexOf(m[1].slice(0, 3).toLowerCase());
  if (monIdx < 0) return null;
  return new Date(parseInt(m[2], 10), monIdx, 15);
}

// Map an index 0..N-1 to a real calendar date. Pre-announce window is ~60
// days (2 days per point for 30 points). Post-announce is ~180 days (2.6
// days per point for ~70 points) — matches the typical merger-arb window.
function dateForIndex(i: number, N: number, annIdx: number, announceDate: Date): Date {
  const d = new Date(announceDate);
  if (i <= annIdx) {
    d.setDate(d.getDate() - (annIdx - i) * 2);
  } else {
    d.setDate(d.getDate() + (i - annIdx) * 2.6);
  }
  return d;
}

const fmtMonthShort = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).toUpperCase();
const fmtDateFull = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// ─────────────────────────────────────────────────────────────────────
// Inner SVG — same path math at any size. `expanded` controls font
// sizes, padding and whether we show the full dense X-axis.
// ─────────────────────────────────────────────────────────────────────
function ChartSVG({
  deal,
  W,
  H,
  expanded,
}: {
  deal: Deal;
  W: number;
  H: number;
  expanded: boolean;
}) {
  const { u: rawU, c: rawC, o, cur } = deal.pr;
  const u = rawU > 0 ? rawU : rawC;
  const c = rawC > 0 ? rawC : rawU;
  if (!u || !c) return null;
  const patchedDeal: Deal = { ...deal, pr: { ...deal.pr, u, c } };
  const hasOffer = o > 0;

  // Expanded view gets a left gutter wide enough for a $-price Y-axis
  // scale. Compact view keeps the previous tight padding — no Y-axis
  // labels there, it's a thumbnail.
  const padL = expanded ? 58 : 8;
  const padR = expanded ? 72 : 44;
  const padT = expanded ? 12 : 8;
  const padB = expanded ? 36 : 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const { prices, annIdx, annPx } = genPrices(patchedDeal, 100);
  const N = prices.length;
  let minP = Math.min(...prices, hasOffer ? o : c, u);
  let maxP = Math.max(...prices, hasOffer ? o : c, u);
  const range = maxP - minP || 1;
  minP -= range * 0.08;
  maxP += range * 0.08;
  const yScale = (p: number) => padT + innerH - ((p - minP) / (maxP - minP)) * innerH;
  const xScale = (i: number) => padL + (i / (N - 1)) * innerW;

  const announceDate = parseAnnounceDate(deal.pr.ad) ?? new Date();
  const indexToDate = (i: number) => dateForIndex(i, N, annIdx, announceDate);

  let path = `M ${xScale(0)} ${yScale(prices[0])}`;
  for (let i = 1; i < N; i++) path += ` L ${xScale(i)} ${yScale(prices[i])}`;
  const area = path + ` L ${xScale(N - 1)} ${padT + innerH} L ${padL} ${padT + innerH} Z`;
  const annX = xScale(annIdx);
  const curX = xScale(N - 1);
  const curY = yScale(c);
  const offY = hasOffer ? yScale(o) : null;
  const undY = yScale(u);
  // Neon-Grid colours. The line colour tracks the arb outcome:
  // cyan when tracking to offer, amber when lagging, crimson on decline.
  const lineCol = hasOffer
    ? c < o * 0.95
      ? "#ffa94d"
      : "#4a9cff"
    : c > u
      ? "#4a9cff"
      : "#ff5078";
  const fmtP = (p: number) =>
    p >= 1000 ? cur + (p / 1000).toFixed(2) + "k" : p >= 100 ? cur + p.toFixed(0) : cur + p.toFixed(2);
  const gid = `gr${deal.id}-${W}`;

  // X-axis ticks: every ~15 pts in compact, every 10 in expanded, labels
  // show "MMM YY" month markers. Always include announce index.
  const tickStep = expanded ? 10 : 20;
  const tickIndices: number[] = [];
  for (let i = 0; i < N; i += tickStep) tickIndices.push(i);
  if (tickIndices[tickIndices.length - 1] !== N - 1) tickIndices.push(N - 1);

  const xAxisTxt = expanded ? 10 : 8;
  const sideTxt = expanded ? 12 : 7.5;
  const sideSubTxt = expanded ? 10 : 6.5;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio={expanded ? "xMidYMid meet" : "none"}
      width="100%"
      height="100%"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineCol} stopOpacity="0.28" />
          <stop offset="100%" stopColor={lineCol} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Horizontal gridlines — subtle cyan hints over the dark ground.
         Compact view keeps the 3-line decorative grid; expanded view
         switches to a proper 5-tick Y-axis with $-labels on the left. */}
      {!expanded && (
        <>
          <line x1={padL} y1={padT + innerH * 0.25} x2={padL + innerW} y2={padT + innerH * 0.25} stroke="rgba(74,156,255,.08)" strokeWidth="0.5" />
          <line x1={padL} y1={padT + innerH * 0.5} x2={padL + innerW} y2={padT + innerH * 0.5} stroke="rgba(74,156,255,.08)" strokeWidth="0.5" />
          <line x1={padL} y1={padT + innerH * 0.75} x2={padL + innerW} y2={padT + innerH * 0.75} stroke="rgba(74,156,255,.08)" strokeWidth="0.5" />
        </>
      )}

      {expanded &&
        Array.from({ length: 5 }, (_, i) => {
          const p = minP + ((maxP - minP) * i) / 4;
          const y = yScale(p);
          return (
            <g key={`yt-${i}`}>
              <line x1={padL} y1={y} x2={padL + innerW} y2={y} stroke="rgba(74,156,255,.08)" strokeWidth="0.5" />
              <text
                x={padL - 8}
                y={y + 3}
                textAnchor="end"
                fill="#8a9bc8"
                fontFamily="IBM Plex Mono, monospace"
                fontSize="10"
                letterSpacing=".04em"
              >
                {fmtP(p)}
              </text>
            </g>
          );
        })}

      {/* Vertical announce marker */}
      <line
        x1={annX}
        y1={padT}
        x2={annX}
        y2={padT + innerH}
        stroke="rgba(74,156,255,.5)"
        strokeWidth="0.8"
        strokeDasharray="2,2"
      />
      <text
        x={annX + 4}
        y={padT + (expanded ? 14 : 9)}
        fill="#4a9cff"
        fontFamily="IBM Plex Mono, monospace"
        fontSize={expanded ? 10 : 7}
        letterSpacing="0.1em"
      >
        ANNOUNCE · {fmtMonthShort(announceDate)}
      </text>

      {/* Undisturbed baseline */}
      <line
        x1={padL}
        y1={undY}
        x2={annX}
        y2={undY}
        stroke="rgba(138,155,200,.5)"
        strokeWidth="0.8"
        strokeDasharray="3,2"
      />
      <text
        x={padL + innerW + 4}
        y={undY + 3}
        fill="#8a9bc8"
        fontFamily="IBM Plex Mono, monospace"
        fontSize={sideTxt}
      >
        {fmtP(u)}
      </text>
      <text
        x={padL + innerW + 4}
        y={undY + sideTxt + 4}
        fill="#6d7ba0"
        fontFamily="IBM Plex Mono, monospace"
        fontSize={sideSubTxt}
        letterSpacing=".08em"
      >
        UNDIST
      </text>

      {hasOffer && offY != null && (
        <>
          <line
            x1={padL}
            y1={offY}
            x2={padL + innerW}
            y2={offY}
            stroke="rgba(74,156,255,.6)"
            strokeWidth="0.9"
            strokeDasharray="4,2"
          />
          <text
            x={padL + innerW + 4}
            y={offY + 3}
            fill="#4a9cff"
            fontFamily="IBM Plex Mono, monospace"
            fontSize={sideTxt}
            fontWeight="500"
          >
            {fmtP(o)}
          </text>
          <text
            x={padL + innerW + 4}
            y={offY + sideTxt + 4}
            fill="#4a9cff"
            fontFamily="IBM Plex Mono, monospace"
            fontSize={sideSubTxt}
            letterSpacing=".08em"
            opacity="0.7"
          >
            OFFER
          </text>
        </>
      )}

      {/* Area fill + price line */}
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={lineCol} strokeWidth={expanded ? 1.6 : 1.3} strokeLinejoin="round" />

      {/* Current price marker */}
      <circle cx={annX} cy={yScale(annPx)} r={expanded ? 3.5 : 2.5} fill="#4a9cff" stroke="#0e1a3e" strokeWidth="1.5" />
      <circle cx={curX} cy={curY} r={expanded ? 4 : 3} fill={lineCol} stroke="#0e1a3e" strokeWidth="1.5" />
      <circle cx={curX} cy={curY} r={expanded ? 8 : 6} fill={lineCol} opacity="0.22" />

      {/* X-axis tick marks + date labels */}
      {tickIndices.map((i) => {
        const x = xScale(i);
        const d = indexToDate(i);
        return (
          <g key={i}>
            <line
              x1={x}
              y1={padT + innerH}
              x2={x}
              y2={padT + innerH + 3}
              stroke="rgba(74,156,255,.3)"
              strokeWidth="0.6"
            />
            <text
              x={x}
              y={padT + innerH + xAxisTxt + 4}
              textAnchor="middle"
              fill="#6d7ba0"
              fontFamily="IBM Plex Mono, monospace"
              fontSize={xAxisTxt}
              letterSpacing=".04em"
            >
              {fmtMonthShort(d)}
            </text>
          </g>
        );
      })}

      {/* Baseline rule */}
      <line
        x1={padL}
        y1={padT + innerH}
        x2={padL + innerW}
        y2={padT + innerH}
        stroke="rgba(74,156,255,.25)"
        strokeWidth="0.6"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Expanded chart modal — full-viewport overlay, responsive to size.
// ─────────────────────────────────────────────────────────────────────
function ChartModal({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const announceDate = parseAnnounceDate(deal.pr.ad);
  const { c, u, o, sym, cur } = deal.pr;
  const roles = partyLabels(deal.c);
  const fmtP = (p: number) =>
    p >= 1000 ? cur + (p / 1000).toFixed(2) + "k" : p >= 100 ? cur + p.toFixed(0) : cur + p.toFixed(2);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,10,30,.85)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--sp-4)",
      }}
    >
      <div
        style={{
          background: "#0a0f28",
          border: "1px solid rgba(74,156,255,.3)",
          borderRadius: "var(--r-md)",
          width: "min(1200px, 95vw)",
          height: "min(720px, 82vh)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,.6)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            padding: "var(--sp-4) var(--sp-5)",
            borderBottom: "1px solid rgba(74,156,255,.2)",
            flexWrap: "wrap",
            gap: "var(--sp-3)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: ".12em",
                color: "#4a9cff",
                marginBottom: 4,
                textTransform: "uppercase",
              }}
            >
              {roles.target} stock · {sym || "—"}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--text)",
                letterSpacing: ".04em",
              }}
            >
              {deal.nm}{" "}
              <span style={{ color: "var(--text-3)" }}>
                · {roles.counter.toLowerCase()}:
              </span>{" "}
              <span style={{ color: "var(--text-2)" }}>{deal.acq || "—"}</span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--text-3)",
                marginTop: 4,
                letterSpacing: ".06em",
              }}
            >
              ANNOUNCED {announceDate ? fmtDateFull(announceDate).toUpperCase() : (deal.pr.ad ?? "—")}
              {c > 0 && u > 0 && (
                <>
                  {" · CURRENT "}
                  <span style={{ color: "var(--text)" }}>{fmtP(c)}</span>
                  {" · "}
                  <span style={{ color: c >= u ? "#4a9cff" : "#ff5078" }}>
                    {c >= u ? "+" : ""}
                    {(((c - u) / u) * 100).toFixed(1)}%
                  </span>
                  {" VS UNDIST"}
                </>
              )}
              {o > 0 && (
                <>
                  {" · OFFER "}
                  <span style={{ color: "#4a9cff" }}>{fmtP(o)}</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close chart"
            style={{
              background: "transparent",
              border: "1px solid rgba(74,156,255,.3)",
              color: "var(--text-2)",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: ".1em",
              padding: "6px 12px",
              cursor: "pointer",
              borderRadius: "var(--r-sm)",
            }}
          >
            CLOSE · ESC
          </button>
        </div>
        <div style={{ flex: 1, padding: "var(--sp-4) var(--sp-5)", minHeight: 0 }}>
          <ChartSVG deal={deal} W={1100} H={520} expanded={true} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Public component — compact chart with expand affordance.
// ─────────────────────────────────────────────────────────────────────
export default function PriceChart({ deal }: { deal: Deal }) {
  const [open, setOpen] = useState(false);
  if (!deal.pr) return null;
  const { u: rawU, c: rawC, o, sym, cur, ad } = deal.pr;
  const u = rawU > 0 ? rawU : rawC;
  const c = rawC > 0 ? rawC : rawU;
  if (!u || !c) return null;

  const fmtP = (p: number) =>
    p >= 1000 ? cur + (p / 1000).toFixed(2) + "k" : p >= 100 ? cur + p.toFixed(0) : cur + p.toFixed(2);
  const hasOffer = o > 0;
  const lineCol = hasOffer ? (c < o * 0.95 ? "#ffa94d" : "#4a9cff") : c > u ? "#4a9cff" : "#ff5078";

  return (
    <>
      <div className="chart-box">
        <div className="chart-hd">
          <div>
            <div className="chart-title">
              {partyLabels(deal.c).target.toUpperCase()} · {sym}
            </div>
            <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2 }}>
              Pre-announce → current · announce: {ad}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--sp-3)" }}>
            <div style={{ textAlign: "right" }}>
              <div className="chart-price" style={{ color: lineCol }}>
                {fmtP(c)}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--text-3)",
                  marginTop: 1,
                }}
              >
                {c > u ? "+" : ""}
                {(((c - u) / u) * 100).toFixed(1)}% vs undist.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Expand chart"
              title="Expand chart"
              style={{
                background: "transparent",
                border: "1px solid rgba(74,156,255,.3)",
                color: "#4a9cff",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: ".06em",
                padding: "3px 8px",
                cursor: "pointer",
                borderRadius: "var(--r-sm)",
                lineHeight: 1,
                alignSelf: "flex-start",
              }}
            >
              ⤢
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Expand chart"
          style={{
            display: "block",
            width: "100%",
            padding: 0,
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <div style={{ height: 130, width: "100%" }}>
            <ChartSVG deal={deal} W={320} H={130} expanded={false} />
          </div>
        </button>
        <div className="chart-legend">
          <span>
            <span className="lg-dot" style={{ background: lineCol }} />
            Price
          </span>
          <span>
            <span className="lg-dot" style={{ background: "#8a9bc8", opacity: 0.7 }} />
            Undisturbed
          </span>
          {hasOffer && (
            <span>
              <span className="lg-dot" style={{ background: "#4a9cff" }} />
              Offer
            </span>
          )}
          <span>
            <span className="lg-dot" style={{ background: "#4a9cff" }} />
            Announce
          </span>
        </div>
      </div>
      {open && <ChartModal deal={deal} onClose={() => setOpen(false)} />}
    </>
  );
}
