import Link from "next/link";
import ModalButton from "@/app/components/ModalButton";
import CheckoutButton from "@/app/components/CheckoutButton";
import { getAllDeals } from "@/lib/deals";

// Server component — reads the live deal set to populate hero stats
// instead of hard-coding them. `force-dynamic` because the stats
// shouldn't go stale between deploys.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const deals = await getAllDeals();
  const activeCount = deals.length;
  const spreadsPositive = deals.filter((d) => d.s > 0);
  const avgSpread = spreadsPositive.length
    ? (spreadsPositive.reduce((sum, d) => sum + d.s, 0) / spreadsPositive.length).toFixed(1) + "%"
    : "—";
  const asOfLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div className="page active" id="page-home">
      <div style={{ maxWidth: "var(--content-max)", margin: "0 auto", padding: "0 clamp(20px,3vw,32px) 80px" }}>
        <div className="page-hero">
          <div>
            <div className="hero-eyebrow">AI-Native · Event-Driven Intelligence</div>
            <h1 className="hero-h">
              The terminal built for
              <br />
              <em>Special Situations.</em>
            </h1>
            <p className="hero-sub" style={{ marginBottom: "var(--sp-6)" }}>
              {activeCount}+ live US situations tracked real-time. AI-scored merger arb, activism,
              distressed, spin-offs — with regulatory monitoring, timeline prediction, and
              institutional analytics. Built by practitioners, for practitioners.
            </p>
            <div style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap", marginBottom: "var(--sp-3)" }}>
              <Link href="/" className="btn btn-primary btn-lg">
                View Live Situations →
              </Link>
              <ModalButton modal="access" className="btn btn-secondary btn-lg">
                Request Access
              </ModalButton>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)" }}>
              Currently onboarding event-driven funds · Institutional access only · as of {asOfLabel}
            </div>
          </div>
          <div className="home-stats">
            <div className="hstat">
              <div className="hstat-v">{activeCount}</div>
              <div className="hstat-l">Active US event-driven situations</div>
            </div>
            <div className="hstat">
              <div className="hstat-v">7</div>
              <div className="hstat-l">Sub-strategies with regime analysis</div>
            </div>
            <div className="hstat">
              <div className="hstat-v">{avgSpread}</div>
              <div className="hstat-l">Avg annualized spread (active deals)</div>
            </div>
            <div className="hstat">
              <div className="hstat-v">8</div>
              <div className="hstat-l">US regulators monitored + AI scored</div>
            </div>
          </div>
        </div>

        {/* FEATURES */}
        <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "var(--sp-10)" }}>
          <div className="section-hd">
            <div className="hero-eyebrow" style={{ justifyContent: "center" }}>
              Platform Features
            </div>
            <h2>Everything Bloomberg doesn&apos;t do.</h2>
            <p>
              Bloomberg tells you what the price is. SpecialSitsIntel tells you what it{" "}
              <em>should be</em> — and why it differs.
            </p>
          </div>
          <div className="feat-grid stagger">
            {[
              { ic: "⊞", bg: "var(--navy-bg)", c: "var(--navy)", t: "AI Deal Scoring", d: "Closing probability, expected value, and optimal Kelly sizing for every situation. Updated continuously from filings and news." },
              { ic: "⊟", bg: "var(--cobalt-bg)", c: "var(--cobalt)", t: "FTC Language Scoring", d: "NLP of every FTC and DOJ filing — hawkishness signals detected 3-6 weeks before market prices them in." },
              { ic: "◷", bg: "var(--amber-bg)", c: "var(--amber)", t: "Timeline Prediction", d: "Slippage model trained on 6,000+ historical regulatory reviews. Extension probability with confidence intervals." },
              { ic: "✦", bg: "var(--crimson-bg)", c: "var(--crimson)", t: "US Regulators Live", d: "FTC, DOJ, HSR, CFIUS, FCC, FERC, SEC, FINRA — posture, clearance rates, process tracking." },
              { ic: "⊕", bg: "var(--navy-bg)", c: "var(--navy)", t: "Portfolio Tracker", d: "Build and track your special sits book. P&L, Kelly sizing, allocation by strategy, and live spread updates." },
              { ic: "★", bg: "var(--cobalt-bg)", c: "var(--cobalt)", t: "Market Regime", d: "Each sub-strategy mapped to macro environment: rates, vol, credit, liquidity. Know when merger arb outperforms." },
            ].map((f) => (
              <div className="feat" key={f.t}>
                <div className="feat-icon" style={{ background: f.bg, color: f.c }}>
                  {f.ic}
                </div>
                <div className="feat-t">{f.t}</div>
                <div className="feat-d">{f.d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* VS TABLE */}
        <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "var(--sp-10)" }}>
          <div className="section-hd">
            <div className="hero-eyebrow" style={{ justifyContent: "center" }}>
              Competitive Landscape
            </div>
            <h2>More intelligence. Fraction of the cost.</h2>
            <p>Bloomberg charges €27K/year for a terminal not built for special situations. We were.</p>
          </div>
          <table className="vs-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th className="hl">SpecialSitsIntel</th>
                <th>Bloomberg Terminal</th>
                <th>Reorg / Octus</th>
                <th>Manual Research</th>
              </tr>
            </thead>
            <tbody>
              {[
                { f: "Merger arb spread tracking", ssi: "✓ Real-time", ssiCls: "vs-yes", bb: ["~ Basic", "vs-part"], ro: ["✗", "vs-no"], mr: ["✗", "vs-no"] },
                { f: "AI closing probability model", ssi: "✓ Multi-factor", ssiCls: "vs-yes", bb: ["✗", "vs-no"], ro: ["✗", "vs-no"], mr: ["✗", "vs-no"] },
                { f: "FTC / DOJ NLP language scoring", ssi: "✓ Per filing", ssiCls: "vs-yes", bb: ["✗", "vs-no"], ro: ["✗", "vs-no"], mr: ["✗", "vs-no"] },
                { f: "Portfolio P&L tracker", ssi: "✓ Built-in", ssiCls: "vs-yes", bb: ["~ Manual", "vs-part"], ro: ["✗", "vs-no"], mr: ["✗", "vs-no"] },
                { f: "Market regime overlay", ssi: "✓ Per strategy", ssiCls: "vs-yes", bb: ["✗", "vs-no"], ro: ["✗", "vs-no"], mr: ["✗", "vs-no"] },
              ].map((row) => (
                <tr key={row.f}>
                  <td>{row.f}</td>
                  <td className="hl">
                    <span className={row.ssiCls}>{row.ssi}</span>
                  </td>
                  <td>
                    <span className={row.bb[1]}>{row.bb[0]}</span>
                  </td>
                  <td>
                    <span className={row.ro[1]}>{row.ro[0]}</span>
                  </td>
                  <td>
                    <span className={row.mr[1]}>{row.mr[0]}</span>
                  </td>
                </tr>
              ))}
              <tr>
                <td>Annual cost (1 analyst seat)</td>
                <td className="hl" style={{ color: "var(--navy)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                  €1,800 / yr
                </td>
                <td style={{ color: "var(--crimson)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                  €27,000 / yr
                </td>
                <td style={{ color: "var(--crimson)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                  €18,000 / yr
                </td>
                <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-3)" }}>∞ Hours</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* PRICING teaser — full details on /pricing */}
        <div>
          <div className="section-hd">
            <div className="hero-eyebrow" style={{ justifyContent: "center" }}>
              Pricing
            </div>
            <h2>
              Institutional intelligence.
              <br />
              Challenger price.
            </h2>
            <p>From a free preview to full-scale enterprise. Bloomberg at under 7% of the cost.</p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "var(--sp-3)",
              marginBottom: "var(--sp-6)",
            }}
          >
            {[
              { nm: "Free", p: "€0", sub: "5 deals · preview" },
              { nm: "Analyst", p: "€150", sub: "/mo · full terminal", featured: true },
              { nm: "Institutional", p: "€600", sub: "/mo · API + 3 seats" },
              { nm: "Enterprise", p: "€2,500", sub: "/mo · white-label" },
            ].map((t) => (
              <div
                key={t.nm}
                style={{
                  padding: "var(--sp-4)",
                  background: t.featured ? "var(--navy-bg)" : "var(--bg-2)",
                  border: `1px solid ${t.featured ? "var(--navy-bd)" : "var(--border)"}`,
                  borderRadius: "var(--r-md)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: t.featured ? "var(--navy)" : "var(--text-3)",
                    marginBottom: 6,
                  }}
                >
                  {t.nm}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em" }}>
                  {t.p}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>
                  {t.sub}
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", padding: "var(--sp-5) 0 var(--sp-4)", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.02em", marginBottom: 7 }}>
              Currently onboarding event-driven funds.
            </div>
            <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: "var(--sp-4)" }}>
              Institutional access only · Priority to funds &gt;€50M AUM in event-driven strategies
            </div>
            <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/pricing" className="btn btn-primary btn-lg">
                See full pricing →
              </Link>
              <ModalButton modal="access" className="btn btn-secondary btn-lg">
                Request Access
              </ModalButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
