// Bandeau défilant — données statiques de la maquette.
// Les items sont dupliqués pour une boucle continue (keyframes scroll-x: translateX -50%).
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

const TK_DATA: TickerEntry[] = [
  { n: "🇺🇸 Juniper/HPE", s: "11.4%", p: "78%", t: "MERGER", c: "ta" },
  { n: "🇩🇪 Covestro/ADNOC", s: "2.1%", p: "99%", t: "MERGER", c: "tg" },
  { n: "🇯🇵 Seven&i/Couche-Tard", s: "18.7%", p: "64%", t: "MERGER", c: "ta" },
  { n: "🇺🇸 US Steel/Nippon", s: "42.1%", p: "51%", t: "MERGER", c: "tr" },
  { n: "🇺🇸 Elliott/Honeywell", s: "—", p: "72%", t: "ACTIVISM", c: "tp" },
  { n: "🇺🇸 Hess/Chevron", s: "8.9%", p: "85%", t: "MERGER", c: "tg" },
  { n: "🇺🇸 GE Vernova", s: "17.2%", p: "99%", t: "SPINOFF", c: "tb" },
  { n: "🇩🇪 Bayer AG", s: "—", p: "62%", t: "DISTRESSED", c: "tr" },
  { n: "🇺🇸 Endeavor/Silver Lake", s: "5.2%", p: "94%", t: "MERGER", c: "tg" },
  { n: "🇺🇸 Spirit Airlines", s: "—", p: "45%", t: "DISTRESSED", c: "tr" },
  { n: "🇺🇸 IAC/Angi", s: "12.4%", p: "80%", t: "SPINOFF", c: "tb" },
  { n: "🇫🇷 Sanofi/Opella", s: "14.2%", p: "75%", t: "SPINOFF", c: "tb" },
  { n: "🇺🇸 DISH/DirecTV", s: "22.4%", p: "70%", t: "REORG", c: "ta" },
  { n: "🇺🇸 Elliott/BP", s: "—", p: "55%", t: "ACTIVISM", c: "tp" },
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
