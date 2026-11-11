import Link from "next/link";
import ModalButton from "@/app/components/ModalButton";
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
        {/* HERO — the positioning is the product itself: a purpose-built
           intelligence terminal for special situations. No comparisons. */}
        <div className="page-hero">
          <div>
            <div className="hero-eyebrow">AI-Curated · Human-Validated · Institutional</div>
            <h1 className="hero-h">
              The intelligence terminal
              <br />
              <em>for Special Situations.</em>
            </h1>
            <p className="hero-sub" style={{ marginBottom: "var(--sp-6)" }}>
              Every live US merger arbitrage, activist campaign, distressed credit, spin-off and
              restructuring — AI-scored, source-attributed, and refreshed from primary filings the
              moment they land. One terminal. One source of truth. Built for event-driven
              practitioners.
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
              <div className="hstat-l">Live US event-driven situations</div>
            </div>
            <div className="hstat">
              <div className="hstat-v">7</div>
              <div className="hstat-l">Sub-strategies with regime overlay</div>
            </div>
            <div className="hstat">
              <div className="hstat-v">{avgSpread}</div>
              <div className="hstat-l">Avg annualized spread (active book)</div>
            </div>
            <div className="hstat">
              <div className="hstat-v">8</div>
              <div className="hstat-l">US regulators monitored + AI scored</div>
            </div>
          </div>
        </div>

        {/* WHY — the four pillars that make the product unique. Replaces
           the old vs-Bloomberg table. Positions the product on its own
           merits: purpose, method, speed, discipline. */}
        <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "var(--sp-10)" }}>
          <div className="section-hd">
            <div className="hero-eyebrow" style={{ justifyContent: "center" }}>
              Why SpecialSitsIntel
            </div>
            <h2>A category of one.</h2>
            <p>
              Not a general finance terminal with a merger-arb tab. Not a legacy news service that
              buries the signal under commentary. A dedicated intelligence stack for event-driven
              capital, built and run by practitioners who ship against it every day.
            </p>
          </div>
          <div className="pillar-grid">
            {[
              {
                n: "01",
                t: "Purpose-built for special situations.",
                d: "Every field in the product exists because merger arbitrageurs, distressed analysts and activism PMs asked for it. Spread, closing probability, Kelly sizing, regulator posture, verdict timelines — surfaced natively, not derived from a generic quote feed.",
              },
              {
                n: "02",
                t: "AI-curated, human-validated.",
                d: "Claude models read every SEC filing, every regulator case, every disclosure the minute it drops — extracting structured intelligence at a scale no desk can match. Then a human reviews every material change before it reaches your dashboard. The audit trail is in the record.",
              },
              {
                n: "03",
                t: "Primary sources only.",
                d: "SEC EDGAR, FTC and DOJ publications, HSR disclosures, Form 10 filings, 8-Ks, 13Ds — all public, all official, all timestamped at source. No wire-service rewrites, no second-hand feeds. When the data moves, your terminal moves with it.",
              },
              {
                n: "04",
                t: "Institutional discipline, by default.",
                d: "Every data point carries its source URL, its confidence score, and its full change history. Material status transitions pass through a review queue before publication. Source attribution and immutability are not compliance theatre — they are the product.",
              },
            ].map((p) => (
              <div className="pillar" key={p.n}>
                <div className="pillar-n">{p.n}</div>
                <div className="pillar-body">
                  <div className="pillar-t">{p.t}</div>
                  <div className="pillar-d">{p.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FEATURES — unchanged list of capabilities, but the heading no
           longer compares the product to anything else. */}
        <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "var(--sp-10)" }}>
          <div className="section-hd">
            <div className="hero-eyebrow" style={{ justifyContent: "center" }}>
              Inside the terminal
            </div>
            <h2>Six intelligence layers. One workflow.</h2>
            <p>
              Every active situation carries its own intelligence stack — scoring, regulator
              signals, timeline prediction, portfolio impact — surfaced from the same click.
            </p>
          </div>
          <div className="feat-grid stagger">
            {[
              { ic: "⊞", bg: "var(--navy-bg)", c: "var(--navy)", t: "AI Deal Scoring", d: "Closing probability, expected value, and optimal Kelly sizing on every live situation. Updated continuously from SEC filings and regulator events." },
              { ic: "⊟", bg: "var(--cobalt-bg)", c: "var(--cobalt)", t: "FTC / DOJ Language Scoring", d: "NLP of every FTC and DOJ filing — hawkishness signals detected 3-6 weeks before market pricing moves." },
              { ic: "◷", bg: "var(--amber-bg)", c: "var(--amber)", t: "Timeline Prediction", d: "Slippage model trained on 6,000+ historical regulatory reviews. Extension probability with confidence intervals on every verdict." },
              { ic: "✦", bg: "var(--crimson-bg)", c: "var(--crimson)", t: "US Regulators Live", d: "FTC, DOJ, HSR, CFIUS, FCC, FERC, SEC, FINRA — posture, clearance rates, and per-case tracking in one surface." },
              { ic: "⊕", bg: "var(--navy-bg)", c: "var(--navy)", t: "Portfolio Tracker", d: "Build and track your event-driven book. P&L, Kelly sizing, allocation by strategy, live spread updates — all tied back to the universe." },
              { ic: "★", bg: "var(--cobalt-bg)", c: "var(--cobalt)", t: "Macro Regime Overlay", d: "Each sub-strategy mapped to the macro environment — rates, vol, credit, liquidity. Know when merger arb outperforms, when distressed shines, when activism stalls." },
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

        {/* METHOD — a short strip that shows the pipeline so the
           "AI + human" claim isn't abstract. */}
        <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "var(--sp-10)" }}>
          <div className="section-hd">
            <div className="hero-eyebrow" style={{ justifyContent: "center" }}>
              How the intelligence is made
            </div>
            <h2>From filing to insight, continuously.</h2>
            <p>
              Four stages. Every situation passes through all of them. No shortcuts, no black-box
              signals that cannot be traced back to a primary source.
            </p>
          </div>
          <div className="method-grid">
            {[
              { k: "01 · Ingest", t: "Continuous monitoring", d: "SEC EDGAR full-text search, FTC/DOJ RSS, HSR, Form 10 filings, 8-Ks, 13Ds — scraped and parsed the minute they are published, with cache + rate-limit protection." },
              { k: "02 · Extract", t: "Claude-grade NLP", d: "Structured extraction of deal value, consideration, acquirer, target, regulator, timeline, remedies. Confidence score per field, source URL retained at source." },
              { k: "03 · Validate", t: "Human-in-the-loop", d: "Every material change — status transition, major revision, verdict — routes through a review queue. A human approves before the dashboard updates. The queue log is immutable." },
              { k: "04 · Publish", t: "Terminal + API", d: "Analyst dashboard, CSV export, soon-live REST API. Every data point carries its timestamp, its confidence score, and its source attribution." },
            ].map((m) => (
              <div className="method" key={m.k}>
                <div className="method-k">{m.k}</div>
                <div className="method-t">{m.t}</div>
                <div className="method-d">{m.d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PRICING teaser */}
        <div>
          <div className="section-hd">
            <div className="hero-eyebrow" style={{ justifyContent: "center" }}>
              Pricing
            </div>
            <h2>
              Institutional intelligence.
              <br />
              Transparent pricing.
            </h2>
            <p>From a free preview to a white-label enterprise deployment. One plan per workflow.</p>
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
