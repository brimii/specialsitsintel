import type { Metadata } from "next";
import LegalShell from "../LegalShell";

export const metadata: Metadata = {
  title: "Disclosures & Disclaimers — SpecialSitsIntel",
  description:
    "Important disclosures about the nature of the service, data provenance, model limits, and investment-related caveats.",
};

export default function DisclosuresPage() {
  return (
    <LegalShell title="Disclosures & Disclaimers">
      <div className="callout">
        <strong>Important.</strong> SpecialSitsIntel is a research and data product for
        institutional investors. It is <strong>not</strong> a registered investment adviser, broker,
        or dealer, and the content is not personalised investment advice.
      </div>

      <h2>1. Nature of the service</h2>
      <p>
        SpecialSitsIntel aggregates publicly-available filings and regulator announcements,
        summarises them using AI, and surfaces them in a terminal format for institutional
        subscribers. We are a <strong>data and research publisher</strong> — not a financial
        intermediary.
      </p>
      <p>
        SSI is not registered with the US Securities and Exchange Commission as an investment
        adviser under the Investment Advisers Act of 1940, nor with FINRA as a broker-dealer. We
        do not manage client funds, execute trades, or provide personalised investment
        recommendations.
      </p>

      <h2>2. Not investment advice</h2>
      <p>
        All content on the service — AI commentary, probability scores, FTC language scoring,
        expected-value estimates, spread calculations, timeline forecasts, status alerts — is
        <strong> provided for informational purposes only</strong>. It represents our analytical
        interpretation of public information. It does not:
      </p>
      <ul>
        <li>Constitute investment advice, legal advice, tax advice, or accounting advice.</li>
        <li>Represent a recommendation to buy, hold, or sell any security.</li>
        <li>Constitute an offer or solicitation of any securities transaction.</li>
        <li>Take into account your personal financial situation or risk tolerance.</li>
      </ul>
      <p>
        Any investment decisions you make based on information on the service are solely your
        responsibility. Consult a qualified, licensed professional before investing in any special
        situation.
      </p>

      <h2>3. Past performance</h2>
      <p>
        Historical returns shown for past deals (e.g. on the Playbooks / Historical sections) are
        presented as educational case studies. <strong>Past performance of any situation is not
        indicative of future results.</strong> Merger arbitrage, activism, distressed, and spin-off
        strategies carry material risk of loss, including total loss of principal.
      </p>

      <h2>4. Data provenance</h2>
      <p>
        Our pipelines pull only from publicly-available feeds:
      </p>
      <ul>
        <li>SEC EDGAR (full-text search of S-4, DEFM14A, SC TO-T, SC 13D, 13E-3, 8-K filings).</li>
        <li>Public press releases via PR Newswire, Business Wire, and issuer disclosure pages.</li>
        <li>Public market data (closing prices, intraday quotes via free-tier providers).</li>
      </ul>
      <p>
        We do not republish licensed data (Bloomberg, Reuters, Reorg). We do not use non-public
        material or insider information in any form. If you believe content on the service infringes
        your intellectual property, contact us immediately.
      </p>

      <h2>5. AI limitations</h2>
      <p>
        Portions of the service — deal extraction, commentary, status inference, timeline
        prediction — are generated using large language models (Claude, operated by Anthropic). AI
        systems can:
      </p>
      <ul>
        <li>Misinterpret ambiguous filings.</li>
        <li>Miss updates to deals that haven't been re-scanned.</li>
        <li>Produce confident-sounding but incorrect summaries.</li>
      </ul>
      <p>
        Every material change (closing, blocking, deal death, price revision) is{" "}
        <strong>required to pass a human review step</strong> before being published — it does not
        auto-publish. Minor updates with ≥90% confidence from two concordant sources may
        auto-publish and are marked with an audit tag. You should still verify any information with
        the original source filing before acting on it.
      </p>

      <h2>6. Pricing &amp; market data</h2>
      <p>
        Prices shown on the service may be delayed by up to 15 minutes and are provided for
        informational purposes only. They may differ from real-time quotes and from your broker.
        Do not use prices on the service for execution. Market cap and deal size figures are
        FX-normalised to USD as of the most recent market refresh.
      </p>

      <h2>7. Deal coverage</h2>
      <p>
        We cover active US event-driven situations (merger arbitrage, activism, distressed,
        spin-offs, restructurings, tender offers). Coverage is intentionally scoped to US
        jurisdiction and active deals. Historical case studies in the Playbooks section may
        include non-US deals for educational context.
      </p>
      <p>
        We do not claim to cover every US special situation at every point in time. A deal's absence
        from the service does not imply judgment about its merit.
      </p>

      <h2>8. Conflicts of interest</h2>
      <p>
        SSI may, from time to time, hold a direct or indirect interest in situations covered on the
        service. Material positions will be disclosed where required. We do not accept paid
        placement, sponsored content, or compensation from any issuer, deal party, or counsel for
        coverage of their deal.
      </p>

      <h2>9. Forward-looking statements</h2>
      <p>
        Statements on the service that project future events (expected close dates, probability
        estimates, regulatory outcomes, scenario values) are forward-looking and subject to
        significant uncertainty. Actual outcomes may differ materially.
      </p>

      <h2>10. Jurisdiction</h2>
      <p>
        The service is directed to institutional investors in the United States. Access from other
        jurisdictions is permitted but we make no representation that the service is appropriate
        for use in those jurisdictions. You are responsible for compliance with your local
        securities laws.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these disclosures, or to report a data issue:{" "}
        <a href="mailto:lbrimicombee@gmail.com">lbrimicombee@gmail.com</a>.
      </p>
    </LegalShell>
  );
}
