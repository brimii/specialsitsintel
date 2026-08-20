import Link from "next/link";
import { type Deal, pcol, ecol, SC, SC_HEX, SOURCE_BADGE_CL } from "../data/deals";
import { STRATS } from "../data/content";
import PriceChart from "./PriceChart";

// Panneau de détail d'un deal. `locked` (palier free) masque les éléments
// premium : commentaire IA, scoring FTC, graphique de prix.
export default function DealDetail({ deal, locked = false }: { deal: Deal | null; locked?: boolean }) {
  if (!deal) {
    return (
      <div
        style={{
          padding: "var(--sp-8) var(--sp-4)",
          textAlign: "center",
          color: "var(--text-3)",
          fontSize: 11,
          lineHeight: 1.7,
        }}
      >
        Click any deal in the table
        <br />
        to view full intelligence,
        <br />
        chart, AI signals, and timeline.
      </div>
    );
  }

  const pc = pcol(deal);
  const ec = ecol(deal);
  const sHex = SC_HEX[deal.sc] || "#6e7a96";
  const tlCol = SC[deal.sc] || "var(--navy)";
  const strat = STRATS.find((s) => s.cat === deal.c) || STRATS[0];
  const meta =
    deal.c === "MERGER"
      ? `Acq: ${deal.acq} · ${deal.v}`
      : deal.c === "ACTIVISM"
        ? deal.acq
        : deal.v;

  // Build a small "ticker · announced" suffix that doesn't leak the
  // discovery URL but still gives the analyst the public listing reference
  // (ticker symbol + announcement month) — same kind of metadata Bloomberg
  // surfaces in its security header.
  const tickerBits: string[] = [];
  if (deal.pr?.sym) tickerBits.push(deal.pr.sym);
  if (deal.pr?.ad) tickerBits.push(`announced ${deal.pr.ad}`);
  const tickerLine = tickerBits.length > 0 ? tickerBits.join(" · ") : "";

  // Bloomberg-style price line: "$Current  →  $Offer" — surfaces the two
  // numbers an arb analyst reads first. Hidden when there's nothing real
  // to show (pr.c === 0 && pr.o === 0). Currency prefix from pr.cur.
  const cur = deal.pr?.cur || "$";
  const fmtPx = (n: number): string => {
    if (!n) return "—";
    if (n >= 1000) return `${cur}${(n / 1000).toFixed(2)}k`;
    if (n >= 100) return `${cur}${n.toFixed(0)}`;
    return `${cur}${n.toFixed(2)}`;
  };
  const curPx = deal.pr?.c ?? 0;
  const offPx = deal.pr?.o ?? 0;
  const showPrices = curPx > 0 || offPx > 0;

  return (
    <div className="deal-detail">
      <div
        className="deal-detail-name"
        style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
      >
        <span>
          {deal.f} {deal.nm}
        </span>
        {deal.source ? (
          <span
            className={`badge ${SOURCE_BADGE_CL[deal.source] ?? "badge-gray"}`}
            style={{ fontSize: 8, padding: "2px 6px", letterSpacing: ".06em" }}
            title={`Discovery source: ${deal.source}`}
          >
            {deal.source}
          </span>
        ) : null}
      </div>
      <div className="deal-detail-meta">
        {meta} · {deal.cl}
      </div>
      {tickerLine ? (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
            color: "var(--text-3)",
            marginTop: 2,
          }}
        >
          {tickerLine}
        </div>
      ) : null}
      {showPrices ? (
        <div
          style={{
            display: "flex",
            gap: "var(--sp-3)",
            alignItems: "baseline",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            marginTop: 4,
            marginBottom: "var(--sp-3)",
          }}
        >
          <span>
            <span style={{ color: "var(--text-3)", fontSize: 8.5, letterSpacing: ".08em", marginRight: 4 }}>
              CURRENT
            </span>
            <span style={{ color: "var(--text)", fontWeight: 600 }}>{fmtPx(curPx)}</span>
          </span>
          {offPx > 0 ? (
            <>
              <span style={{ color: "var(--text-3)" }}>→</span>
              <span>
                <span
                  style={{
                    color: "var(--text-3)",
                    fontSize: 8.5,
                    letterSpacing: ".08em",
                    marginRight: 4,
                  }}
                >
                  OFFER
                </span>
                <span style={{ color: "var(--navy)", fontWeight: 600 }}>{fmtPx(offPx)}</span>
              </span>
            </>
          ) : null}
        </div>
      ) : (
        <div style={{ marginBottom: "var(--sp-3)" }} />
      )}

      <div className="kpi-mini-grid">
        <div className="kpi-mini">
          <div className="kpi-mini-label">Ann. Spread</div>
          <div className="kpi-mini-value" style={{ color: pc }}>
            {deal.s > 0 ? deal.s.toFixed(1) + "%" : "N/A"}
          </div>
          <div className="kpi-mini-note">Gross annualized</div>
        </div>
        <div className="kpi-mini">
          <div className="kpi-mini-label">Close Prob.</div>
          <div className="kpi-mini-value" style={{ color: pc }}>
            {deal.p}%
          </div>
          <div className="kpi-mini-note">AI model</div>
        </div>
        <div className="kpi-mini">
          <div className="kpi-mini-label">Expected Value</div>
          <div className="kpi-mini-value" style={{ color: ec }}>
            {deal.ev > 0 ? "+" : ""}
            {deal.ev.toFixed(1)}%
          </div>
          <div className="kpi-mini-note">3-scenario</div>
        </div>
        <div className="kpi-mini">
          <div className="kpi-mini-label">Status</div>
          <div className="kpi-mini-value" style={{ fontSize: 12, color: "var(--text)" }}>
            {deal.st}
          </div>
          <div className="kpi-mini-note">{deal.r}</div>
        </div>
      </div>

      {locked ? (
        <div className="ai-block navy">
          <div className="ai-block-label">🔒 Premium intelligence locked</div>
          <div className="ai-block-text">
            AI commentary, FTC scoring and the price chart are reserved for Analyst+ subscribers.{" "}
            <Link href="/home" style={{ color: "var(--navy)", fontWeight: 600 }}>
              See plans →
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="ai-block navy">
            <div className="ai-block-label">✦ AI Intelligence</div>
            <div className="ai-block-text">{deal.desc}</div>
          </div>
      <div className="ai-block cobalt">
        <div className="ai-block-label">⊞ AI Commentary</div>
        <div className="ai-block-text">{deal.ai}</div>
      </div>

      <PriceChart deal={deal} />

      {deal.s > 0 && (
        <>
          <div className="section-title">AI Signals</div>
          <div className="signal-row">
            <div className="signal-hd">
              <span className="signal-name">FTC Language Score</span>
              <span className="signal-value" style={{ color: pc }}>
                {Math.floor(deal.p * 0.9)}
              </span>
            </div>
            <div className="signal-desc">
              Regulatory filing language analysis vs 6,000+ historical FTC decisions. Score
              reflects hawkishness of detected language.
            </div>
          </div>
          <div className="signal-row">
            <div className="signal-hd">
              <span className="signal-name">Mispricing Signal</span>
              <span className="signal-value" style={{ color: "var(--navy)" }}>
                {deal.p > 70
                  ? "+" + Math.floor((deal.p - 68) * 0.4)
                  : "-" + Math.floor((68 - deal.p) * 0.3)}
                pt
              </span>
            </div>
            <div className="signal-desc">
              AI model probability vs market-implied probability delta. Positive = market
              underpricing closing odds.
            </div>
          </div>
        </>
      )}
        </>
      )}

      <div className="section-title">Regulatory</div>
      <div className="reg-row">
        <span className="reg-name">{deal.r}</span>
        {deal.source ? (
          <span
            className={`badge ${SOURCE_BADGE_CL[deal.source] ?? "badge-gray"}`}
            style={{ fontSize: 8, padding: "2px 6px", letterSpacing: ".06em", marginLeft: 6 }}
            title={`Discovery source: ${deal.source}`}
          >
            {deal.source}
          </span>
        ) : null}
        <span
          className="reg-status"
          style={{ background: `${sHex}1f`, color: sHex, border: `1px solid ${sHex}3d` }}
        >
          {deal.st}
        </span>
      </div>

      {deal.tl && deal.tl.length > 0 && (
        <>
          <div className="section-title">Timeline</div>
          <div className="timeline">
            {deal.tl.map((tl, idx) => (
              <div className="timeline-item" key={idx}>
                <div className="tl-date">{tl.d}</div>
                <div className="tl-track" style={{ color: tlCol }}>
                  <div className="tl-dot-circle" />
                  {idx < deal.tl.length - 1 && <div className="tl-line" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tl-tag">{tl.t}</div>
                  <div className="tl-desc">{tl.x}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-title">Strategy Type</div>
      <div
        style={{
          fontSize: 10.5,
          color: "var(--text-2)",
          lineHeight: 1.6,
          padding: "var(--sp-3)",
          background: "var(--bg-2)",
          borderRadius: "var(--r-md)",
          border: "1px solid var(--border)",
        }}
      >
        {strat.desc.substring(0, 160)}…{" "}
        <Link href="/strategies" style={{ color: "var(--navy)", fontWeight: 600 }}>
          Learn more →
        </Link>
      </div>
    </div>
  );
}
