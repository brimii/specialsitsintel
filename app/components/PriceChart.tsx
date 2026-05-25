import { type Deal } from "../data/deals";

const CHART_BG = "#ece8de";

// Génération déterministe du parcours de prix (seedé par deal.id) — porté de la maquette.
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

export default function PriceChart({ deal }: { deal: Deal }) {
  if (!deal.pr) return null;
  const { u, c, o, sym, cur, ad } = deal.pr;
  if (!u || !c) return null;

  const hasOffer = o > 0;
  const W = 280,
    H = 110,
    padL = 8,
    padR = 44,
    padT = 8,
    padB = 18;
  const innerW = W - padL - padR,
    innerH = H - padT - padB;
  const { prices, annIdx, annPx } = genPrices(deal, 100);
  const N = prices.length;
  let minP = Math.min(...prices, hasOffer ? o : c, u);
  let maxP = Math.max(...prices, hasOffer ? o : c, u);
  const range = maxP - minP || 1;
  minP -= range * 0.08;
  maxP += range * 0.08;
  const yScale = (p: number) => padT + innerH - ((p - minP) / (maxP - minP)) * innerH;
  const xScale = (i: number) => padL + (i / (N - 1)) * innerW;
  let path = `M ${xScale(0)} ${yScale(prices[0])}`;
  for (let i = 1; i < N; i++) path += ` L ${xScale(i)} ${yScale(prices[i])}`;
  const area = path + ` L ${xScale(N - 1)} ${padT + innerH} L ${padL} ${padT + innerH} Z`;
  const annX = xScale(annIdx);
  const curX = xScale(N - 1),
    curY = yScale(c);
  const offY = hasOffer ? yScale(o) : null;
  const undY = yScale(u);
  const lineCol = hasOffer ? (c < o * 0.95 ? "#9c6d2a" : "#162f68") : c > u ? "#162f68" : "#a83232";
  const fmtP = (p: number) =>
    p >= 1000 ? cur + (p / 1000).toFixed(2) + "k" : p >= 100 ? cur + p.toFixed(0) : cur + p.toFixed(2);
  const gid = `gr${deal.id}`;

  return (
    <div className="chart-box">
      <div className="chart-hd">
        <div>
          <div className="chart-title">{sym} · PRICE CHART</div>
          <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2 }}>
            Pre-announce → current · announce: {ad}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="chart-price" style={{ color: lineCol }}>
            {fmtP(c)}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)", marginTop: 1 }}>
            {c > u ? "+" : ""}
            {(((c - u) / u) * 100).toFixed(1)}% vs undist.
          </div>
        </div>
      </div>
      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineCol} stopOpacity="0.16" />
            <stop offset="100%" stopColor={lineCol} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={padL} y1={padT + innerH * 0.33} x2={padL + innerW} y2={padT + innerH * 0.33} stroke="rgba(14,30,60,.05)" strokeWidth="0.5" />
        <line x1={padL} y1={padT + innerH * 0.66} x2={padL + innerW} y2={padT + innerH * 0.66} stroke="rgba(14,30,60,.05)" strokeWidth="0.5" />
        <line x1={annX} y1={padT} x2={annX} y2={padT + innerH} stroke="rgba(54,96,160,0.35)" strokeWidth="0.7" strokeDasharray="2,2" />
        <text x={annX + 3} y={padT + 9} fill="#3660a0" fontFamily="DM Mono,monospace" fontSize="7" letterSpacing="0.5">
          ANNOUNCE
        </text>
        <line x1={padL} y1={undY} x2={annX} y2={undY} stroke="rgba(110,122,150,0.4)" strokeWidth="0.7" strokeDasharray="3,2" />
        <text x={padL + innerW + 2} y={undY + 2} fill="#374160" fontFamily="DM Mono,monospace" fontSize="7.5">
          {fmtP(u)}
        </text>
        <text x={padL + innerW + 2} y={undY + 10} fill="#6e7a96" fontFamily="DM Mono,monospace" fontSize="6.5">
          undist.
        </text>
        {hasOffer && offY != null && (
          <>
            <line x1={padL} y1={offY} x2={padL + innerW} y2={offY} stroke="rgba(22,47,104,0.55)" strokeWidth="0.8" strokeDasharray="4,2" />
            <text x={padL + innerW + 2} y={offY + 2} fill="#162f68" fontFamily="DM Mono,monospace" fontSize="7.5" fontWeight="500">
              {fmtP(o)}
            </text>
            <text x={padL + innerW + 2} y={offY + 10} fill="#0f2050" fontFamily="DM Mono,monospace" fontSize="6.5">
              offer
            </text>
          </>
        )}
        <path d={area} fill={`url(#${gid})`} />
        <path d={path} fill="none" stroke={lineCol} strokeWidth="1.3" strokeLinejoin="round" />
        <circle cx={annX} cy={yScale(annPx)} r="2.5" fill="#3660a0" stroke={CHART_BG} strokeWidth="1.2" />
        <circle cx={curX} cy={curY} r="3" fill={lineCol} stroke={CHART_BG} strokeWidth="1.2" />
        <circle cx={curX} cy={curY} r="6" fill={lineCol} opacity="0.22" />
      </svg>
      <div className="chart-legend">
        <span>
          <span className="lg-dot" style={{ background: lineCol }} />
          Price
        </span>
        <span>
          <span className="lg-dot" style={{ background: "#374160", opacity: 0.6 }} />
          Undisturbed
        </span>
        {hasOffer && (
          <span>
            <span className="lg-dot" style={{ background: "#162f68" }} />
            Offer Price
          </span>
        )}
        <span>
          <span className="lg-dot" style={{ background: "#3660a0" }} />
          Announce
        </span>
      </div>
    </div>
  );
}
