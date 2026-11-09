"use client";

// Last-resort error boundary. Fires when the root layout itself
// throws — this is the only place Next.js renders no shell at all, so
// we have to emit a full <html> + <body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#0a0f28",
          color: "#e8eefc",
          fontFamily: "ui-monospace, Menlo, monospace",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: ".14em",
              color: "#ff5078",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            ◉ Fatal error · root layout crashed
          </div>
          <h1 style={{ fontSize: 32, margin: "0 0 12px", fontWeight: 500, letterSpacing: "-.01em" }}>
            We lost the frame.
          </h1>
          <p style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.8, margin: "0 0 24px" }}>
            The root layout failed to render. Hit retry — if it persists, mail{" "}
            <a href="mailto:contact@specialsitsintel.com" style={{ color: "#4a9cff" }}>
              contact@specialsitsintel.com
            </a>
            .
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "#4a9cff",
              border: 0,
              color: "#0a0f28",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: ".06em",
              padding: "8px 16px",
              cursor: "pointer",
              borderRadius: 2,
            }}
          >
            ⟳ RETRY
          </button>
          {error.digest && (
            <div style={{ marginTop: 20, fontSize: 10, opacity: 0.5, letterSpacing: ".06em" }}>
              REF · {error.digest}
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
