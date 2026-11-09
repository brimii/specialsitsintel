import type { Metadata } from "next";
import LegalShell from "../LegalShell";

export const metadata: Metadata = {
  title: "Methodology — SpecialSitsIntel",
  description:
    "How SpecialSitsIntel sources, extracts, scores, and validates event-driven intelligence. Pipeline, models, and guardrails.",
};

export default function MethodologyPage() {
  return (
    <LegalShell title="Methodology">
      <div className="callout">
        <strong>What this is.</strong> A plain-language explanation of how we go from a raw SEC
        filing to a structured deal entry in the terminal. Three stages: ingest, extract,
        validate. Every step has a guardrail.
      </div>

      <h2>1. Sources we ingest</h2>
      <p>
        Only publicly-available feeds, no licensed data. Each ingest pipeline runs nightly via
        Vercel Cron and on-demand from the admin panel.
      </p>
      <ul>
        <li>
          <strong>SEC EDGAR</strong> — full-text search of S-4, DEFM14A, SC TO-T, SC 13D, 13E-3,
          and merger-related 8-K filings over a rolling 30-day window.
        </li>
        <li>
          <strong>Public press releases</strong> — PR Newswire, Business Wire indexed by target or
          acquirer name, used as a 3rd-pass enrichment when the SEC filing doesn't disclose the
          financial terms directly.
        </li>
        <li>
          <strong>Market data</strong> — Yahoo Finance as primary, Finnhub / Twelve Data / Alpha
          Vantage as fallbacks. 15-minute cache. Daily quota hard-stops protect provider budgets.
        </li>
      </ul>

      <h2>2. Extraction (AI Pass 1)</h2>
      <p>
        Each filing is sent to Claude (Anthropic) with a focused extraction prompt. The model is
        asked to classify the document as a deal event or non-event, and if it's a deal, to
        extract a structured record: target name, acquirer, deal value, offer price per share,
        regulator, status, category, expected close date, short description.
      </p>
      <p>
        The prompt is deliberately strict about anti-hallucination:
      </p>
      <ul>
        <li>Numbers must come from the filing itself, not from the model's background knowledge.</li>
        <li>Unknown values are written as "TBD", never guessed.</li>
        <li>Self-disclosures (a company's own buyback, AGM circular, restructuring notice)
          are tagged NOT_DEAL so they don't pollute the pipeline.</li>
        <li>Ambiguous filings default to NOT_DEAL ("better to miss a discovery than pollute the
          base").</li>
      </ul>

      <h2>3. Enrichment (AI Pass 2 &amp; 3)</h2>
      <p>
        If Pass 1 returned a candidate but left fields missing (typically price and deal value for
        shorter disclosures), two follow-on passes retry:
      </p>
      <ul>
        <li>
          <strong>Pass 2 (PDF)</strong> — fetches the underlying disclosure PDF (SEC exhibit,
          regulator decision, or exchange filing), extracts the text with a pure-JS PDF parser, and
          sends it to Claude with a focused price-only prompt.
        </li>
        <li>
          <strong>Pass 3 (Press release)</strong> — for stubborn gaps, searches PR Newswire and
          Business Wire by deal name for a related press release and runs the same extraction.
        </li>
      </ul>

      <h2>4. Human validation</h2>
      <p>
        Every extraction lands in the admin review queue, not the public terminal. A human
        operator approves or rejects each candidate before it appears to subscribers. Three
        buttons automate the obvious cases:
      </p>
      <ul>
        <li><strong>Approve all clean</strong> — bulk-approves candidates with a real target name,
          non-TBD deal value, and confidence ≥75.</li>
        <li><strong>Reject TBD</strong> — bulk-rejects placeholder entries (no name, no value).</li>
        <li><strong>Enrich missing prices</strong> — retries the PDF pass on everything that still
          has gaps.</li>
      </ul>
      <p>
        Material status changes (closing, blocking, deal death, price revision) always require
        human approval, regardless of AI confidence. They do not auto-publish.
      </p>

      <h2>5. Auto-publication (Phase 4 gate)</h2>
      <p>
        Minor updates (hearing-date shifts, process notices, non-material commentary) can
        auto-publish, but only under a strict three-condition gate:
      </p>
      <ul>
        <li>Change type is tagged <strong>MINEUR</strong> (minor) by the extraction prompt.</li>
        <li>Confidence score is ≥90 (the model is quoting a specific fact, not synthesising).</li>
        <li>At least two concordant sources agree on the change.</li>
      </ul>
      <p>
        When all three fire, the update writes directly to the deal row plus a marker audit row
        (<code>champ_modifie = &quot;_auto_publish&quot;</code>) so the admin dashboard can count
        them separately from human-approved items.
      </p>

      <h2>6. Scoring &amp; metrics</h2>
      <h3>Spread (annualised)</h3>
      <p>
        <code>spread = ((offer − current) / current) × (12 / months_to_close) × 100</code>. Months
        to close parsed from the deal's close-estimate field. Clamped to 1-24 months so a vague
        date can't explode the annualisation. Gross premium &gt; 80% is treated as broken data
        (likely wrong-ticker market price) and discarded.
      </p>
      <h3>Probability of close</h3>
      <p>
        First-cut heuristic keyed off status + regulator posture:{" "}
        <code>Closing/Closed = 97, Blocked/Dead = 3, Litigation = 50, Rumored = 30</code>; else
        scaled by the score band G/A/R/P/B. Not a trained model — a repeatable mental model
        analysts can inspect and override. The AI's own probability score (from Pass 1) overrides
        when confidence is high.
      </p>
      <h3>Expected value</h3>
      <p>
        <code>EV = (p_close × spread) + (p_break × break_downside) + (p_renego × renego_delta)</code>.
        Three-scenario model. Annualised for timeline comparison.
      </p>
      <h3>FTC language score</h3>
      <p>
        NLP analysis of FTC / DOJ filing language against ~6,000 historical regulatory decisions.
        Measures hawkishness of detected language patterns (consent decree style vs challenge-brief
        style). Scored 0-100; higher = more hostile posture.
      </p>

      <h2>7. Audit trail</h2>
      <p>
        Every change to a deal writes an audit row to the <code>deal_updates</code> table: old
        value, new value, source URL, confidence, author (ia or humain), timestamp. The source URL
        is admin-only; subscribers see the source label (SEC badge) but not the raw link, by
        product design. The audit log is never truncated.
      </p>

      <h2>8. What we don't do</h2>
      <ul>
        <li>We do not republish licensed data (Bloomberg, Reuters, Reorg).</li>
        <li>We do not use non-public or insider information.</li>
        <li>We do not take paid placement from issuers or deal parties.</li>
        <li>We do not train the AI model on user-entered portfolio data or notes.</li>
      </ul>

      <h2>9. Questions &amp; corrections</h2>
      <p>
        See a deal that looks wrong, or a methodology detail that needs clarification?{" "}
        <a href="mailto:contact@specialsitsintel.com">contact@specialsitsintel.com</a>. Corrections are
        documented in the audit log.
      </p>
    </LegalShell>
  );
}
