import { type ReactNode } from "react";
import { LEGAL_EFFECTIVE } from "./_shared";

// Shared chrome for /legal/* pages. No inter-page sub-nav — the
// ComplianceFooter at the bottom of every page already carries the
// four links. Keeping it here would duplicate the nav and crowd the
// top of each legal page.
export default function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="page active">
      <div className="page-shell" style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ marginBottom: "var(--sp-6)" }}>
          <div className="hero-eyebrow">Legal</div>
          <h1
            className="hero-h"
            style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.1, margin: "var(--sp-2) 0 var(--sp-3)" }}
          >
            {title}
          </h1>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "var(--text-3)",
            }}
          >
            Effective · {LEGAL_EFFECTIVE} · SpecialSitsIntel · United States
          </div>
        </div>

        <div
          style={{
            paddingTop: "var(--sp-4)",
            borderTop: "1px solid var(--border)",
            fontSize: 14,
            lineHeight: 1.75,
            color: "var(--text-2)",
            maxWidth: "70ch",
          }}
          className="legal-body"
        >
          {children}
        </div>

        <style>{`
          .legal-body h2 {
            font-family: var(--font-sans);
            font-size: 18px;
            font-weight: 600;
            color: var(--text);
            margin: 32px 0 10px;
            letter-spacing: -0.01em;
          }
          .legal-body h3 {
            font-family: var(--font-sans);
            font-size: 15px;
            font-weight: 600;
            color: var(--text);
            margin: 24px 0 6px;
          }
          .legal-body p { margin-bottom: 14px; }
          .legal-body ul { margin: 0 0 14px 20px; }
          .legal-body li { margin-bottom: 6px; }
          .legal-body a { color: var(--navy); text-decoration: underline; }
          .legal-body strong { color: var(--text); font-weight: 600; }
          .legal-body .callout {
            padding: 14px 18px;
            background: var(--bg-2);
            border-left: 3px solid var(--amber);
            border-radius: var(--r-sm);
            margin: 18px 0;
            font-size: 13.5px;
          }
        `}</style>
      </div>
    </div>
  );
}
