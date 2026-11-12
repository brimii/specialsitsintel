import { Fragment } from "react";
import { type Deal, type TimelineEvent } from "@/app/data/schema";

// Catalysts are DERIVED from each deal's timeline — any future-dated
// timeline event surfaces as an upcoming catalyst. No separate CATALYSTS
// table (per rebuild decision Nov 12, 2026). Past events auto-prune by
// filtering `date < today`.

interface CatalystRow {
  dealId: number;
  deal: Deal;
  event: TimelineEvent;
}

const eventColor: Record<string, { fg: string; bg: string; bd: string }> = {
  ANNOUNCE:         { fg: "var(--cobalt)",  bg: "var(--cobalt-bg)",  bd: "var(--cobalt-bd)" },
  HSR_FILED:        { fg: "var(--amber)",   bg: "var(--amber-bg)",   bd: "var(--amber-bd)" },
  SECOND_REQUEST:   { fg: "var(--amber)",   bg: "var(--amber-bg)",   bd: "var(--amber-bd)" },
  CONSENT:          { fg: "var(--navy)",    bg: "var(--navy-bg)",    bd: "var(--navy-bd)" },
  CLEARED:          { fg: "var(--navy)",    bg: "var(--navy-bg)",    bd: "var(--navy-bd)" },
  LITIGATION_FILED: { fg: "var(--crimson)", bg: "var(--crimson-bg)", bd: "var(--crimson-bd)" },
  VERDICT:          { fg: "var(--crimson)", bg: "var(--crimson-bg)", bd: "var(--crimson-bd)" },
  CLOSING:          { fg: "var(--navy)",    bg: "var(--navy-bg)",    bd: "var(--navy-bd)" },
  CLOSED:           { fg: "var(--navy)",    bg: "var(--navy-bg)",    bd: "var(--navy-bd)" },
  BLOCKED:          { fg: "var(--crimson)", bg: "var(--crimson-bg)", bd: "var(--crimson-bd)" },
  WITHDRAWN:        { fg: "var(--crimson)", bg: "var(--crimson-bg)", bd: "var(--crimson-bd)" },
  OTHER:            { fg: "var(--violet)",  bg: "var(--violet-bg)",  bd: "var(--violet-bd)" },
};

const impactForEvent = (type: string): "H" | "M" | "L" => {
  if (type === "VERDICT" || type === "BLOCKED" || type === "LITIGATION_FILED" || type === "CLOSED" || type === "WITHDRAWN") return "H";
  if (type === "SECOND_REQUEST" || type === "CONSENT" || type === "CLOSING" || type === "HSR_FILED") return "M";
  return "L";
};

const impBg: Record<string, string> = { H: "var(--crimson-bg)", M: "var(--amber-bg)", L: "var(--cobalt-bg)" };
const impCol: Record<string, string> = { H: "var(--crimson)", M: "var(--amber)", L: "var(--cobalt)" };
const impBd: Record<string, string> = { H: "var(--crimson-bd)", M: "var(--amber-bd)", L: "var(--cobalt-bd)" };

const MONTH_LABEL = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Catalysts({ deals }: { deals: Deal[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows: CatalystRow[] = [];
  for (const d of deals) {
    if (!d.timeline) continue;
    for (const ev of d.timeline) {
      const when = new Date(ev.date);
      if (!Number.isFinite(when.getTime())) continue;
      if (when >= today) rows.push({ dealId: d.id, deal: d, event: ev });
    }
  }
  rows.sort((a, b) => a.event.date.localeCompare(b.event.date));

  if (rows.length === 0) {
    return (
      <div
        id="catalysts"
        style={{
          padding: "var(--sp-8) var(--sp-4)",
          textAlign: "center",
          color: "var(--text-3)",
          fontSize: 11,
          lineHeight: 1.7,
        }}
      >
        No upcoming catalysts in the current horizon.
        <br />
        New events populate as the pipeline refreshes.
      </div>
    );
  }

  return (
    <div id="catalysts">
      {rows.map((r, i) => {
        const d = new Date(r.event.date);
        const monthKey = `${MONTH_LABEL[d.getMonth()]} ${d.getFullYear()}`;
        const showMonth =
          i === 0 ||
          (() => {
            const prev = new Date(rows[i - 1].event.date);
            return MONTH_LABEL[prev.getMonth()] !== MONTH_LABEL[d.getMonth()] || prev.getFullYear() !== d.getFullYear();
          })();
        const colors = eventColor[r.event.event_type] ?? eventColor.OTHER;
        const imp = impactForEvent(r.event.event_type);
        const day = String(d.getDate()).padStart(2, "0");
        const monthShort = MONTH_SHORT[d.getMonth()];
        const dealLabel = r.deal.counterparty_name
          ? `${r.deal.target_name} / ${r.deal.counterparty_name}`
          : r.deal.target_name;

        return (
          <Fragment key={`${r.dealId}-${i}`}>
            {showMonth && <div className="catalyst-month">{monthKey}</div>}
            <div className="catalyst-row">
              <div>
                <div className="cat-date-d">{day}</div>
                <div className="cat-date-m">{monthShort} {d.getFullYear()}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span
                    className="cat-impact"
                    style={{ color: colors.fg, background: colors.bg, border: `1px solid ${colors.bd}` }}
                  >
                    {r.event.event_type.replace(/_/g, " ")}
                  </span>
                  <span className="cat-deal">{dealLabel}</span>
                </div>
                <div className="cat-desc-txt">
                  <b style={{ color: "var(--text)", fontWeight: 600 }}>{r.event.summary}</b>
                </div>
              </div>
              <div
                className="cat-impact"
                style={{
                  background: impBg[imp],
                  color: impCol[imp],
                  border: `1px solid ${impBd[imp]}`,
                  whiteSpace: "nowrap",
                  padding: "3px 9px",
                  borderRadius: "var(--r-full)",
                }}
              >
                {imp === "H" ? "HIGH IMPACT" : imp === "M" ? "MEDIUM" : "LOW"}
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
