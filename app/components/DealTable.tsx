import { type Deal, pcol, ecol, dealCapUSD, fmtCap, BADGE_CL, CLS, SOURCE_BADGE_CL, partyLabels } from "../data/deals";

// Compact relative-time formatter for the "updated X ago" indicator.
// Returns "LIVE" when the row was touched within 5 minutes, otherwise
// the shortest unit (m/h/d) under which the age fits.
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

export type SortField = "name" | "size" | "spread" | "prob" | "ev" | "date";

const COLS: { key: SortField | null; label: string }[] = [
  { key: "name", label: "Situation" },
  { key: "size", label: "Size" },
  { key: "spread", label: "Ann. Spread" },
  { key: "prob", label: "Close Prob" },
  { key: "ev", label: "EV" },
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
            const roles = partyLabels(deal.c);
            // Sub-line now leads with an explicit counterparty glyph + name
            // so the reader sees "target → acquirer" at a glance instead of
            // guessing which side of the deal the acquirer line represents.
            const sub = deal.acq
              ? `${roles.counterGlyph} ${deal.acq}${deal.c === "MERGER" && deal.v ? ` · ${deal.v}` : ""}`
              : deal.v;
            return (
              <div
                key={deal.id}
                className={`deal-row${selectedId === deal.id ? " selected" : ""}`}
                onClick={() => onSelect(deal.id)}
              >
                <div>
                  <div className="deal-name" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span>{deal.f} {deal.nm}</span>
                    {deal.source ? (
                      <span
                        className={`badge ${SOURCE_BADGE_CL[deal.source] ?? "badge-gray"}`}
                        style={{ fontSize: 7.5, padding: "1px 5px", letterSpacing: ".06em" }}
                        title={`Discovery source: ${deal.source}`}
                      >
                        {deal.source}
                      </span>
                    ) : null}
                  </div>
                  <div className="deal-sub">{sub}</div>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-2)", fontWeight: 600 }}>
                  {fmtCap(dealCapUSD(deal.v))}
                </span>
                <span className="deal-spread" style={{ color: deal.s > 0 ? pc : "var(--text-3)" }}>
                  {deal.s > 0 ? deal.s.toFixed(1) + "%" : "—"}
                </span>
                <span>
                  <div className="prob-bar">
                    <div className="prob-track">
                      <div className="prob-fill" style={{ width: `${deal.p}%`, background: pc }} />
                    </div>
                    <span className="prob-label" style={{ color: pc }}>
                      {deal.p}%
                    </span>
                  </div>
                </span>
                <span className="deal-spread" style={{ color: ecol(deal) }}>
                  {deal.ev > 0 ? "+" : ""}
                  {deal.ev.toFixed(1)}%
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-2)" }}>
                  {deal.r}
                </span>
                <span>
                  <span className={`badge ${BADGE_CL[deal.c] || "badge-gray"}`}>
                    {CLS[deal.c] || deal.c}
                  </span>
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)" }}>
                  <div>{deal.pr?.ad || "—"}</div>
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
