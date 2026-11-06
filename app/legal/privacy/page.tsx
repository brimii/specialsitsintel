import type { Metadata } from "next";
import LegalShell from "../LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy — SpecialSitsIntel",
  description:
    "Privacy Policy for SpecialSitsIntel — what we collect, how we use it, who we share it with, and your rights.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <div className="callout">
        <strong>TL;DR.</strong> We collect the minimum needed to run the service — email, payment
        reference, usage logs. We do not sell data, serve ads, or profile you for marketing. EU /
        UK users have the full set of GDPR / UK GDPR rights.
      </div>

      <h2>1. Who we are &amp; scope</h2>
      <p>
        SpecialSitsIntel ("SSI", "we") is the data controller for personal data processed through
        this service. This Policy covers all users of specialsitsintel.com, its subdomains, and the
        admin surface. We operate out of the United States. If you are in the European Economic
        Area, United Kingdom, Switzerland, or California, specific regional rights apply (see
        section 7).
      </p>

      <h2>2. What we collect</h2>
      <h3>Information you provide</h3>
      <ul>
        <li>
          <strong>Account details</strong> — email, name, fund affiliation, AUM band (when provided
          at signup), subscription tier.
        </li>
        <li>
          <strong>Payment reference</strong> — Stripe customer ID and subscription ID. We never see
          or store card numbers; those live with Stripe.
        </li>
        <li>
          <strong>Portfolio data</strong> — positions and notes you add to your Watchlist /
          Portfolio tracker. Stored encrypted at rest.
        </li>
        <li>
          <strong>Support messages</strong> — if you email us, we retain the thread.
        </li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li>
          <strong>Session cookies</strong> — HttpOnly, Secure, short-lived; required for login.
        </li>
        <li>
          <strong>Server logs</strong> — IP address, user agent, timestamp, page requested. Retained
          30 days for security and abuse detection, then purged.
        </li>
        <li>
          <strong>Aggregated usage</strong> — which deals get opened, which filters get used, in
          anonymised form, to prioritise product improvements.
        </li>
      </ul>
      <p>
        <strong>We do not</strong> use third-party analytics beacons, advertising cookies, or
        cross-site trackers. The site runs no advertising.
      </p>

      <h2>3. How we use it</h2>
      <ul>
        <li>Deliver the service and its features (login, access control, billing).</li>
        <li>Secure the service (fraud and abuse detection, incident response).</li>
        <li>Comply with legal obligations (tax records, anti-money-laundering).</li>
        <li>Communicate with you about your account (service notices, billing).</li>
        <li>Improve the product (aggregated, anonymised usage patterns only).</li>
      </ul>
      <p>
        We do not use your personal data for marketing to others, data brokerage, profiling for
        advertising, or AI model training.
      </p>

      <h2>4. Legal bases (GDPR / UK GDPR)</h2>
      <ul>
        <li><strong>Contract</strong> — processing needed to provide the service you signed up for.</li>
        <li><strong>Legal obligation</strong> — accounting, tax, financial crime compliance.</li>
        <li><strong>Legitimate interests</strong> — security logging, abuse prevention, product
          improvement using aggregated data.</li>
        <li><strong>Consent</strong> — any optional communication you opt in to.</li>
      </ul>

      <h2>5. Who we share data with</h2>
      <p>
        Only service providers strictly needed to run the service:
      </p>
      <ul>
        <li><strong>Supabase</strong> (authentication, database) — US-hosted.</li>
        <li><strong>Vercel</strong> (application hosting) — US-hosted.</li>
        <li><strong>Stripe</strong> (payments) — subject to Stripe's own privacy policy.</li>
        <li><strong>Anthropic</strong> (Claude API, pipeline extraction) — only public-filing
          content is sent; no user-identifying data.</li>
      </ul>
      <p>
        We may disclose data if compelled by a lawful court order or subpoena, or to defend the
        service against imminent harm. We will push back on overbroad requests where lawful.
      </p>

      <h2>6. How long we keep data</h2>
      <ul>
        <li>Account data — while your account is active + 30 days after cancellation, then purged.</li>
        <li>Payment / billing records — 7 years (Stripe compliance).</li>
        <li>Server logs — 30 days.</li>
        <li>Aggregated usage — indefinitely but no PII attached.</li>
      </ul>

      <h2>7. Your rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access the data we hold about you.</li>
        <li>Rectify incorrect data.</li>
        <li>Delete your account and associated data (right to erasure).</li>
        <li>Export your data in a machine-readable format (right to portability).</li>
        <li>Object to specific processing or restrict it.</li>
        <li>Lodge a complaint with your local supervisory authority.</li>
      </ul>
      <p>
        To exercise any of these rights, email{" "}
        <a href="mailto:lbrimicombee@gmail.com">lbrimicombee@gmail.com</a>. We respond within 30
        days. Identity verification may be required.
      </p>

      <h2>8. California (CCPA / CPRA)</h2>
      <p>
        California residents have the right to know what categories of personal information we
        collect, to delete that information, to correct it, and to opt out of any "sale" or
        "sharing" of it. <strong>We do not sell or share personal information</strong> as defined
        under the CCPA / CPRA. To exercise your rights, use the contact above.
      </p>

      <h2>9. Children</h2>
      <p>
        The service is not directed to children under 18. We do not knowingly collect personal
        information from anyone under 18. If you believe a child has provided us data, contact us
        and we will delete it.
      </p>

      <h2>10. Security</h2>
      <p>
        We use industry-standard safeguards: TLS 1.2+ for all traffic, HttpOnly + Secure cookies,
        Row-Level Security policies on every database table, service-role keys held server-side
        only, signed Stripe webhooks, cron endpoints gated by a shared secret. See the Security
        page for full details.
      </p>

      <h2>11. International transfers</h2>
      <p>
        Our infrastructure is US-based. If you are outside the US, your data will be transferred
        to the US. For EU / UK transfers we rely on the Standard Contractual Clauses.
      </p>

      <h2>12. Changes</h2>
      <p>
        Material changes to this Policy will be notified by email and surfaced in-app for 30 days.
        The effective date at the top of this page tracks the current version.
      </p>

      <h2>13. Contact</h2>
      <p>
        Data protection questions, access or deletion requests:{" "}
        <a href="mailto:lbrimicombee@gmail.com">lbrimicombee@gmail.com</a>.
      </p>
    </LegalShell>
  );
}
