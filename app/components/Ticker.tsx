// Live ticker — the scrolling ribbon under the KPI bar. US-only per
// the product scope: event-driven situations the terminal actually
// covers end-to-end. Each entry mirrors a deal in the universe so
// the ticker never advertises coverage we don't have.
const TK_CL: Record<string, string> = {
  tg: "badge-navy",
  ta: "badge-amber",
  tr: "badge-crimson",
  tb: "badge-cobalt",
  tp: "badge-violet",
};
const TK_COL: Record<string, string> = {
  tg: "var(--navy)",
  ta: "var(--amber)",
  tr: "var(--crimson)",
  tb: "var(--cobalt)",
  tp: "var(--violet)",
};

type TickerEntry = { n: string; s: string; p: string; t: string; c: string };

// Curated US-only roster, sorted by desk relevance. Spread = annualised
// gross spread when applicable (empty for activism / spin-off plays).
// Prob = current closing probability from the AI model.
const TK_DATA: TickerEntry[] = [
  { n: "🇺🇸 Hess / Chevron",                s: "1.9%",  p: "98%", t: "MERGER",     c: "tg" },
  { n: "🇺🇸 Juniper / HPE",                 s: "3.1%",  p: "95%", t: "MERGER",     c: "tg" },
  { n: "🇺🇸 Walgreens / Sycamore",         s: "4.6%",  p: "88%", t: "MERGER",     c: "tg" },
  { n: "🇺🇸 Amedisys / UnitedHealth",       s: "17.8%", p: "49%", t: "MERGER",     c: "tr" },
  { n: "🇺🇸 US Steel / Nippon",             s: "27.4%", p: "62%", t: "MERGER",     c: "ta" },
  { n: "🇺🇸 Informatica / Salesforce",     s: "6.4%",  p: "81%", t: "MERGER",     c: "tg" },
  { n: "🇺🇸 Elliott / Honeywell",           s: "—",     p: "72%", t: "ACTIVISM",   c: "tp" },
  { n: "🇺🇸 Elliott / Southwest Airlines", s: "—",     p: "92%", t: "ACTIVISM",   c: "tp" },
  { n: "🇺🇸 Elliott / BP",                  s: "—",     p: "55%", t: "ACTIVISM",   c: "tp" },
  { n: "🇺🇸 Match Group / Elliott",         s: "—",     p: "88%", t: "ACTIVISM",   c: "tp" },
  { n: "🇺🇸 Honeywell Aerospace",           s: "—",     p: "90%", t: "SPINOFF",    c: "tb" },
  { n: "🇺🇸 IAC / Angi",                    s: "12.4%", p: "80%", t: "SPINOFF",    c: "tb" },
  { n: "🇺🇸 GE Vernova",                    s: "—",     p: "99%", t: "SPINOFF",    c: "tb" },
  { n: "🇺🇸 Altice USA",                    s: "—",     p: "72%", t: "OOC",        c: "ta" },
  { n: "🇺🇸 CommScope",                     s: "—",     p: "40%", t: "DISTRESSED", c: "tr" },
  { n: "🇺🇸 Bausch Health",                 s: "—",     p: "45%", t: "DISTRESSED", c: "tr" },
  { n: "🇺🇸 Rite Aid",                      s: "—",     p: "60%", t: "DISTRESSED", c: "tr" },
];

export default function Ticker() {
  const items = [...TK_DATA, ...TK_DATA];
  return (
    <div className="ticker">
      <div className="ticker-inner">
        {items.map((d, i) => (
          <div className="ticker-item" key={i}>
            <span className="ticker-name">{d.n}</span>
            <span className="ticker-spread" style={{ color: TK_COL[d.c] }}>
              {d.s}
            </span>
            <span style={{ color: "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: 9 }}>
              P:{d.p}
            </span>
            <span className={`ticker-badge ${TK_CL[d.c]}`}>{d.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
