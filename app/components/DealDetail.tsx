import Link from "next/link";
import {
  type Deal,
  pcol,
  partyLabels,
  countryFlag,
  annualisedSpread,
  scoreGrade,
} from "../data/deals";
import { STRATS } from "../data/content";
import PriceChart from "./PriceChart";

// Score grade → colour. Mirrors the old SC_HEX mapping so pills stay
// consistent with the Neon Grid palette.
const GRADE_HEX: Record<string, string> = {
  G: "#4a9cff",
  A: "#ffa94d",
  R: "#ff5078",
};

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
  const grade = scoreGrade(deal);
  const gradeHex = GRADE_HEX[grade];
  const roles = partyLabels(deal.category);
  const flag = countryFlag(deal.target_country);
  const strat = STRATS.find((s) => s.cat === deal.category) || STRATS[0];
  const annSpread = annualisedSpread(deal);

  const cur = deal.currency || "USD";
  const curSym = cur === "USD" ? "$" : cur === "EUR" ? "€" : cur === "GBP" ? "£" : cur === "JPY" ? "¥" : cur + " ";
  const fmtPx = (n: number | undefined | null): string => {
    if (!n) return "—";
    if (n >= 1000) return `${curSym}${(n / 1000).toFixed(2)}k`;
    if (n >= 100) return `${curSym}${n.toFixed(0)}`;
    return `${curSym}${n.toFixed(2)}`;
  };
  const curPx = deal.current_price ?? 0;
  const offPx = deal.offer_total_per_share ?? 0;
  const showPrices = curPx > 0 || offPx > 0;

  const tickerBits: string[] = [];
  if (deal.target_ticker) tickerBits.push(deal.target_ticker);
  if (deal.announce_date) tickerBits.push(`announced ${deal.announce_date}`);
  const tickerLine = tickerBits.join(" · ");

  return (
    <div className="deal-detail">
      <div
        className="deal-detail-name"
        style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
      >
        <span>
          {flag} {deal.target_name}
        </span>
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

      {/* TARGET → COUNTERPARTY block */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: "var(--sp-2)",
          marginTop: "var(--sp-3)",
          padding: "var(--sp-3)",
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-sm)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: ".12em", color: "var(--text-3)", textTransform: "uppercase", marginBottom: 3 }}>
            {roles.target}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", lineHeight: 1.25 }}>
            {deal.target_name}
          </div>
          {deal.target_ticker ? (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--navy)", marginTop: 2, letterSpacing: ".04em" }}>
              {deal.target_ticker}
            </div>
          ) : null}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-3)", fontSize: 14, textAlign: "center" }}>
          {roles.counterGlyph}
        </div>
        <div style={{ minWidth: 0, textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: ".12em", color: "var(--text-3)", textTransform: "uppercase", marginBottom: 3 }}>
            {roles.counter}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", lineHeight: 1.25 }}>
            {deal.counterparty_name || "—"}
          </div>
          {deal.transaction_value_usd ? (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)", marginTop: 2, letterSpacing: ".04em" }}>
              ${(deal.transaction_value_usd / 1e9).toFixed(1)}B
            </div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: "var(--text-3)",
          marginTop: 6,
          letterSpacing: ".06em",
          textTransform: "uppercase",
        }}
      >
        Close estimate · {deal.expected_close || "TBD"}
      </div>

      {showPrices ? (
        <div
          style={{
            display: "flex",
            gap: "var(--sp-3)",
            alignItems: "baseline",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            marginTop: "var(--sp-3)",
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
                <span style={{ color: "var(--text-3)", fontSize: 8.5, letterSpacing: ".08em", marginRight: 4 }}>
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
          <div className="kpi-mini-value" style={{ color: annSpread != null ? pc : "var(--text-3)" }}>
            {annSpread != null ? `${annSpread.toFixed(1)}%` : "—"}
          </div>
          <div className="kpi-mini-note">{annSpread != null ? "Gross annualized" : "Awaiting price/close"}</div>
        </div>
        <div className="kpi-mini">
          <div className="kpi-mini-label">Close Prob.</div>
          <div className="kpi-mini-value" style={{ color: pc }}>
            {deal.closing_probability != null ? `${Math.round(deal.closing_probability)}%` : "—"}
          </div>
          <div className="kpi-mini-note">AI model</div>
        </div>
        <div className="kpi-mini">
          <div className="kpi-mini-label">Score</div>
          <div className="kpi-mini-value" style={{ color: gradeHex }}>
            {grade}
          </div>
          <div className="kpi-mini-note">{grade === "G" ? "Green" : grade === "A" ? "Amber" : "Red"}</div>
        </div>
        <div className="kpi-mini">
          <div className="kpi-mini-label">Status</div>
          <div className="kpi-mini-value" style={{ fontSize: 12, color: "var(--text)" }}>
            {deal.status}
          </div>
          <div className="kpi-mini-note">{deal.primary_regulators?.[0] || "—"}</div>
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
          {deal.short_desc ? (
            <div className="ai-block navy">
              <div className="ai-block-label">✦ Situation</div>
              <div className="ai-block-text">{deal.short_desc}</div>
            </div>
          ) : null}
          {deal.ai_commentary ? (
            <div className="ai-block cobalt">
              <div className="ai-block-label">⊞ AI Commentary</div>
              <div className="ai-block-text">{deal.ai_commentary}</div>
            </div>
          ) : null}

          <PriceChart deal={deal} />
        </>
      )}

      <div className="section-title">Regulatory</div>
      <div className="reg-row">
        <span className="reg-name">
          {deal.primary_regulators?.length ? deal.primary_regulators.join(" · ") : "—"}
        </span>
        {deal.regulatory_phase ? (
          <span className="badge badge-navy" style={{ marginLeft: 6 }}>
            {deal.regulatory_phase}
          </span>
        ) : null}
        <span
          className="reg-status"
          style={{ background: `${gradeHex}1f`, color: gradeHex, border: `1px solid ${gradeHex}3d` }}
        >
          {deal.status}
        </span>
      </div>

      {deal.timeline && deal.timeline.length > 0 && (
        <>
          <div className="section-title">Timeline</div>
          <div className="timeline">
            {deal.timeline.map((tl, idx) => (
              <div className="timeline-item" key={idx}>
                <div className="tl-date">{tl.date}</div>
                <div className="tl-track" style={{ color: gradeHex }}>
                  <div className="tl-dot-circle" />
                  {idx < deal.timeline.length - 1 && <div className="tl-line" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tl-tag">{tl.event_type}</div>
                  <div className="tl-desc">{tl.summary}</div>
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
