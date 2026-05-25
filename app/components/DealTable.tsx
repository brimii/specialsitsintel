import { type Deal, pcol, ecol, BADGE_CL, CLS } from "../data/deals";

export type SortField = "name" | "spread" | "prob" | "ev" | "date";

const COLS: { key: SortField | null; label: string }[] = [
  { key: "name", label: "Situation" },
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
            const sub =
              deal.c === "MERGER"
                ? `${deal.acq} · ${deal.v}`
                : deal.c === "ACTIVISM"
                  ? deal.acq
                  : deal.v;
            return (
              <div
                key={deal.id}
                className={`deal-row${selectedId === deal.id ? " selected" : ""}`}
                onClick={() => onSelect(deal.id)}
              >
                <div>
                  <div className="deal-name">
                    {deal.f} {deal.nm}
                  </div>
                  <div className="deal-sub">{sub}</div>
                </div>
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
                  {deal.pr?.ad || "—"}
                </span>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
