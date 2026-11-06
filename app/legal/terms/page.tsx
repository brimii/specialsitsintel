import type { Metadata } from "next";
import LegalShell from "../LegalShell";

export const metadata: Metadata = {
  title: "Terms of Service — SpecialSitsIntel",
  description:
    "Terms of Service governing use of the SpecialSitsIntel event-driven intelligence terminal.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service">
      <div className="callout">
        <strong>Read before use.</strong> These Terms govern your access to the SpecialSitsIntel
        terminal. By creating an account or using the service you agree to be bound by them. If you
        do not agree, do not use the service.
      </div>

      <h2>1. Who we are</h2>
      <p>
        <strong>SpecialSitsIntel</strong> ("SSI", "we", "us", or "our") operates a US
        event-driven intelligence terminal that aggregates publicly-available filings, regulator
        announcements, and press releases, and publishes AI-curated structured intelligence to
        institutional subscribers. The service is operated from the United States. Governing law:
        the laws of the State of Delaware, without regard to conflicts-of-law principles.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 18 years old and legally authorised to enter into binding contracts in
        your jurisdiction to use the service. The service is designed for{" "}
        <strong>institutional investors, qualified investment professionals, and accredited
        investors</strong> as those terms are defined under Rule 501 of Regulation D of the US
        Securities Act. Individual retail investors are not the intended audience.
      </p>

      <h2>3. Account &amp; access</h2>
      <p>
        Access to premium content (AI commentary, FTC scoring, price charts, portfolio tracking, and
        the admin surface) requires a paid subscription at the Analyst, Institutional, or Enterprise
        tier. You are responsible for safeguarding your credentials, for all activity under your
        account, and for notifying us immediately of any unauthorised use.
      </p>
      <p>
        You may not share your account with others, resell access, scrape the interface via
        automated tooling, reverse-engineer the service, or use the service to build a competing
        product.
      </p>

      <h2>4. Subscription &amp; billing</h2>
      <p>
        Subscriptions are billed through Stripe. By subscribing you authorise recurring charges to
        your chosen payment method until you cancel. You may cancel at any time from the Customer
        Portal; access continues through the end of the paid billing period. Refunds are discretionary
        and granted case-by-case for legitimate billing errors.
      </p>

      <h2>5. Intellectual property</h2>
      <p>
        The service, the terminal interface, the SSI mark, the curated intelligence, and all
        associated software are owned by SSI or its licensors. You receive a limited, non-exclusive,
        non-transferable licence to use the service for your own internal investment-research
        purposes during your subscription. All other rights are reserved.
      </p>
      <p>
        You may reference specific curated items in your own internal research memos provided you
        attribute SpecialSitsIntel. You may not redistribute, republish, or syndicate our content
        externally without a separate written licence.
      </p>

      <h2>6. Not investment advice</h2>
      <p>
        The content on SSI — including AI commentary, probability estimates, spread calculations,
        expected-value scores, and timeline forecasts — is{" "}
        <strong>provided for informational purposes only</strong>. It does not constitute investment
        advice, a recommendation, a solicitation, or an offer to buy or sell any security. Any
        investment decision you make is your sole responsibility. Past performance of mentioned
        situations is not indicative of future results.
      </p>

      <h2>7. Service availability &amp; data quality</h2>
      <p>
        We aim for continuous availability and accurate data but provide the service on an
        "as-is" and "as-available" basis. Pipelines depend on third-party feeds (SEC EDGAR, market
        data providers, press-release wires) whose uptime is outside our control. We do not
        guarantee that the service will be error-free, uninterrupted, or complete.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, SSI shall not be liable for any indirect,
        incidental, special, consequential, or exemplary damages, including lost profits or trading
        losses, arising out of or related to your use of the service. Our total aggregate liability
        in any twelve-month period shall not exceed the fees you paid us during that period.
      </p>

      <h2>9. Termination</h2>
      <p>
        We may suspend or terminate your account for breach of these Terms, for suspected abuse, or
        for compliance reasons. You may terminate at any time from the Customer Portal. Clauses that
        by their nature should survive termination (intellectual property, limitation of liability,
        governing law, disputes) survive.
      </p>

      <h2>10. Changes to the Terms</h2>
      <p>
        We may update these Terms occasionally. The current version is identified by the Effective
        date at the top of this page. Material changes will be notified by email and surfaced in-app
        for 30 days. Continued use after the effective date of any change constitutes acceptance.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these Terms, or about anything else:{" "}
        <a href="mailto:lbrimicombee@gmail.com">lbrimicombee@gmail.com</a>. Postal address available
        on request.
      </p>
    </LegalShell>
  );
}
