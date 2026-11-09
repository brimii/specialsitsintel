import Link from "next/link";
import type { Metadata } from "next";
import ModalButton from "@/app/components/ModalButton";
import CheckoutButton from "@/app/components/CheckoutButton";

export const metadata: Metadata = {
  title: "Pricing — SpecialSitsIntel",
  description:
    "Four tiers from free preview to enterprise white-label. Institutional US event-driven intelligence at Bloomberg-challenger pricing.",
};

export default function PricingPage() {
  return (
    <div className="page active" id="page-pricing">
      <div style={{ maxWidth: "var(--content-max)", margin: "0 auto", padding: "0 clamp(20px,3vw,32px) 80px" }}>
        <div className="page-hero">
          <div>
            <div className="hero-eyebrow">Pricing</div>
            <h1 className="hero-h">
              Institutional intelligence.
              <br />
              <em>Challenger price.</em>
            </h1>
            <p className="hero-sub" style={{ marginTop: "var(--sp-4)" }}>
              Bloomberg at under 7% of the cost. No per-seat surprises. Stripe-managed, cancel from
              the Customer Portal at any time, access runs to the end of the paid period.
            </p>
          </div>
        </div>

        <div className="pricing-grid stagger">
          <div className="plan">
            <div className="plan-nm">Free</div>
            <div className="plan-desc">Preview for analysts evaluating the platform.</div>
            <div className="plan-p">
              €0<span>/mo</span>
            </div>
            <div className="plan-save">{" "}</div>
            <div className="plan-feats">
              <div className="plan-feat">5 live situations</div>
              <div className="plan-feat">Gross spread + close probability</div>
              <div className="plan-feat">Academy — 2 strategy modules</div>
              <div className="plan-feat no">AI commentary &amp; FTC scoring</div>
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
              <div className="plan-feat">All active US situations</div>
              <div className="plan-feat">AI scoring + FTC NLP signals</div>
              <div className="plan-feat">Full price charts with zoom</div>
              <div className="plan-feat">Portfolio tracker</div>
              <div className="plan-feat">8 US regulators monitored</div>
              <div className="plan-feat">Real-time alerts (15 / day)</div>
              <div className="plan-feat no">API access</div>
              <div className="plan-feat no">Multi-seat</div>
            </div>
            <CheckoutButton tier="analyst" className="plan-cta btn btn-primary">
              Subscribe →
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
              <div className="plan-feat">Portfolio P&amp;L + Kelly optimizer</div>
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

        <div
          style={{
            textAlign: "center",
            padding: "var(--sp-7) 0 var(--sp-4)",
            borderTop: "1px solid var(--border)",
            marginTop: "var(--sp-8)",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.02em", marginBottom: 7 }}>
            Currently onboarding event-driven funds.
          </div>
          <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: "var(--sp-5)" }}>
            Institutional access only · Priority to funds &gt;€50M AUM in event-driven strategies
          </div>
          <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "center", flexWrap: "wrap" }}>
            <ModalButton modal="access" className="btn btn-primary btn-lg">
              Request Access
            </ModalButton>
            <Link href="/legal/terms" className="btn btn-secondary btn-lg">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
