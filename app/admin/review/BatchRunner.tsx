"use client";

import { useState, useTransition } from "react";
import {
  runDiscoveryNow,
  runEuDiscoveryNow,
  runApacDiscoveryNow,
  reEnrichQueueItems,
  enrichFromPressReleases,
  approveAllClean,
  rejectAllTbd,
  refreshMarketPricesNow,
  runPipelineNow,
} from "./actions";

// Chain of operations that mirrors a nightly maintenance pass. Each
// step is its own server action with its own Vercel maxDuration budget,
// so a step that times out never blocks the next one — the batch still
// makes progress. The orchestrator is client-side (sequential awaits)
// so the user sees live progress without any special backend queue.
type Step = {
  id: string;
  label: string;
  icon: string;
  fn: () => Promise<void>;
  hint: string;
};

const STEPS: Step[] = [
  { id: "us", icon: "🇺🇸", label: "Discover US (SEC EDGAR)", fn: runDiscoveryNow, hint: "~3-5 min" },
  { id: "eu", icon: "🇪🇺", label: "Discover EU (CMA + DG COMP)", fn: runEuDiscoveryNow, hint: "~2-3 min" },
  { id: "apac", icon: "🌏", label: "Discover APAC (TDnet + HKEX + ASX)", fn: runApacDiscoveryNow, hint: "~2-4 min" },
  { id: "enrich-pdf", icon: "💰", label: "Enrich missing prices (PDF)", fn: reEnrichQueueItems, hint: "~1-3 min" },
  { id: "enrich-pr", icon: "📰", label: "Enrich from press releases", fn: enrichFromPressReleases, hint: "~2-5 min" },
  { id: "approve", icon: "✅", label: "Approve all clean", fn: approveAllClean, hint: "<1 min" },
  { id: "reject", icon: "🗑", label: "Reject TBD items", fn: rejectAllTbd, hint: "<1 min" },
  { id: "market", icon: "📊", label: "Refresh market prices", fn: refreshMarketPricesNow, hint: "~1-2 min" },
  { id: "update", icon: "▶", label: "Quick update (10 US deals)", fn: runPipelineNow, hint: "~30s" },
];

type StepState = {
  status: "pending" | "running" | "done" | "error";
  durationMs?: number;
  error?: string;
};

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m${Math.floor((ms % 60000) / 1000)}s`;
}

export default function BatchRunner() {
  const [states, setStates] = useState<Record<string, StepState>>(() =>
    Object.fromEntries(STEPS.map((s) => [s.id, { status: "pending" as const }])),
  );
  const [isPending, startTransition] = useTransition();
  const [running, setRunning] = useState(false);
  const [elapsedTotal, setElapsedTotal] = useState<number | null>(null);

  const reset = () => {
    setStates(Object.fromEntries(STEPS.map((s) => [s.id, { status: "pending" as const }])));
    setElapsedTotal(null);
  };

  const run = async () => {
    reset();
    setRunning(true);
    const t0 = Date.now();
    for (const step of STEPS) {
      setStates((prev) => ({ ...prev, [step.id]: { status: "running" } }));
      const stepT0 = Date.now();
      try {
        await new Promise<void>((resolve, reject) => {
          startTransition(() => {
            step
              .fn()
              .then(resolve)
              .catch(reject);
          });
        });
        setStates((prev) => ({
          ...prev,
          [step.id]: { status: "done", durationMs: Date.now() - stepT0 },
        }));
      } catch (e) {
        setStates((prev) => ({
          ...prev,
          [step.id]: {
            status: "error",
            durationMs: Date.now() - stepT0,
            error: (e as Error).message ?? "Unknown error",
          },
        }));
        // Don't abort the batch — subsequent steps often work even if
        // one timed out (Vercel kills the function but the DB side may
        // have made partial progress).
      }
    }
    setElapsedTotal(Date.now() - t0);
    setRunning(false);
  };

  const anyError = Object.values(states).some((s) => s.status === "error");
  const allDone = Object.values(states).every((s) => s.status === "done" || s.status === "error");

  return (
    <div
      style={{
        padding: "var(--sp-4) var(--sp-4)",
        border: "1px solid var(--navy-bd)",
        background: "var(--navy-bg)",
        borderRadius: "var(--r-md)",
        marginBottom: "var(--sp-4)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "var(--sp-3)",
          flexWrap: "wrap",
          marginBottom: "var(--sp-3)",
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "var(--navy)",
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            🔄 NIGHTLY BATCH — one-click
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--text-2)",
              lineHeight: 1.55,
              maxWidth: "60ch",
            }}
          >
            Chains all nine maintenance operations in order (discover all regions →
            enrich prices → approve clean → reject TBD → refresh markets → update).
            Total wall-time typically 15-25 min. You can walk away and return to see
            the summary. Steps that time out individually don't block the next one.
          </div>
        </div>
        <div style={{ display: "flex", gap: "var(--sp-2)", flexShrink: 0 }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={run}
            disabled={running}
            style={{ whiteSpace: "nowrap" }}
          >
            {running ? "Running…" : allDone ? "🔄 Run again" : "🔄 Run everything"}
          </button>
          {allDone && !running && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={reset}
              style={{ whiteSpace: "nowrap" }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {STEPS.map((step, i) => {
          const s = states[step.id];
          const pillColor =
            s.status === "done"
              ? "var(--navy)"
              : s.status === "error"
                ? "var(--crimson)"
                : s.status === "running"
                  ? "var(--amber)"
                  : "var(--text-3)";
          const pillBg =
            s.status === "done"
              ? "var(--navy-bg)"
              : s.status === "error"
                ? "var(--crimson-bg)"
                : s.status === "running"
                  ? "var(--amber-bg)"
                  : "var(--bg-2)";
          return (
            <div
              key={step.id}
              style={{
                display: "grid",
                gridTemplateColumns: "28px 1fr auto auto",
                alignItems: "center",
                gap: "var(--sp-3)",
                padding: "6px 8px",
                background: "var(--bg-1)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)",
                opacity: s.status === "pending" && running ? 0.5 : 1,
                transition: "opacity .2s ease",
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{step.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>
                  <span style={{ color: "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: 9.5, marginRight: 6 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {step.label}
                </div>
                {s.status === "error" && s.error && (
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      color: "var(--crimson)",
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={s.error}
                  >
                    {s.error}
                  </div>
                )}
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  color: "var(--text-3)",
                  letterSpacing: ".04em",
                }}
              >
                {s.durationMs ? fmtDuration(s.durationMs) : step.hint}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: pillColor,
                  background: pillBg,
                  border: `1px solid ${pillColor}`,
                  padding: "2px 6px",
                  borderRadius: "var(--r-sm)",
                  whiteSpace: "nowrap",
                }}
              >
                {s.status === "running" ? "…" : s.status}
              </span>
            </div>
          );
        })}
      </div>

      {elapsedTotal !== null && (
        <div
          style={{
            marginTop: "var(--sp-3)",
            paddingTop: "var(--sp-2)",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-3)",
            letterSpacing: ".06em",
            textTransform: "uppercase",
          }}
        >
          <span>Total wall-time · {fmtDuration(elapsedTotal)}</span>
          <span style={{ color: anyError ? "var(--crimson)" : "var(--navy)" }}>
            {anyError ? "Finished with errors" : "All green"}
          </span>
        </div>
      )}
      {/* Silence unused — useTransition keeps the UI responsive during awaits. */}
      {false && isPending ? null : null}
    </div>
  );
}
