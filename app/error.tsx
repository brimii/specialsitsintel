"use client";

import { useEffect } from "react";

// Branded error boundary — catches render errors in any route segment
// below the root. Degrades gracefully instead of showing Next's default
// crash page. Client component because Next requires error boundaries
// to be client-side (they handle `reset` via React state).
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in dev + any server-side telemetry picks it up.
    console.error("[route error]", error);
  }, [error]);

  return (
    <div className="page active">
      <div
        className="page-shell"
        style={{
          maxWidth: 640,
          margin: "0 auto",
          paddingTop: "15vh",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: ".14em",
            color: "var(--crimson)",
            textTransform: "uppercase",
            marginBottom: "var(--sp-3)",
          }}
        >
          ◉ Runtime error · recoverable
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(32px, 5vw, 48px)",
            fontWeight: 400,
            lineHeight: 1.1,
            margin: "0 0 var(--sp-4)",
            letterSpacing: "-.015em",
          }}
        >
          Something went sideways.
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-2)",
            lineHeight: 1.6,
            maxWidth: "52ch",
            margin: "0 auto var(--sp-5)",
          }}
        >
          A render error interrupted this route. The pipeline, your account and the market data
          cache are unaffected. Hit <strong style={{ color: "var(--text)" }}>Retry</strong> below
          — if it keeps happening, email{" "}
          <a href="mailto:contact@specialsitsintel.com" style={{ color: "var(--navy)" }}>
            contact@specialsitsintel.com
          </a>{" "}
          with the time stamp.
        </p>
        <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => reset()}
            className="btn btn-primary btn-sm"
            style={{ minWidth: 120 }}
          >
            ⟳ Retry
          </button>
          <a href="/" className="btn btn-secondary btn-sm" style={{ minWidth: 120 }}>
            Deal Universe
          </a>
        </div>
        {error.digest && (
          <div
            style={{
              marginTop: "var(--sp-6)",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-4)",
              letterSpacing: ".06em",
            }}
          >
            REF · {error.digest}
          </div>
        )}
      </div>
    </div>
  );
}
