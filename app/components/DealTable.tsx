import {
  type Deal,
  pcol,
  fmtCap,
  BADGE_CL,
  CLS,
  partyLabels,
  countryFlag,
  annualisedSpread,
} from "../data/deals";

// "LIVE" when touched within 5 min, else shortest unit under which the
// age fits. Powers the small "updated Xm ago" pill in the Announced
// cell — reads deal.updated_at directly.
function relativeAge(iso: string | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const ms = Date.now() - then;
  if (ms < 0 || ms > 1000 * 60 * 60 * 24 * 365 * 5) return null;
  if (ms < 1000 * 60 * 5) return "LIVE";
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}M`;
  const hrs = Math.floor(min / 60);
  if (hrs < 48) return `${hrs}H`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}D`;
  const mo = Math.floor(days / 30);
  return `${mo}MO`;
}

export type SortField = "name" | "size" | "spread" | "prob" | "date";

// 7 cols — EV removed in a previous pass. Size + Spread + Close Prob
// are still the three most-looked-at numbers on the row.
const COLS: { key: SortField | null; label: string }[] = [
  { key: "name", label: "Situation" },
  { key: "size", label: "Size" },
  { key: "spread", label: "Ann. Spread" },
  { key: "prob", label: "Close Prob" },
  { key: null, label: "Regulator" },
  { key: null, label: "Category" },
  { key: "date", label: "Announced" },
];

export default function DealTable({
  deals,
  selectedId,
  onSelect,
  sortF,
  sortD,
  onSort,
  onReset,
}: {
  deals: Deal[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  sortF: SortField;
  sortD: number;
  onSort: (f: SortField) => void;
  onReset: () => void;
}) {
  return (
    <>
      <div className="table-head" id="deals-head">
        {COLS.map((c, i) => {
          if (!c.key) {
            return (
              <span key={i} style={{ cursor: "default" }}>
                {c.label}
              </span>
            );
          }
          const on = sortF === c.key;
          return (
            <span key={i} className={on ? "sort-active" : ""} onClick={() => onSort(c.key!)}>
              {c.label} <i className="sort-arrow">{on ? (sortD < 0 ? "↓" : "↑") : "↕"}</i>
            </span>
          );
        })}
      </div>

      <div id="tbody">
        {deals.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>
            No deals match these filters.{" "}
            <span
              style={{ color: "var(--navy)", cursor: "pointer", textDecoration: "underline" }}
              onClick={onReset}
            >
              Reset filters
            </span>
          </div>
        ) : (
          deals.map((deal) => {
            const pc = pcol(deal);
            const roles = partyLabels(deal.category);
            const flag = countryFlag(deal.target_country);
            const sub = deal.counterparty_name
              ? `${roles.counterGlyph} ${deal.counterparty_name}${
                  deal.category === "MERGER" && deal.transaction_value_usd
                    ? ` · ${fmtCap(deal.transaction_value_usd)}`
                    : ""
                }`
              : "";
            const annSpread = annualisedSpread(deal);
            const prob = deal.closing_probability ?? null;

            return (
              <div
                key={deal.id}
                className={`deal-row${selectedId === deal.id ? " selected" : ""}`}
                onClick={() => onSelect(deal.id)}
              >
                <div>
                  <div className="deal-name">
                    <span>
                      {flag} {deal.target_name}
                    </span>
                  </div>
                  <div className="deal-sub">{sub}</div>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-2)", fontWeight: 600 }}>
                  {fmtCap(deal.transaction_value_usd)}
                </span>
                <span className="deal-spread" style={{ color: annSpread != null ? pc : "var(--text-3)" }}>
                  {annSpread != null ? `${annSpread.toFixed(1)}%` : "—"}
                </span>
                <span>
                  <div className="prob-bar">
                    <div className="prob-track">
                      <div className="prob-fill" style={{ width: `${prob ?? 0}%`, background: pc }} />
                    </div>
                    <span className="prob-label" style={{ color: pc }}>
                      {prob != null ? `${Math.round(prob)}%` : "—"}
                    </span>
                  </div>
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-2)" }}>
                  {deal.primary_regulators?.[0] ?? "—"}
                </span>
                <span>
                  <span className={`badge ${BADGE_CL[deal.category] || "badge-gray"}`}>
                    {CLS[deal.category] || deal.category}
                  </span>
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)" }}>
                  <div>{deal.announce_date ?? "—"}</div>
                  {(() => {
                    const age = relativeAge(deal.updated_at);
                    if (!age) return null;
                    const isLive = age === "LIVE";
                    return (
                      <div
                        style={{
                          fontSize: 8,
                          color: isLive ? "var(--amber)" : "var(--text-4)",
                          marginTop: 2,
                          letterSpacing: ".08em",
                        }}
                        title={`Last updated · ${deal.updated_at}`}
                      >
                        {isLive ? "◉ LIVE" : `UPD ${age}`}
                      </div>
                    );
                  })()}
                </span>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
