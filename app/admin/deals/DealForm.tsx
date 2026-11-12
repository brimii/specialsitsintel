"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Deal, DealCategory, TimelineEvent } from "@/app/data/schema";
import { createDeal, updateDeal, deleteDeal, generateCommentary } from "./actions";

// Admin form — the single surface for adding and editing a deal. Shape
// mirrors the migration-0005 schema. Fields are organised in tiers so
// the author can start with the minimum and expand into narrative,
// regulatory, timeline and provenance as needed.
//
// "Generate commentary" calls Claude once with the current form values,
// surfaces the result in the commentary textarea, and the author
// approves (or edits, or discards) before Save writes it to the row.
// No automatic AI write — the human always holds the pen.

type FormState = {
  category: DealCategory;
  sub_type: string;
  target_name: string;
  target_ticker: string;
  target_exchange: string;
  target_country: string;
  target_sector: string;
  counterparty_name: string;
  counterparty_ticker: string;
  counterparty_country: string;
  undisturbed_price: string;
  undisturbed_date: string;
  current_price: string;
  offer_total_per_share: string;
  offer_cash_per_share: string;
  offer_stock_per_share: string;
  offer_exchange_ratio: string;
  offer_cvr_value: string;
  currency: string;
  transaction_value_usd: string;
  announce_date: string;
  hsr_filing_date: string;
  second_request_date: string;
  verdict_date: string;
  expected_close: string;
  hard_deadline: string;
  primary_regulators: string;
  regulatory_phase: string;
  key_risks: string;
  status: string;
  status_date: string;
  short_desc: string;
  ai_commentary: string;
  closing_probability: string;
  timeline: TimelineEvent[];
  source_url: string;
  source_feed: string;
  source_accession: string;
  min_tier: "free" | "analyst" | "institutional" | "enterprise";
};

const EMPTY: FormState = {
  category: "MERGER",
  sub_type: "cash",
  target_name: "",
  target_ticker: "",
  target_exchange: "NYSE",
  target_country: "US",
  target_sector: "",
  counterparty_name: "",
  counterparty_ticker: "",
  counterparty_country: "US",
  undisturbed_price: "",
  undisturbed_date: "",
  current_price: "",
  offer_total_per_share: "",
  offer_cash_per_share: "",
  offer_stock_per_share: "",
  offer_exchange_ratio: "",
  offer_cvr_value: "",
  currency: "USD",
  transaction_value_usd: "",
  announce_date: "",
  hsr_filing_date: "",
  second_request_date: "",
  verdict_date: "",
  expected_close: "",
  hard_deadline: "",
  primary_regulators: "",
  regulatory_phase: "",
  key_risks: "",
  status: "Active",
  status_date: "",
  short_desc: "",
  ai_commentary: "",
  closing_probability: "",
  timeline: [],
  source_url: "",
  source_feed: "manual",
  source_accession: "",
  min_tier: "analyst",
};

function fromDeal(d: Deal): FormState {
  return {
    category: d.category,
    sub_type: d.sub_type ?? "",
    target_name: d.target_name,
    target_ticker: d.target_ticker ?? "",
    target_exchange: d.target_exchange ?? "",
    target_country: d.target_country,
    target_sector: d.target_sector ?? "",
    counterparty_name: d.counterparty_name ?? "",
    counterparty_ticker: d.counterparty_ticker ?? "",
    counterparty_country: d.counterparty_country ?? "",
    undisturbed_price: d.undisturbed_price?.toString() ?? "",
    undisturbed_date: d.undisturbed_date ?? "",
    current_price: d.current_price?.toString() ?? "",
    offer_total_per_share: d.offer_total_per_share?.toString() ?? "",
    offer_cash_per_share: d.offer_cash_per_share?.toString() ?? "",
    offer_stock_per_share: d.offer_stock_per_share?.toString() ?? "",
    offer_exchange_ratio: d.offer_exchange_ratio?.toString() ?? "",
    offer_cvr_value: d.offer_cvr_value?.toString() ?? "",
    currency: d.currency,
    transaction_value_usd: d.transaction_value_usd?.toString() ?? "",
    announce_date: d.announce_date ?? "",
    hsr_filing_date: d.hsr_filing_date ?? "",
    second_request_date: d.second_request_date ?? "",
    verdict_date: d.verdict_date ?? "",
    expected_close: d.expected_close ?? "",
    hard_deadline: d.hard_deadline ?? "",
    primary_regulators: (d.primary_regulators ?? []).join(", "),
    regulatory_phase: d.regulatory_phase ?? "",
    key_risks: (d.key_risks ?? []).join(", "),
    status: d.status,
    status_date: d.status_date ?? "",
    short_desc: d.short_desc ?? "",
    ai_commentary: d.ai_commentary ?? "",
    closing_probability: d.closing_probability?.toString() ?? "",
    timeline: d.timeline ?? [],
    source_url: d.source_url ?? "",
    source_feed: d.source_feed ?? "manual",
    source_accession: d.source_accession ?? "",
    min_tier: d.min_tier,
  };
}

const sectionStyle: React.CSSProperties = {
  background: "var(--bg-1)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-md)",
  padding: "var(--sp-4)",
  marginBottom: "var(--sp-3)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: "var(--text-3)",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  padding: "7px 10px",
  color: "var(--text)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  borderRadius: "var(--r-sm)",
};

function Field({
  label,
  children,
  span = 1,
}: {
  label: string;
  children: React.ReactNode;
  span?: number;
}) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export default function DealForm({ deal }: { deal: Deal | null }) {
  const router = useRouter();
  const isEdit = deal !== null;
  const [state, setState] = useState<FormState>(deal ? fromDeal(deal) : EMPTY);
  const [showPricing2, setShowPricing2] = useState(false);
  const [showReg, setShowReg] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showProvenance, setShowProvenance] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setState((s) => ({ ...s, [k]: v }));
  };

  const onGenerateCommentary = async () => {
    setGenerating(true);
    setErr(null);
    try {
      const text = await generateCommentary({
        category: state.category,
        sub_type: state.sub_type,
        target_name: state.target_name,
        target_ticker: state.target_ticker,
        counterparty_name: state.counterparty_name,
        undisturbed_price: Number(state.undisturbed_price) || undefined,
        current_price: Number(state.current_price) || undefined,
        offer_total_per_share: Number(state.offer_total_per_share) || undefined,
        currency: state.currency,
        announce_date: state.announce_date,
        expected_close: state.expected_close,
        status: state.status,
        regulatory_phase: state.regulatory_phase,
        primary_regulators: state.primary_regulators,
        short_desc: state.short_desc,
      });
      update("ai_commentary", text);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      try {
        if (isEdit && deal) {
          await updateDeal(deal.id, state);
          router.push("/admin/deals");
          router.refresh();
        } else {
          const newId = await createDeal(state);
          router.push(`/admin/deals/${newId}`);
          router.refresh();
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    });
  };

  const onDelete = () => {
    if (!deal) return;
    if (!confirm(`Delete deal "${deal.target_name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteDeal(deal.id);
        router.push("/admin/deals");
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    });
  };

  const addTimelineRow = () => {
    update("timeline", [...state.timeline, { date: "", event_type: "OTHER", summary: "" }]);
  };
  const removeTimelineRow = (i: number) => {
    update(
      "timeline",
      state.timeline.filter((_, idx) => idx !== i),
    );
  };
  const updateTimelineRow = (i: number, patch: Partial<TimelineEvent>) => {
    update(
      "timeline",
      state.timeline.map((ev, idx) => (idx === i ? { ...ev, ...patch } : ev)),
    );
  };

  return (
    <form onSubmit={onSubmit}>
      {/* Tier 1-3: identity + pricing + dates */}
      <div style={sectionStyle}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: ".12em",
            color: "var(--navy)",
            textTransform: "uppercase",
            marginBottom: "var(--sp-3)",
          }}
        >
          Identity
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--sp-3)" }}>
          <Field label="Category">
            <select style={inputStyle} value={state.category} onChange={(e) => update("category", e.target.value as DealCategory)}>
              <option value="MERGER">Merger</option>
              <option value="ACTIVISM">Activism</option>
              <option value="DISTRESSED">Distressed</option>
              <option value="SPINOFF">Spinoff</option>
              <option value="REORG">Reorg (OOC)</option>
              <option value="TENDER">Tender</option>
            </select>
          </Field>
          <Field label="Sub-type">
            <input style={inputStyle} value={state.sub_type} onChange={(e) => update("sub_type", e.target.value)} placeholder="cash / stock / mixed / 13D / ch11 / spin" />
          </Field>
          <Field label="Status">
            <select style={inputStyle} value={state.status} onChange={(e) => update("status", e.target.value)}>
              <option>Rumored</option>
              <option>Active</option>
              <option>Review</option>
              <option>Phase I</option>
              <option>Phase II</option>
              <option>Second Request</option>
              <option>Litigation</option>
              <option>Closing</option>
              <option>Closed</option>
              <option>Blocked</option>
              <option>Terminated</option>
              <option>Withdrawn</option>
            </select>
          </Field>
          <Field label="Tier gate">
            <select style={inputStyle} value={state.min_tier} onChange={(e) => update("min_tier", e.target.value as FormState["min_tier"])}>
              <option value="free">Free preview</option>
              <option value="analyst">Analyst</option>
              <option value="institutional">Institutional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </Field>

          <Field label="Target name *" span={2}>
            <input required style={inputStyle} value={state.target_name} onChange={(e) => update("target_name", e.target.value)} placeholder="Hess Corp" />
          </Field>
          <Field label="Target ticker">
            <input style={inputStyle} value={state.target_ticker} onChange={(e) => update("target_ticker", e.target.value.toUpperCase())} placeholder="HES" />
          </Field>
          <Field label="Exchange">
            <select style={inputStyle} value={state.target_exchange} onChange={(e) => update("target_exchange", e.target.value)}>
              <option value="NYSE">NYSE</option>
              <option value="NASDAQ">NASDAQ</option>
              <option value="AMEX">AMEX</option>
              <option value="OTC">OTC</option>
            </select>
          </Field>

          <Field label="Counterparty name" span={2}>
            <input style={inputStyle} value={state.counterparty_name} onChange={(e) => update("counterparty_name", e.target.value)} placeholder="Chevron" />
          </Field>
          <Field label="Counterparty ticker">
            <input style={inputStyle} value={state.counterparty_ticker} onChange={(e) => update("counterparty_ticker", e.target.value.toUpperCase())} placeholder="CVX" />
          </Field>
          <Field label="Country (ISO-2)">
            <input style={inputStyle} value={state.target_country} onChange={(e) => update("target_country", e.target.value.toUpperCase())} />
          </Field>
        </div>
      </div>

      {/* Tier 2: pricing core */}
      <div style={sectionStyle}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: ".12em",
            color: "var(--navy)",
            textTransform: "uppercase",
            marginBottom: "var(--sp-3)",
          }}
        >
          Pricing
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--sp-3)" }}>
          <Field label="Undisturbed px">
            <input type="number" step="0.01" style={inputStyle} value={state.undisturbed_price} onChange={(e) => update("undisturbed_price", e.target.value)} />
          </Field>
          <Field label="Undisturbed date">
            <input type="date" style={inputStyle} value={state.undisturbed_date} onChange={(e) => update("undisturbed_date", e.target.value)} />
          </Field>
          <Field label="Current px (market-data)">
            <input type="number" step="0.01" style={inputStyle} value={state.current_price} onChange={(e) => update("current_price", e.target.value)} />
          </Field>
          <Field label="Currency">
            <select style={inputStyle} value={state.currency} onChange={(e) => update("currency", e.target.value)}>
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
              <option>JPY</option>
              <option>CHF</option>
              <option>CAD</option>
              <option>AUD</option>
              <option>HKD</option>
            </select>
          </Field>
          <Field label="Offer total per share">
            <input type="number" step="0.01" style={inputStyle} value={state.offer_total_per_share} onChange={(e) => update("offer_total_per_share", e.target.value)} />
          </Field>
          <Field label="Transaction value USD">
            <input type="number" step="1000000" style={inputStyle} value={state.transaction_value_usd} onChange={(e) => update("transaction_value_usd", e.target.value)} placeholder="53000000000" />
          </Field>
          <Field label="Closing prob %">
            <input type="number" min="0" max="100" style={inputStyle} value={state.closing_probability} onChange={(e) => update("closing_probability", e.target.value)} />
          </Field>
          <Field label="Status date">
            <input type="date" style={inputStyle} value={state.status_date} onChange={(e) => update("status_date", e.target.value)} />
          </Field>
        </div>

        <button
          type="button"
          onClick={() => setShowPricing2((v) => !v)}
          style={{ marginTop: 10, background: "transparent", border: "none", color: "var(--navy)", fontSize: 10, cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: ".1em" }}
        >
          {showPricing2 ? "▾" : "▸"} Consideration break-down (cash / stock / CVR)
        </button>
        {showPricing2 && (
          <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--sp-3)" }}>
            <Field label="Cash per share">
              <input type="number" step="0.01" style={inputStyle} value={state.offer_cash_per_share} onChange={(e) => update("offer_cash_per_share", e.target.value)} />
            </Field>
            <Field label="Stock per share">
              <input type="number" step="0.01" style={inputStyle} value={state.offer_stock_per_share} onChange={(e) => update("offer_stock_per_share", e.target.value)} />
            </Field>
            <Field label="Exchange ratio">
              <input type="number" step="0.0001" style={inputStyle} value={state.offer_exchange_ratio} onChange={(e) => update("offer_exchange_ratio", e.target.value)} />
            </Field>
            <Field label="CVR per share">
              <input type="number" step="0.01" style={inputStyle} value={state.offer_cvr_value} onChange={(e) => update("offer_cvr_value", e.target.value)} />
            </Field>
          </div>
        )}
      </div>

      {/* Tier 3: dates */}
      <div style={sectionStyle}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: ".12em",
            color: "var(--navy)",
            textTransform: "uppercase",
            marginBottom: "var(--sp-3)",
          }}
        >
          Dates
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--sp-3)" }}>
          <Field label="Announce date">
            <input type="date" style={inputStyle} value={state.announce_date} onChange={(e) => update("announce_date", e.target.value)} />
          </Field>
          <Field label="HSR filing date">
            <input type="date" style={inputStyle} value={state.hsr_filing_date} onChange={(e) => update("hsr_filing_date", e.target.value)} />
          </Field>
          <Field label="Second Request date">
            <input type="date" style={inputStyle} value={state.second_request_date} onChange={(e) => update("second_request_date", e.target.value)} />
          </Field>
          <Field label="Verdict date">
            <input type="date" style={inputStyle} value={state.verdict_date} onChange={(e) => update("verdict_date", e.target.value)} />
          </Field>
          <Field label="Expected close">
            <input type="date" style={inputStyle} value={state.expected_close} onChange={(e) => update("expected_close", e.target.value)} />
          </Field>
          <Field label="Hard deadline">
            <input type="date" style={inputStyle} value={state.hard_deadline} onChange={(e) => update("hard_deadline", e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Short desc + AI commentary */}
      <div style={sectionStyle}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: ".12em",
            color: "var(--navy)",
            textTransform: "uppercase",
            marginBottom: "var(--sp-3)",
          }}
        >
          Narrative
        </div>
        <Field label="Short description (1-2 sentences, max ~300 chars)">
          <textarea
            style={{ ...inputStyle, minHeight: 60, resize: "vertical", fontFamily: "var(--font-sans)" }}
            value={state.short_desc}
            onChange={(e) => update("short_desc", e.target.value)}
            maxLength={320}
          />
        </Field>
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "var(--sp-3) 0 6px" }}>
          <label style={{ ...labelStyle, margin: 0 }}>AI commentary</label>
          <button
            type="button"
            onClick={onGenerateCommentary}
            disabled={generating || !state.target_name || !state.status}
            style={{
              background: generating ? "var(--bg-2)" : "var(--navy)",
              color: generating ? "var(--text-3)" : "var(--bg)",
              border: "none",
              padding: "4px 12px",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              cursor: generating ? "wait" : "pointer",
              borderRadius: "var(--r-sm)",
            }}
          >
            {generating ? "Generating…" : "Generate with Claude"}
          </button>
          <span style={{ fontSize: 9.5, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
            ~$0.002 per call · you review before Save
          </span>
        </div>
        <textarea
          style={{ ...inputStyle, minHeight: 100, resize: "vertical", fontFamily: "var(--font-sans)" }}
          value={state.ai_commentary}
          onChange={(e) => update("ai_commentary", e.target.value)}
          placeholder="Click Generate — or write by hand. Saved as-is."
        />
      </div>

      {/* Tier 4 — expandable Regulatory */}
      <div style={sectionStyle}>
        <button
          type="button"
          onClick={() => setShowReg((v) => !v)}
          style={{ background: "transparent", border: "none", color: "var(--navy)", fontSize: 10, cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: ".12em", textTransform: "uppercase", padding: 0 }}
        >
          {showReg ? "▾" : "▸"} Regulatory
        </button>
        {showReg && (
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--sp-3)" }}>
            <Field label="Primary regulators (comma-separated)" span={2}>
              <input style={inputStyle} value={state.primary_regulators} onChange={(e) => update("primary_regulators", e.target.value)} placeholder="FTC, DOJ, CFIUS" />
            </Field>
            <Field label="Regulatory phase">
              <select style={inputStyle} value={state.regulatory_phase} onChange={(e) => update("regulatory_phase", e.target.value)}>
                <option value="">—</option>
                <option>HSR</option>
                <option>2ndRequest</option>
                <option>Consent</option>
                <option>Cleared</option>
                <option>Litigation</option>
                <option>Blocked</option>
              </select>
            </Field>
            <Field label="Key risks (comma-separated)" span={3}>
              <input style={inputStyle} value={state.key_risks} onChange={(e) => update("key_risks", e.target.value)} placeholder="vertical-overlap, national-security" />
            </Field>
          </div>
        )}
      </div>

      {/* Tier 6 — Timeline */}
      <div style={sectionStyle}>
        <button
          type="button"
          onClick={() => setShowTimeline((v) => !v)}
          style={{ background: "transparent", border: "none", color: "var(--navy)", fontSize: 10, cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: ".12em", textTransform: "uppercase", padding: 0 }}
        >
          {showTimeline ? "▾" : "▸"} Timeline ({state.timeline.length} events)
        </button>
        {showTimeline && (
          <div style={{ marginTop: 10 }}>
            {state.timeline.map((ev, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "130px 180px 1fr 60px", gap: 8, marginBottom: 6, alignItems: "center" }}>
                <input type="date" style={inputStyle} value={ev.date} onChange={(e) => updateTimelineRow(i, { date: e.target.value })} />
                <select style={inputStyle} value={ev.event_type} onChange={(e) => updateTimelineRow(i, { event_type: e.target.value as TimelineEvent["event_type"] })}>
                  <option>ANNOUNCE</option>
                  <option>HSR_FILED</option>
                  <option>SECOND_REQUEST</option>
                  <option>CONSENT</option>
                  <option>CLEARED</option>
                  <option>LITIGATION_FILED</option>
                  <option>VERDICT</option>
                  <option>CLOSING</option>
                  <option>CLOSED</option>
                  <option>BLOCKED</option>
                  <option>WITHDRAWN</option>
                  <option>OTHER</option>
                </select>
                <input style={inputStyle} value={ev.summary} onChange={(e) => updateTimelineRow(i, { summary: e.target.value })} placeholder="FTC consent decree effective — $40/share settlement." />
                <button type="button" onClick={() => removeTimelineRow(i)} style={{ background: "var(--crimson-bg)", color: "var(--crimson)", border: "1px solid var(--crimson-bd)", fontSize: 10, cursor: "pointer", borderRadius: "var(--r-sm)", padding: "6px 10px" }}>×</button>
              </div>
            ))}
            <button type="button" onClick={addTimelineRow} style={{ marginTop: 6, background: "var(--navy-bg)", border: "1px solid var(--navy-bd)", color: "var(--navy)", fontSize: 10, padding: "4px 10px", cursor: "pointer", borderRadius: "var(--r-sm)", fontFamily: "var(--font-mono)", letterSpacing: ".08em" }}>+ ADD EVENT</button>
          </div>
        )}
      </div>

      {/* Tier 7 — Provenance */}
      <div style={sectionStyle}>
        <button
          type="button"
          onClick={() => setShowProvenance((v) => !v)}
          style={{ background: "transparent", border: "none", color: "var(--navy)", fontSize: 10, cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: ".12em", textTransform: "uppercase", padding: 0 }}
        >
          {showProvenance ? "▾" : "▸"} Provenance (admin-only — never exposed to client)
        </button>
        {showProvenance && (
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "var(--sp-3)" }}>
            <Field label="Source URL">
              <input style={inputStyle} value={state.source_url} onChange={(e) => update("source_url", e.target.value)} placeholder="https://www.sec.gov/..." />
            </Field>
            <Field label="Source feed">
              <select style={inputStyle} value={state.source_feed} onChange={(e) => update("source_feed", e.target.value)}>
                <option>manual</option>
                <option>SEC</option>
                <option>FTC</option>
                <option>DOJ</option>
                <option>press</option>
              </select>
            </Field>
            <Field label="Accession number">
              <input style={inputStyle} value={state.source_accession} onChange={(e) => update("source_accession", e.target.value)} placeholder="0001104659-23-115247" />
            </Field>
          </div>
        )}
      </div>

      {err ? (
        <div
          style={{
            background: "var(--crimson-bg)",
            border: "1px solid var(--crimson-bd)",
            color: "var(--crimson)",
            padding: "var(--sp-3)",
            borderRadius: "var(--r-sm)",
            marginBottom: "var(--sp-3)",
            fontSize: 12,
          }}
        >
          {err}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, marginTop: "var(--sp-4)", alignItems: "center" }}>
        <button
          type="submit"
          disabled={pending}
          style={{
            background: "var(--navy)",
            color: "var(--bg)",
            border: "none",
            padding: "10px 20px",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            letterSpacing: ".08em",
            textTransform: "uppercase",
            cursor: pending ? "wait" : "pointer",
            borderRadius: "var(--r-sm)",
            fontWeight: 600,
          }}
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create deal"}
        </button>
        {isEdit ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            style={{
              background: "transparent",
              color: "var(--crimson)",
              border: "1px solid var(--crimson-bd)",
              padding: "10px 16px",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              cursor: "pointer",
              borderRadius: "var(--r-sm)",
            }}
          >
            Delete
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => router.push("/admin/deals")}
          style={{
            background: "transparent",
            color: "var(--text-2)",
            border: "1px solid var(--border)",
            padding: "10px 16px",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            letterSpacing: ".08em",
            textTransform: "uppercase",
            cursor: "pointer",
            borderRadius: "var(--r-sm)",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
