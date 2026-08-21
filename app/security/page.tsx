import Link from "next/link";

// Public-facing security & data protection page. Not a legal
// document — it's a plain-language summary of the controls the app
// enforces, so an analyst / procurement contact can size the risk
// without reading the codebase. Update alongside real changes.

type Control = {
  code: string;
  title: string;
  status: "IN PLACE" | "PARTIAL" | "PLANNED";
  col: "G" | "A" | "R";
  body: string[];
};

const SECTIONS: Array<{ label: string; hint: string; controls: Control[] }> = [
  {
    label: "Identity & access",
    hint: "Who can log in, how sessions are proven, and where the trust boundary sits.",
    controls: [
      {
        code: "IAM-01",
        title: "Server-side authorisation",
        status: "IN PLACE",
        col: "G",
        body: [
          "Every request that touches restricted data (a deal above the user's tier, an admin action, a Stripe operation) re-checks the caller's identity and role on the server before returning anything.",
          "The browser is never trusted with the access decision. Client code cannot escalate its own tier by editing state — the API returns the filtered payload that matches the server-verified tier.",
        ],
      },
      {
        code: "IAM-02",
        title: "Supabase Auth + secure cookies",
        status: "IN PLACE",
        col: "G",
        body: [
          "Authentication runs on Supabase Auth: email + password with confirmation link, password reset, and magic link support.",
          "Sessions are stored in HttpOnly cookies scoped to the app domain (HttpOnly + Secure in production), refreshed by @supabase/ssr through a proxy layer on every navigation. No token ever reaches JavaScript.",
        ],
      },
      {
        code: "IAM-03",
        title: "Admin surface segregation",
        status: "IN PLACE",
        col: "G",
        body: [
          "The /admin route is gated by a server-side requireAdmin() check that 404s (not 403s) if the user's profile.role is not 'admin' — the surface is invisible to non-admins.",
          "Server actions (approve/reject/enrich/refresh) each re-verify admin status independently. A stale session cannot execute a mutation.",
        ],
      },
    ],
  },
  {
    label: "Data access",
    hint: "How Row-Level Security keeps user A's data out of user B's session, and how tier gating is enforced end-to-end.",
    controls: [
      {
        code: "DAT-01",
        title: "Row-Level Security on every table",
        status: "IN PLACE",
        col: "G",
        body: [
          "All six application tables (profiles, subscriptions, deals, deal_updates, sources, review_queue) have RLS enabled with explicit policies.",
          "Regular users can only SELECT rows their tier permits. Only the service_role key (server-only, never sent to the browser) can bypass RLS for admin queries.",
        ],
      },
      {
        code: "DAT-02",
        title: "Tier-based deal filtering",
        status: "IN PLACE",
        col: "G",
        body: [
          "Deals carry a min_tier column. A user sees a deal only when their tier ≥ deal.min_tier. Filtering happens at three layers: (1) SQL policy, (2) server-side getDealsForTier() before response serialisation, (3) UI locking on premium fields (AI commentary, price chart, FTC scoring) for free users.",
          "Free tier gets 5 deals maximum, with premium fields stripped from the payload before it leaves the server. There is no way to read them by opening dev tools.",
        ],
      },
      {
        code: "DAT-03",
        title: "Source URL protection (product rule)",
        status: "IN PLACE",
        col: "G",
        body: [
          "The raw source URLs (SEC EDGAR filings, gov.uk CMA cases, DG COMP decisions, TDnet PDFs, HKEX disclosures, ASX announcements) are visible only in the admin panel.",
          "Client-facing UI shows the source label ('SEC' / 'CMA' / 'DG COMP' / 'TDnet' / 'HKEX' / 'ASX' badges) but never the URL — customers get the curated intelligence, not a link to reproduce the pipeline.",
        ],
      },
    ],
  },
  {
    label: "Payments & billing",
    hint: "Stripe integration hardening. Webhook signature, idempotency, no client-side price manipulation.",
    controls: [
      {
        code: "PAY-01",
        title: "Signed Stripe webhooks",
        status: "IN PLACE",
        col: "G",
        body: [
          "Every incoming webhook is verified against STRIPE_WEBHOOK_SECRET via Stripe's signature check. Unsigned or tampered payloads are rejected before any state change.",
          "Handlers are idempotent: replaying the same event does not double-apply. Tier grants and revocations are driven only by verified webhook state, never by client input.",
        ],
      },
      {
        code: "PAY-02",
        title: "Server-only price mapping",
        status: "IN PLACE",
        col: "G",
        body: [
          "The tier ↔ Stripe Price ID mapping lives server-side (lib/stripe.ts). The browser cannot request a checkout at an arbitrary price — the API constructs the session from the tier name only.",
          "Customer portal is opened via a per-user, short-lived signed URL. No public link is issued.",
        ],
      },
      {
        code: "PAY-03",
        title: "Test-mode gating for pre-production",
        status: "PARTIAL",
        col: "A",
        body: [
          "Development environments use Stripe test keys and fictional cards. Prod switch is a checklist step (env var swap + verified webhook endpoint) before go-live.",
          "Planned: automated Stripe live-mode readiness check in the deploy pipeline.",
        ],
      },
    ],
  },
  {
    label: "Secrets & configuration",
    hint: "Where the sensitive keys live, and what a leak of any single credential could / could not do.",
    controls: [
      {
        code: "SEC-01",
        title: "No secrets in source or in the browser",
        status: "IN PLACE",
        col: "G",
        body: [
          "Stripe secret, Supabase service_role, Anthropic API key, and cron secret are environment variables only — never committed to git and never exposed via NEXT_PUBLIC_ prefix.",
          "The only Supabase key sent to the browser is the anon key, which by design is protected by RLS. Reading it grants no additional privileges.",
        ],
      },
      {
        code: "SEC-02",
        title: "Cron authentication",
        status: "IN PLACE",
        col: "G",
        body: [
          "Vercel cron endpoints check an Authorization: Bearer $CRON_SECRET header. Requests without it are rejected before any Anthropic / Supabase call.",
          "This prevents a stranger discovering /api/cron/refresh-prices and burning our Anthropic quota or Yahoo call budget.",
        ],
      },
      {
        code: "SEC-03",
        title: "Least-privilege client keys",
        status: "IN PLACE",
        col: "G",
        body: [
          "Supabase Auth uses a browser client with the anon key, subject to RLS. Server operations that need to bypass RLS create a separate admin client with the service_role key — that client is instantiated only inside server modules marked 'server-only'.",
          "'server-only' import bans a module from being bundled into any client component. A leak would fail at build time.",
        ],
      },
    ],
  },
  {
    label: "Data pipeline integrity",
    hint: "How AI extraction is kept from silently publishing wrong facts to paying subscribers.",
    controls: [
      {
        code: "PIP-01",
        title: "Sources over model knowledge",
        status: "IN PLACE",
        col: "G",
        body: [
          "The extraction prompt instructs Claude to propose a change only when the source document explicitly states it. Model priors are not enough. Sourceless proposals are rejected upstream of the DB.",
          "No republication of licensed data (Bloomberg, Reuters, Reorg). Only public sources: SEC EDGAR, government antitrust portals, exchange disclosure feeds, issuer press releases.",
        ],
      },
      {
        code: "PIP-02",
        title: "Human validation for material changes",
        status: "IN PLACE",
        col: "G",
        body: [
          "Any MAJEUR change (closing, block, deal death, price move, structure change) is queued to /admin/review for human approval. It cannot auto-publish, regardless of AI confidence.",
          "MINEUR changes auto-publish only under a strict gate: confiance ≥ 90 AND ≥2 sources concordantes. Every auto-publication writes a marker row (champ_modifie = '_auto_publish') so the admin dashboard can track them separately.",
        ],
      },
      {
        code: "PIP-03",
        title: "Audit trail on every change",
        status: "IN PLACE",
        col: "G",
        body: [
          "Every update to a deal writes a deal_updates row with old value, new value, source URL, confidence score, author ('ia' or 'humain'), and timestamp. Nothing changes silently.",
          "The audit trail is queryable by admins and never truncated. Compliance and reproducibility come from the same log.",
        ],
      },
    ],
  },
  {
    label: "Privacy & data protection",
    hint: "What personal data we hold, why, and what we do about deletion / portability requests.",
    controls: [
      {
        code: "PRV-01",
        title: "Minimal personal data collected",
        status: "IN PLACE",
        col: "G",
        body: [
          "profiles carries only: email, name, fund name, AUM band, tier, role, created timestamp. No home address, no phone, no ID document, no browsing telemetry.",
          "Deals data contains no personal information — it is public-market intelligence about corporate transactions.",
        ],
      },
      {
        code: "PRV-02",
        title: "GDPR — data subject requests",
        status: "PARTIAL",
        col: "A",
        body: [
          "Users can request export or deletion by contacting the account owner. Deletion cascades to profiles, subscriptions, and any user-specific portfolio state.",
          "Planned: self-service export + delete button in the account settings page. Timeline: before public prod launch.",
        ],
      },
      {
        code: "PRV-03",
        title: "Data retention",
        status: "IN PLACE",
        col: "G",
        body: [
          "User account data: retained while the account is active + 30 days after cancellation for reversal, then hard-deleted from primary DB.",
          "Deal data & audit trail: retained indefinitely — it's the historical record analysts depend on.",
          "Payment records: retained per Stripe's own compliance requirements (typically 7 years for accounting).",
        ],
      },
    ],
  },
  {
    label: "Operations & incident response",
    hint: "What happens when something breaks, and how the health of the pipeline is monitored.",
    controls: [
      {
        code: "OPS-01",
        title: "Backup & recovery",
        status: "IN PLACE",
        col: "G",
        body: [
          "Supabase runs point-in-time recovery + daily automated backups on the managed instance. Restoration path is documented in runbook.",
          "Application code lives on GitHub — every state is recoverable from git.",
        ],
      },
      {
        code: "OPS-02",
        title: "Pipeline health monitoring",
        status: "PARTIAL",
        col: "A",
        body: [
          "Vercel cron logs surface daily pipeline outcomes. The /admin dashboard shows source-level freshness (last approved deal per source), auto-publication counts, and coverage funnels.",
          "Planned: alerting when a source produces zero deals for 72h, or when auto-publish rate drops to zero.",
        ],
      },
      {
        code: "OPS-03",
        title: "Incident response",
        status: "PARTIAL",
        col: "A",
        body: [
          "Security or data-quality incident: notify the account owner within 24 hours, revoke affected credentials immediately, freeze auto-publish if the AI pipeline is suspected.",
          "Planned: formal SLA + post-mortem template + a public status page for prod.",
        ],
      },
    ],
  },
];

const COL: Record<string, { text: string; bg: string; bd: string }> = {
  G: { text: "var(--navy)", bg: "var(--navy-bg)", bd: "var(--navy-bd)" },
  A: { text: "var(--amber)", bg: "var(--amber-bg)", bd: "var(--amber-bd)" },
  R: { text: "var(--crimson)", bg: "var(--crimson-bg)", bd: "var(--crimson-bd)" },
};

export default function SecurityPage() {
  return (
    <div className="page active" id="page-security">
      <div className="page-shell">
        <div className="page-hero">
          <div>
            <div className="hero-eyebrow">Security & Data Protection</div>
            <h1 className="hero-h">
              Terminal-grade controls.
              <br />
              <em>No hidden trust.</em>
            </h1>
          </div>
          <div>
            <p className="hero-sub">
              Every access decision runs on the server. Every AI-proposed change is either
              human-reviewed or auto-published under a strict quantitative gate, with a full audit
              trail. Below: the concrete controls in force today, grouped by domain, with plain-
              language descriptions an analyst or procurement contact can read in ten minutes.
            </p>
          </div>
        </div>

        {SECTIONS.map((sec) => (
          <div key={sec.label} style={{ marginBottom: "var(--sp-6)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: ".1em",
                color: "var(--text-3)",
                textTransform: "uppercase",
                marginBottom: "var(--sp-2)",
              }}
            >
              {sec.label}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: "var(--sp-3)", lineHeight: 1.6 }}>
              {sec.hint}
            </div>
            <div className="reg-grid">
              {sec.controls.map((c) => {
                const pal = COL[c.col];
                return (
                  <div className="reg-card" key={c.code}>
                    <div className="reg-card-hd">
                      <div>
                        <div className="reg-card-nm">{c.title}</div>
                        <div className="reg-card-jd">{c.code}</div>
                      </div>
                      <span
                        className="reg-card-status"
                        style={{ background: pal.bg, color: pal.text, border: `1px solid ${pal.bd}` }}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="reg-card-body">
                      {c.body.map((p, i) => (
                        <p
                          key={i}
                          style={{
                            fontSize: 11,
                            color: "var(--text-2)",
                            lineHeight: 1.65,
                            marginBottom: i < c.body.length - 1 ? "var(--sp-2)" : 0,
                          }}
                        >
                          {p}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div
          style={{
            marginTop: "var(--sp-6)",
            padding: "var(--sp-4)",
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-md)",
            fontSize: 11,
            color: "var(--text-2)",
            lineHeight: 1.7,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: ".08em",
              color: "var(--text-3)",
              textTransform: "uppercase",
              marginBottom: "var(--sp-2)",
            }}
          >
            Contact
          </div>
          Security questions, responsible disclosure, or GDPR requests →{" "}
          <Link href="/home" style={{ color: "var(--navy)", fontWeight: 600 }}>
            contact us
          </Link>
          . We respond within 48 hours for security matters and 30 days for data-subject requests.
        </div>
      </div>
    </div>
  );
}
