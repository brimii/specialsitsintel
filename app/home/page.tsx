import Link from "next/link";
import ModalButton from "@/app/components/ModalButton";
import CheckoutButton from "@/app/components/CheckoutButton";

// Page Home (marketing). Les boutons "Request Access / Contact Sales" et le
// formulaire e-mail ouvriront des modales — branchés à l'étape modales.
export default function HomePage() {
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
              150+ live situations tracked real-time. AI-scored merger arb, activism, distressed,
              spin-offs — with regulatory monitoring, timeline prediction, and institutional
              analytics. Built by practitioners, for practitioners.
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
              Currently onboarding event-driven funds · Institutional access only · as of May 23, 2026
            </div>
          </div>
          <div className="home-stats">
            <div className="hstat">
              <div className="hstat-v">150+</div>
              <div className="hstat-l">Live situations across 14 countries</div>
            </div>
            <div className="hstat">
              <div className="hstat-v">7</div>
              <div className="hstat-l">Sub-strategies with regime analysis</div>
            </div>
            <div className="hstat">
              <div className="hstat-v">—</div>
              <div className="hstat-l">Avg annualized spread (active deals)</div>
            </div>
            <div className="hstat">
              <div className="hstat-v">15</div>
              <div className="hstat-l">Regulators monitored + AI scored</div>
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
              { ic: "✦", bg: "var(--crimson-bg)", c: "var(--crimson)", t: "15 Regulators Live", d: "FTC, DOJ, DG COMP, CMA, CFIUS, JFTC, FEFTA and 8 more — posture, clearance rates, process tracking." },
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

        {/* PRICING */}
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
            <p>Bloomberg at under 7% of the cost. No per-seat surprises.</p>
          </div>
          <div className="pricing-grid stagger">
            <div className="plan">
              <div className="plan-nm">Free</div>
              <div className="plan-desc">Preview for analysts evaluating the platform.</div>
              <div className="plan-p">
                €0<span>/mo</span>
              </div>
              <div className="plan-save">{" "}</div>
              <div className="plan-feats">
                <div className="plan-feat">5 live situations</div>
                <div className="plan-feat">Gross spread + close probability</div>
                <div className="plan-feat">Academy — 2 strategy modules</div>
                <div className="plan-feat no">AI commentary & FTC scoring</div>
                <div className="plan-feat no">Portfolio tracker</div>
                <div className="plan-feat no">Price charts</div>
              </div>
              <ModalButton modal="access" className="plan-cta btn-secondary">
                Get Started
              </ModalButton>
            </div>

            <div className="plan featured">
              <div className="plan-badge">MOST POPULAR</div>
              <div className="plan-nm">Analyst</div>
              <div className="plan-desc">For dedicated event-driven analysts.</div>
              <div className="plan-p">
                €150<span>/mo</span>
              </div>
              <div className="plan-save">€1,800/yr · Bloomberg at 6.7% of cost</div>
              <div className="plan-feats">
                <div className="plan-feat">All 150+ live situations</div>
                <div className="plan-feat">AI scoring + FTC NLP signals</div>
                <div className="plan-feat">Full price charts with zoom</div>
                <div className="plan-feat">Portfolio tracker</div>
                <div className="plan-feat">15-jurisdiction regulatory monitoring</div>
                <div className="plan-feat">Real-time alerts (15 / day)</div>
                <div className="plan-feat no">API access</div>
                <div className="plan-feat no">Multi-seat</div>
              </div>
              <CheckoutButton tier="analyst" className="plan-cta btn btn-primary">
                S&apos;abonner →
              </CheckoutButton>
            </div>

            <div className="plan">
              <div className="plan-nm">Institutional</div>
              <div className="plan-desc">For event-driven funds. Full workflow, multi-seat.</div>
              <div className="plan-p">
                €600<span>/mo</span>
              </div>
              <div className="plan-save">€7,200/yr · 3 seats · API included</div>
              <div className="plan-feats">
                <div className="plan-feat">Everything in Analyst</div>
                <div className="plan-feat">Portfolio P&L + Kelly optimizer</div>
                <div className="plan-feat">API access (REST + webhooks)</div>
                <div className="plan-feat">3 analyst seats</div>
                <div className="plan-feat">Strategy backtesting engine</div>
                <div className="plan-feat">Priority support + custom coverage</div>
              </div>
              <ModalButton modal="contact" className="plan-cta btn-secondary">
                Contact Sales
              </ModalButton>
            </div>

            <div className="plan">
              <div className="plan-nm">Enterprise</div>
              <div className="plan-desc">White-label for allocators and prime brokers.</div>
              <div className="plan-p">
                €2,500<span>/mo</span>
              </div>
              <div className="plan-save">Custom SLA · SOC 2 roadmap</div>
              <div className="plan-feats">
                <div className="plan-feat">Everything in Institutional</div>
                <div className="plan-feat">White-label + custom branding</div>
                <div className="plan-feat">Unlimited seats</div>
                <div className="plan-feat">On-premise option</div>
                <div className="plan-feat">Custom OMS / PMS integrations</div>
                <div className="plan-feat">Dedicated coverage team</div>
              </div>
              <ModalButton modal="contact" className="plan-cta btn-secondary">
                Talk to Us
              </ModalButton>
            </div>
          </div>

          <div style={{ textAlign: "center", padding: "var(--sp-7) 0 var(--sp-4)", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.02em", marginBottom: 7 }}>
              Currently onboarding event-driven funds.
            </div>
            <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: "var(--sp-5)" }}>
              Institutional access only · Priority to funds &gt;€50M AUM in event-driven strategies
            </div>
            <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "center", flexWrap: "wrap" }}>
              <input type="email" placeholder="your@fund.com" className="form-input" style={{ width: 240 }} />
              <ModalButton modal="access" className="btn btn-primary">
                Request Institutional Access →
              </ModalButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
