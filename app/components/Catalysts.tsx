import { Fragment } from "react";
import { CATALYSTS, type Catalyst } from "@/app/data/content";

const tagColors: Record<string, string> = { a: "var(--amber)", g: "var(--navy)", b: "var(--cobalt)", r: "var(--crimson)", p: "var(--violet)" };
const tagBg: Record<string, string> = { a: "var(--amber-bg)", g: "var(--navy-bg)", b: "var(--cobalt-bg)", r: "var(--crimson-bg)", p: "var(--violet-bg)" };
const tagBd: Record<string, string> = { a: "var(--amber-bd)", g: "var(--navy-bd)", b: "var(--cobalt-bd)", r: "var(--crimson-bd)", p: "var(--violet-bd)" };
const impBg: Record<string, string> = { H: "var(--crimson-bg)", M: "var(--amber-bg)", L: "var(--cobalt-bg)" };
const impCol: Record<string, string> = { H: "var(--crimson)", M: "var(--amber)", L: "var(--cobalt)" };
const impBd: Record<string, string> = { H: "var(--crimson-bd)", M: "var(--amber-bd)", L: "var(--cobalt-bd)" };

const MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

// Parse a catalyst's { mo:"NOV 2026", d:"15" } into a real Date. The
// mo string always carries "MMM YYYY"; d is the day-of-month. Missing
// or malformed entries land in the past so they're filtered out
// rather than polluting the upcoming list.
function catalystDate(c: Catalyst): Date {
  const parts = (c.mo || "").trim().split(/\s+/);
  const monthIdx = MONTHS[(parts[0] || "").toUpperCase()] ?? -1;
  const year = parseInt(parts[1] ?? "", 10);
  const day = parseInt(c.d ?? "", 10);
  if (monthIdx < 0 || !Number.isFinite(year) || !Number.isFinite(day)) {
    return new Date(0);
  }
  return new Date(year, monthIdx, day);
}

export default function Catalysts() {
  // Auto-prune catalysts whose date has already passed. The pipeline
  // refreshes the CATALYSTS array itself every so often; this guard
  // keeps the displayed list honest between refreshes so the user
  // never sees a "CLOSE · NOV 10" event on Nov 12.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = CATALYSTS
    .filter((c) => catalystDate(c) >= today)
    .slice()
    .sort((a, b) => catalystDate(a).getTime() - catalystDate(b).getTime());

  if (upcoming.length === 0) {
    return (
      <div id="catalysts" style={{ padding: "var(--sp-8) var(--sp-4)", textAlign: "center", color: "var(--text-3)", fontSize: 11, lineHeight: 1.7 }}>
        No upcoming catalysts in the current horizon.
        <br />
        New events populate as the pipeline refreshes.
      </div>
    );
  }

  return (
    <div id="catalysts">
      {upcoming.map((c, i) => {
        const showMonth = i === 0 || upcoming[i - 1].mo !== c.mo;
        const tc = tagColors[c.tagC],
          tb = tagBg[c.tagC],
          td = tagBd[c.tagC];
        // Pull the year out of mo ("NOV 2026" → "2026") so the row
        // label stays accurate as the schedule bridges year boundaries.
        const monthYear = (c.mo || "").split(/\s+/)[1] ?? "";
        return (
          <Fragment key={i}>
            {showMonth && <div className="catalyst-month">{c.mo}</div>}
            <div className="catalyst-row">
              <div>
                <div className="cat-date-d">{c.d}</div>
                <div className="cat-date-m">{c.m} {monthYear}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span className="cat-impact" style={{ color: tc, background: tb, border: `1px solid ${td}` }}>
                    {c.tag}
                  </span>
                  <span className="cat-deal">{c.deal}</span>
                </div>
                <div className="cat-desc-txt">
                  <b style={{ color: "var(--text)", fontWeight: 600 }}>{c.evt}.</b> {c.desc}
                </div>
              </div>
              <div
                className="cat-impact"
                style={{
                  background: impBg[c.imp],
                  color: impCol[c.imp],
                  border: `1px solid ${impBd[c.imp]}`,
                  whiteSpace: "nowrap",
                  padding: "3px 9px",
                  borderRadius: "var(--r-full)",
                }}
              >
                {c.imp === "H" ? "HIGH IMPACT" : c.imp === "M" ? "MEDIUM" : "LOW"}
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
