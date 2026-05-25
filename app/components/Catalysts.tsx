import { Fragment } from "react";
import { CATALYSTS } from "@/app/data/content";

const tagColors: Record<string, string> = { a: "var(--amber)", g: "var(--navy)", b: "var(--cobalt)", r: "var(--crimson)", p: "var(--violet)" };
const tagBg: Record<string, string> = { a: "var(--amber-bg)", g: "var(--navy-bg)", b: "var(--cobalt-bg)", r: "var(--crimson-bg)", p: "var(--violet-bg)" };
const tagBd: Record<string, string> = { a: "var(--amber-bd)", g: "var(--navy-bd)", b: "var(--cobalt-bd)", r: "var(--crimson-bd)", p: "var(--violet-bd)" };
const impBg: Record<string, string> = { H: "var(--crimson-bg)", M: "var(--amber-bg)", L: "var(--cobalt-bg)" };
const impCol: Record<string, string> = { H: "var(--crimson)", M: "var(--amber)", L: "var(--cobalt)" };
const impBd: Record<string, string> = { H: "var(--crimson-bd)", M: "var(--amber-bd)", L: "var(--cobalt-bd)" };

export default function Catalysts() {
  return (
    <div id="catalysts">
      {CATALYSTS.map((c, i) => {
        const showMonth = i === 0 || CATALYSTS[i - 1].mo !== c.mo;
        const tc = tagColors[c.tagC],
          tb = tagBg[c.tagC],
          td = tagBd[c.tagC];
        return (
          <Fragment key={i}>
            {showMonth && <div className="catalyst-month">{c.mo}</div>}
            <div className="catalyst-row">
              <div>
                <div className="cat-date-d">{c.d}</div>
                <div className="cat-date-m">{c.m} 2026</div>
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
