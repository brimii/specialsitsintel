"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { batchGenerateMissing } from "./actions";

// One-click "Generate missing commentaries" button on /admin/deals.
// Serially calls Claude for every deal whose ai_commentary is empty,
// writes the result back to Supabase, reports the counts. Confirms
// first — ~$0.002 per deal, admin should know what they're buying.
export default function BatchCommentaryButton({ missingCount }: { missingCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  const run = () => {
    const estimated = (missingCount * 0.002).toFixed(2);
    if (
      !confirm(
        `Generate AI commentary for ${missingCount} deal${
          missingCount === 1 ? "" : "s"
        }?\n\n~$${estimated} total in Claude API fees. Each commentary will be written to the deal row and tracked in the audit trail with model + timestamp.`,
      )
    )
      return;
    setResult(null);
    startTransition(async () => {
      try {
        const r = await batchGenerateMissing();
        setResult(
          `${r.processed} generated · ${r.skipped} already had commentary · ${r.errors.length} failed${
            r.errors.length > 0
              ? `\n\nFirst errors: ${r.errors.slice(0, 3).map((e) => `#${e.id}: ${e.reason}`).join(" · ")}`
              : ""
          }`,
        );
        router.refresh();
      } catch (e) {
        setResult(`Batch failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  };

  if (missingCount === 0) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        style={{
          background: pending ? "var(--bg-2)" : "var(--amber)",
          color: pending ? "var(--text-3)" : "var(--bg)",
          border: "none",
          padding: "8px 14px",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          cursor: pending ? "wait" : "pointer",
          borderRadius: "var(--r-sm)",
          fontWeight: 600,
        }}
      >
        {pending ? `Generating ${missingCount}…` : `⚡ Generate ${missingCount} missing commentar${missingCount === 1 ? "y" : "ies"}`}
      </button>
      {result ? (
        <span style={{ fontSize: 10.5, color: "var(--text-2)", fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap" }}>
          {result}
        </span>
      ) : null}
    </div>
  );
}
