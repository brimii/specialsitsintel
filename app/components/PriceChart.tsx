"use client";

import { useEffect, useState } from "react";
import { type Deal } from "../data/deals";

// Deterministic price-path synth (seeded by deal.id) — ported from the mock.
// Points 0..annIdx cover the pre-announce window, annIdx is the announcement
// spike, annIdx+1..N-1 cover the post-announce arbitrage path.
function genPrices(deal: Deal, N = 100) {
  const { u, c, o } = deal.pr;
  const hasOffer = o > 0;
  const target = hasOffer ? o : c;
  const ann = Math.floor(N * 0.3);
  const prices: number[] = [];
  let seed = deal.id * 17 + 3;
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  let px = u;
  for (let i = 0; i < ann; i++) {
    px += u * (rng() - 0.5) * 0.018;
    px = Math.max(u * 0.94, Math.min(u * 1.06, px));
    prices.push(px);
  }
  const annPx = u + (target - u) * 0.85 + (rng() - 0.5) * u * 0.02;
  prices.push(annPx);
  for (let i = ann + 1; i < N; i++) {
    const t = (i - ann) / (N - ann);
    const targetT = annPx + (c - annPx) * Math.pow(t, 1.2);
    px = prices[i - 1] + (targetT - prices[i - 1]) * 0.18 + (rng() - 0.5) * Math.abs(c) * 0.012;
    prices.push(px);
  }
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

  const padL = expanded ? 14 : 8;
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

      {/* Horizontal gridlines — subtle cyan hints over the dark ground */}
      <line
        x1={padL}
        y1={padT + innerH * 0.25}
        x2={padL + innerW}
        y2={padT + innerH * 0.25}
        stroke="rgba(74,156,255,.08)"
        strokeWidth="0.5"
      />
      <line
        x1={padL}
        y1={padT + innerH * 0.5}
        x2={padL + innerW}
        y2={padT + innerH * 0.5}
        stroke="rgba(74,156,255,.08)"
        strokeWidth="0.5"
      />
      <line
        x1={padL}
        y1={padT + innerH * 0.75}
        x2={padL + innerW}
        y2={padT + innerH * 0.75}
        stroke="rgba(74,156,255,.08)"
        strokeWidth="0.5"
      />

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
                letterSpacing: ".1em",
                color: "#4a9cff",
                marginBottom: 4,
              }}
            >
              {sym || "—"} · PRICE CHART
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--text)",
                letterSpacing: ".04em",
              }}
            >
              {deal.nm} <span style={{ color: "var(--text-3)" }}>· {deal.acq}</span>
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
            <div className="chart-title">{sym} · PRICE CHART</div>
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
