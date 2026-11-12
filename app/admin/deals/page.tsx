import Link from "next/link";
import { getAllDealsRaw } from "@/lib/deals-v2";
import { annualisedSpread } from "@/app/data/schema";
import { fmtCap, countryFlag } from "@/app/data/deals";
import BatchCommentaryButton from "./BatchCommentaryButton";

export const dynamic = "force-dynamic";

export default async function AdminDealsList() {
  const deals = await getAllDealsRaw();
  const missingCommentary = deals.filter(
    (d) => !d.ai_commentary || d.ai_commentary.trim() === "",
  ).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--sp-3)" }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".12em", color: "var(--text-3)", textTransform: "uppercase" }}>
            {deals.length} deal{deals.length === 1 ? "" : "s"} in the terminal
            {missingCommentary > 0 ? ` · ${missingCommentary} without commentary` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <BatchCommentaryButton missingCount={missingCommentary} />
          <Link
            href="/admin/deals/new"
            style={{
              background: "var(--navy)",
              color: "var(--bg)",
              padding: "8px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              borderRadius: "var(--r-sm)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            + New deal
          </Link>
        </div>
      </div>

      <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) .8fr .8fr .6fr .5fr .5fr .7fr",
            gap: "var(--sp-3)",
            padding: "10px var(--sp-4)",
            background: "var(--bg-2)",
            borderBottom: "1px solid var(--border-2)",
            fontFamily: "var(--font-mono)",
            fontSize: 8,
            letterSpacing: ".1em",
            color: "var(--text-3)",
            textTransform: "uppercase",
          }}
        >
          <span>Target</span>
          <span>Counterparty</span>
          <span>Category · Sub</span>
          <span>Status</span>
          <span>Spread</span>
          <span>Prob</span>
          <span>Updated</span>
        </div>
        {deals.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-3)", fontSize: 12, lineHeight: 1.7 }}>
            No deals yet.
            <br />
            <Link href="/admin/deals/new" style={{ color: "var(--navy)", fontWeight: 600 }}>
              Add the first →
            </Link>
          </div>
        ) : (
          deals.map((d) => {
            const spread = annualisedSpread(d);
            return (
              <Link
                key={d.id}
                href={`/admin/deals/${d.id}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 2fr) .8fr .8fr .6fr .5fr .5fr .7fr",
                  gap: "var(--sp-3)",
                  padding: "10px var(--sp-4)",
                  borderBottom: "1px solid var(--border)",
                  color: "var(--text)",
                  textDecoration: "none",
                  fontSize: 12,
                  alignItems: "center",
                  transition: "background var(--t-fast)",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
                  {countryFlag(d.target_country)} {d.target_name}
                  {d.target_ticker ? <span style={{ color: "var(--navy)", fontFamily: "var(--font-mono)", fontSize: 10, marginLeft: 6 }}>{d.target_ticker}</span> : null}
                </span>
                <span style={{ color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d.counterparty_name ?? "—"}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-2)" }}>
                  {d.category}
                  {d.sub_type ? ` · ${d.sub_type}` : ""}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text)" }}>
                  {d.status}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: spread != null ? "var(--navy)" : "var(--text-3)" }}>
                  {spread != null ? `${spread.toFixed(1)}%` : "—"}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-2)" }}>
                  {d.closing_probability != null ? `${Math.round(d.closing_probability)}%` : "—"}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)" }}>
                  {new Date(d.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </Link>
            );
          })
        )}
      </div>

      <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
        Total transaction value: <b style={{ color: "var(--text-2)" }}>{fmtCap(deals.reduce((s, d) => s + (d.transaction_value_usd ?? 0), 0))}</b>
      </div>
    </div>
  );
}
