"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { LEGAL_EFFECTIVE, LEGAL_PAGES } from "./_shared";

export default function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = usePathname();
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

        <nav
          style={{
            display: "flex",
            gap: "var(--sp-2)",
            flexWrap: "wrap",
            padding: "var(--sp-3) 0",
            marginBottom: "var(--sp-6)",
            borderTop: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {LEGAL_PAGES.map((p) => {
            const active = pathname === `/legal/${p.slug}`;
            return (
              <Link
                key={p.slug}
                href={`/legal/${p.slug}`}
                style={{
                  padding: "4px 10px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10.5,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: active ? "var(--navy)" : "var(--text-2)",
                  border: `1px solid ${active ? "var(--navy-bd)" : "var(--border)"}`,
                  background: active ? "var(--navy-bg)" : "transparent",
                  borderRadius: "var(--r-sm)",
                  textDecoration: "none",
                }}
              >
                {p.title}
              </Link>
            );
          })}
        </nav>

        <div
          style={{
            fontSize: 14,
            lineHeight: 1.75,
            color: "var(--text-2)",
            maxWidth: "70ch",
          }}
          className="legal-body"
        >
          {children}
        </div>

        <style jsx>{`
          :global(.legal-body h2) {
            font-family: var(--font-sans);
            font-size: 18px;
            font-weight: 600;
            color: var(--text);
            margin: 32px 0 10px;
            letter-spacing: -0.01em;
          }
          :global(.legal-body h3) {
            font-family: var(--font-sans);
            font-size: 15px;
            font-weight: 600;
            color: var(--text);
            margin: 24px 0 6px;
          }
          :global(.legal-body p) { margin-bottom: 14px; }
          :global(.legal-body ul) { margin: 0 0 14px 20px; }
          :global(.legal-body li) { margin-bottom: 6px; }
          :global(.legal-body a) { color: var(--navy); text-decoration: underline; }
          :global(.legal-body strong) { color: var(--text); font-weight: 600; }
          :global(.legal-body .callout) {
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
