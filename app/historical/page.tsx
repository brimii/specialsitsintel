"use client";

import { useEffect, useMemo, useState } from "react";
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
// MONTHS (float) so downstream date math is uniform.
function parseDurationMonths(dur: string | undefined): number {
  if (!dur) return 12;
  const s = dur.toLowerCase().trim();
  if (s.includes("ongoing")) return 30;
  const num = parseFloat(dur);
  if (!Number.isFinite(num) || num <= 0) return 12;
  if (/\byr|\byear/.test(s)) return num * 12;
  if (/\bday/.test(s)) return num / 30;
  if (/\bmo|\bmonth/.test(s)) return num;
  return num < 24 ? num : num * 12;
}

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
const fmtDateLong = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// ─────────────────────────────────────────────────────────────────────
// Procedural price path, deterministic per (name, year). Returns 80
// points spanning the deal's full timeline. Reused by both compact
// and expanded renders; zoom is a view-side slice, not a regen.
// ─────────────────────────────────────────────────────────────────────
function useHistPrices(h: HistDeal) {
  return useMemo(() => {
    const retNum = parseFloat(h.ret.replace(/[^0-9.-]/g, "")) * (h.ret.includes("-") ? -1 : 1) || 0;
    let seed = h.nm.length * 17 + parseInt(h.yr) * 3;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const N = 80;
    const ann = 22;
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
      px =
        prices[i - 1] +
        (tgt(prices[ann]) - prices[i - 1]) * 0.15 +
        (rng() - 0.5) * Math.abs(retNum || 5) * 0.04;
      prices.push(px);
    }
    return { prices, ann, N, retNum };
  }, [h]);
}

// ─────────────────────────────────────────────────────────────────────
// Inner SVG — renders a window [sliceStart..sliceEnd] of the price
// series over the chart viewport. `expanded` scales typography and
// padding for the fullscreen modal.
// ─────────────────────────────────────────────────────────────────────
function HistChartSVG({
  h,
  idx,
  sliceStart,
  sliceEnd,
  W,
  H,
  expanded,
}: {
  h: HistDeal;
  idx: number;
  sliceStart: number;
  sliceEnd: number;
  W: number;
  H: number;
  expanded: boolean;
}) {
  const { prices, ann, N, retNum } = useHistPrices(h);
  const hexCol = retNum > 0 ? "#4a9cff" : retNum < 0 ? "#ff5078" : "#ffa94d";

  const startYear = parseInt(h.yr) || 2015;
  const start = new Date(startYear, 0, 15);
  const durMonths = parseDurationMonths(h.dur);
  const end = addMonths(start, durMonths);
  const indexToDate = (i: number) => addMonths(start, (i / (N - 1)) * durMonths);
  const annDate = indexToDate(ann);

  const pL = expanded ? 14 : 10;
  const pR = expanded ? 14 : 10;
  const pT = expanded ? 14 : 10;
  const pB = expanded ? 42 : 30;
  const iW = W - pL - pR;
  const iH = H - pT - pB;

  // Slice the full series to the requested window.
  const a = Math.max(0, Math.min(N - 1, sliceStart));
  const b = Math.max(a + 1, Math.min(N - 1, sliceEnd));
  const visible = prices.slice(a, b + 1);
  const visCount = visible.length;

  let mn = Math.min(...visible);
  let mx = Math.max(...visible);
  const rng2 = mx - mn || 1;
  mn -= rng2 * 0.05;
  mx += rng2 * 0.08;
  const ys = (p: number) => pT + iH - ((p - mn) / (mx - mn)) * iH;
  const xs = (i: number) => pL + ((i - a) / (visCount - 1)) * iW;

  let path = `M ${xs(a)} ${ys(visible[0])}`;
  for (let i = 1; i < visCount; i++) path += ` L ${xs(a + i)} ${ys(visible[i])}`;
  const area = path + ` L ${xs(b)} ${pT + iH} L ${pL} ${pT + iH} Z`;

  const annVisible = ann >= a && ann <= b;
  const annX = annVisible ? xs(ann) : null;
  const curX = xs(b);
  const curY = ys(visible[visCount - 1]);
  const gid = `hg-${idx}-${a}-${b}-${expanded ? "x" : "c"}`;

  // X-axis label anchors: always first + last visible, plus event
  // marker if visible + optional middle anchor when range is wide.
  const anchors: Array<{ i: number; label: string; kind: "edge" | "event" | "mid" }> = [
    { i: a, label: fmtDateShort(indexToDate(a)), kind: "edge" },
  ];
  if (annVisible) anchors.push({ i: ann, label: fmtDateShort(annDate), kind: "event" });
  const spanRatio = visCount / N;
  if (expanded && spanRatio > 0.4) {
    const mid = Math.floor((a + b) / 2);
    if (Math.abs(mid - ann) > 6 && Math.abs(mid - a) > 6 && Math.abs(mid - b) > 6) {
      anchors.push({ i: mid, label: fmtDateShort(indexToDate(mid)), kind: "mid" });
    }
  }
  anchors.push({ i: b, label: fmtDateShort(indexToDate(b)), kind: "edge" });
  anchors.sort((p, q) => p.i - q.i);

  const axisFs = expanded ? 11 : 9;
  const labelY = pT + iH + axisFs + 4;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio={expanded ? "xMidYMid meet" : "none"}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hexCol} stopOpacity=".3" />
          <stop offset="100%" stopColor={hexCol} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Horizontal gridlines on expanded view */}
      {expanded && (
        <>
          <line x1={pL} y1={pT + iH * 0.25} x2={pL + iW} y2={pT + iH * 0.25} stroke="rgba(74,156,255,.08)" strokeWidth="0.5" />
          <line x1={pL} y1={pT + iH * 0.5} x2={pL + iW} y2={pT + iH * 0.5} stroke="rgba(74,156,255,.08)" strokeWidth="0.5" />
          <line x1={pL} y1={pT + iH * 0.75} x2={pL + iW} y2={pT + iH * 0.75} stroke="rgba(74,156,255,.08)" strokeWidth="0.5" />
        </>
      )}

      <line x1={pL} y1={pT + iH} x2={pL + iW} y2={pT + iH} stroke="rgba(74,156,255,.25)" strokeWidth="0.6" />

      {annX !== null && (
        <>
          <line
            x1={annX}
            y1={pT}
            x2={annX}
            y2={pT + iH}
            stroke="rgba(74,156,255,.55)"
            strokeWidth={expanded ? 1 : 0.9}
            strokeDasharray="2,2"
          />
          {expanded && (
            <text
              x={annX + 4}
              y={pT + 14}
              fill="#4a9cff"
              fontFamily="IBM Plex Mono, monospace"
              fontSize="11"
              letterSpacing=".1em"
            >
              EVENT · {fmtDateShort(annDate)}
            </text>
          )}
        </>
      )}

      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={hexCol} strokeWidth={expanded ? 2 : 1.6} strokeLinejoin="round" />
      <circle
        cx={curX}
        cy={curY}
        r={expanded ? 4 : 3}
        fill={hexCol}
        stroke="var(--bg-2)"
        strokeWidth={expanded ? 1.6 : 1.3}
      />
      {expanded && <circle cx={curX} cy={curY} r="8" fill={hexCol} opacity="0.22" />}

      {/* X axis labels */}
      {anchors.map((anc, i) => {
        const x = xs(anc.i);
        const isEdge = anc.kind === "edge";
        return (
          <g key={i}>
            <line
              x1={x}
              y1={pT + iH}
              x2={x}
              y2={pT + iH + (anc.kind === "event" ? 5 : 3)}
              stroke={anc.kind === "event" ? "#4a9cff" : "rgba(74,156,255,.3)"}
              strokeWidth="0.7"
            />
            <text
              x={x}
              y={labelY}
              fill={anc.kind === "event" ? "#4a9cff" : "var(--text-3)"}
              fontFamily="IBM Plex Mono, monospace"
              fontSize={axisFs}
              textAnchor={isEdge && anc.i === a ? "start" : isEdge && anc.i === b ? "end" : "middle"}
              letterSpacing=".04em"
              fontWeight={anc.kind === "event" ? "600" : "400"}
            >
              {anc.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Fullscreen modal — shows the same deal with a larger SVG and a
// zoom-period toolbar. Buttons filter to the last N months. "ALL"
// shows the complete arc; shorter periods are hidden when they'd be
// longer than the deal's own duration.
// ─────────────────────────────────────────────────────────────────────
const PERIODS = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "2Y", months: 24 },
  { label: "5Y", months: 60 },
  { label: "10Y", months: 120 },
];

function HistChartModal({ h, idx, onClose }: { h: HistDeal; idx: number; onClose: () => void }) {
  const durMonths = parseDurationMonths(h.dur);
  const available = useMemo(
    () => [...PERIODS.filter((p) => p.months < durMonths * 0.95), { label: "ALL", months: durMonths }],
    [durMonths],
  );
  const [period, setPeriod] = useState(available[available.length - 1].label);

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

  const N = 80;
  const activePeriod = available.find((p) => p.label === period) ?? available[available.length - 1];
  const sliceLen = Math.max(5, Math.round((activePeriod.months / durMonths) * (N - 1)));
  const sliceEnd = N - 1;
  const sliceStart = Math.max(0, sliceEnd - sliceLen);

  const startYear = parseInt(h.yr) || 2015;
  const start = new Date(startYear, 0, 15);
  const end = addMonths(start, durMonths);
  const indexToDate = (i: number) => addMonths(start, (i / (N - 1)) * durMonths);
  const visStart = indexToDate(sliceStart);
  const visEnd = indexToDate(sliceEnd);

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
          height: "min(720px, 85vh)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
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
                fontSize: 10,
                letterSpacing: ".12em",
                color: catCol[h.cat] ?? "var(--navy)",
                marginBottom: 4,
                textTransform: "uppercase",
              }}
            >
              {h.cat} · {h.yr}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
              {h.nm}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: ".04em" }}>
              {h.acq} · {h.v} · {fmtDateLong(start)} → {fmtDateLong(end)} · {h.dur}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", flexShrink: 0 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 18,
                fontWeight: 700,
                color: h.ret.includes("-") ? "#ff5078" : "#4a9cff",
                letterSpacing: ".02em",
              }}
            >
              {h.ret}
            </span>
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
        </div>

        {/* Period toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--sp-2)",
            padding: "var(--sp-3) var(--sp-5)",
            borderBottom: "1px solid rgba(74,156,255,.15)",
            background: "rgba(74,156,255,.04)",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: ".12em",
              color: "var(--text-3)",
              textTransform: "uppercase",
              marginRight: "var(--sp-2)",
            }}
          >
            Zoom
          </span>
          {available.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setPeriod(p.label)}
              style={{
                background: period === p.label ? "rgba(74,156,255,.18)" : "transparent",
                border: `1px solid ${period === p.label ? "#4a9cff" : "rgba(74,156,255,.3)"}`,
                color: period === p.label ? "#4a9cff" : "var(--text-2)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: ".06em",
                padding: "4px 10px",
                cursor: "pointer",
                borderRadius: "var(--r-sm)",
                fontWeight: period === p.label ? 600 : 400,
              }}
            >
              {p.label}
            </button>
          ))}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: ".06em",
              color: "var(--text-3)",
              marginLeft: "auto",
            }}
          >
            {fmtDateShort(visStart)} → {fmtDateShort(visEnd)}
          </span>
        </div>

        {/* Chart */}
        <div style={{ flex: 1, padding: "var(--sp-4) var(--sp-5)", minHeight: 0 }}>
          <HistChartSVG
            h={h}
            idx={idx}
            sliceStart={sliceStart}
            sliceEnd={sliceEnd}
            W={1100}
            H={440}
            expanded={true}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Public compact chart — click to expand into HistChartModal.
// ─────────────────────────────────────────────────────────────────────
function HistChart({ h, idx }: { h: HistDeal; idx: number }) {
  const [open, setOpen] = useState(false);
  const retNum = parseFloat(h.ret.replace(/[^0-9.-]/g, "")) * (h.ret.includes("-") ? -1 : 1) || 0;
  const cssCol = retNum > 0 ? "var(--navy)" : retNum < 0 ? "var(--crimson)" : "var(--amber)";
  const startYear = parseInt(h.yr) || 2015;
  const start = new Date(startYear, 0, 15);
  const durMonths = parseDurationMonths(h.dur);
  const end = addMonths(start, durMonths);

  return (
    <>
      <div
        style={{
          background: "var(--bg-2)",
          borderRadius: "var(--r-sm)",
          padding: "var(--sp-3)",
          marginBottom: "var(--sp-3)",
          border: "1px solid var(--border)",
          position: "relative",
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                fontSize: 11,
                padding: "2px 6px",
                cursor: "pointer",
                borderRadius: "var(--r-sm)",
                lineHeight: 1,
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
            height: 100,
          }}
        >
          <HistChartSVG h={h} idx={idx} sliceStart={0} sliceEnd={79} W={320} H={118} expanded={false} />
        </button>
      </div>
      {open && <HistChartModal h={h} idx={idx} onClose={() => setOpen(false)} />}
    </>
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
              Click any chart to open the fullscreen view and zoom to a specific window.
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
