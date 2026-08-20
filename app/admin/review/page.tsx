import { createAdminClient } from "@/lib/supabase/server";
import { approveItem, rejectItem, runPipelineNow, runFullScan, runDiscoveryNow, runEuDiscoveryNow, runApacDiscoveryNow, reEnrichQueueItems, enrichFromPressReleases, rejectAllTbd, approveAllClean, runDgCompHistoricalBatch, refreshMarketPricesNow } from "./actions";
import { SubmitButton } from "./SubmitButton";
import { PendingBar } from "../PendingBar";

type UpdateProposition = {
  kind?: undefined | "update";
  deal_id: number;
  champ_modifie: string;
  ancienne_valeur: string | null;
  nouvelle_valeur: string;
  type_changement?: "MAJEUR" | "MINEUR";
  resume?: string;
};

type DiscoveredDeal = {
  nm: string;
  acq: string;
  v: string;
  c: string;
  r: string;
  st: string;
  reg: string;
  cl: string;
  desc: string;
  ai: string;
  f: string;
  pr: { o: number; sym: string; cur: string; ad: string };
};

type NewDealProposition = {
  kind: "new_deal";
  deal: DiscoveredDeal;
};

type Proposition = UpdateProposition | NewDealProposition;

type ReviewRow = {
  id: string;
  proposition: Proposition;
  source_url: string | null;
  confiance: number | null;
  statut: string;
  created_at: string | null;
};

export default async function AdminReview() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("review_queue")
    .select("id, proposition, source_url, confiance, statut, created_at")
    .eq("statut", "en_attente")
    .order("created_at", { ascending: false });
  const items = (data as ReviewRow[] | null) ?? [];

  return (
    <>
      <div style={{ marginBottom: "var(--sp-3)" }}>
        <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: "var(--sp-3)" }}>
          <b>{items.length}</b> pending proposal(s) in review queue.
        </div>

        <ToolbarGroup
          label="DISCOVER NEW DEALS"
          hint="Scan public regulator + exchange feeds for M&A we don't yet track. Candidates land in the review queue."
        >
          <form action={runDiscoveryNow}>
            <SubmitButton className="btn btn-primary btn-sm" pendingLabel="US discovery… (~3-5 min)">
              🇺🇸 US (SEC EDGAR)
            </SubmitButton>
            <PendingBar />
          </form>
          <form action={runEuDiscoveryNow}>
            <SubmitButton className="btn btn-primary btn-sm" pendingLabel="EU discovery… (~2-3 min)">
              🇪🇺 EU (CMA + DG COMP)
            </SubmitButton>
            <PendingBar />
          </form>
          <form action={runApacDiscoveryNow}>
            <SubmitButton className="btn btn-primary btn-sm" pendingLabel="APAC discovery… (~2-4 min)">
              🌏 APAC (TDnet + HKEX + ASX)
            </SubmitButton>
            <PendingBar />
          </form>
        </ToolbarGroup>

        <ToolbarGroup
          label="UPDATE EXISTING DEALS"
          hint="Re-scan SEC filings for status / probability / spread changes on deals already in the database."
        >
          <form action={runPipelineNow}>
            <SubmitButton className="btn btn-secondary btn-sm" pendingLabel="Scanning… (~30s)">
              ▶ Quick update (10 deals)
            </SubmitButton>
            <PendingBar />
          </form>
          <form action={runFullScan}>
            <SubmitButton className="btn btn-secondary btn-sm" pendingLabel="Full scan… (10-20 min)">
              ▶▶ Full update (all deals, 2 yrs)
            </SubmitButton>
            <PendingBar />
          </form>
        </ToolbarGroup>

        <ToolbarGroup
          label="QUEUE MAINTENANCE"
          hint="Workflow: enrich missing prices (PDF source) → enrich from press releases (PRN / BW / RNS / EDINET) → bulk-approve clean items (nm valid + v ≠ TBD + confiance ≥ 75) → reject the leftover TBD junk. Refresh market prices pulls live pr.c for T1/T2 deals via the Yahoo → Finnhub → Twelve Data → Alpha Vantage waterfall (15-min cache, batch endpoints, daily quota hard-stops)."
        >
          <form action={reEnrichQueueItems}>
            <SubmitButton className="btn btn-secondary btn-sm" pendingLabel="Enriching prices… (~1-3 min)">
              💰 Enrich missing prices
            </SubmitButton>
            <PendingBar />
          </form>
          <form action={enrichFromPressReleases}>
            <SubmitButton className="btn btn-secondary btn-sm" pendingLabel="Searching press wires… (~2-5 min)">
              📰 Enrich from press releases
            </SubmitButton>
            <PendingBar />
          </form>
          <form action={approveAllClean}>
            <SubmitButton className="btn btn-secondary btn-sm" pendingLabel="Approving…">
              ✅ Approve all clean
            </SubmitButton>
            <PendingBar />
          </form>
          <form action={rejectAllTbd}>
            <SubmitButton className="btn btn-secondary btn-sm" pendingLabel="Rejecting…">
              🗑 Reject TBD items
            </SubmitButton>
            <PendingBar />
          </form>
          <form action={refreshMarketPricesNow}>
            <SubmitButton className="btn btn-secondary btn-sm" pendingLabel="Refreshing prices… (~30s)">
              📊 Refresh market prices
            </SubmitButton>
            <PendingBar />
          </form>
        </ToolbarGroup>

        <ToolbarGroup
          label="HISTORICAL BACKFILL (PHASE 5)"
          hint="Heavy + costly. Each click processes 300 settled DG COMP cases (~6 min, ~$3-5). Inserts directly into deals with statut=Closed. Idempotent."
        >
          <form action={runDgCompHistoricalBatch}>
            <SubmitButton
              className="btn btn-secondary btn-sm"
              pendingLabel="Backfill batch… (~6 min, 300 cases)"
              style={{ borderColor: "var(--amber)", color: "var(--amber)" }}
            >
              📚 DG COMP backfill (300/click)
            </SubmitButton>
            <PendingBar />
          </form>
        </ToolbarGroup>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)", fontSize: 12, background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
          Queue empty. Run a scan or discovery above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
          {items.map((it) => (it.proposition.kind === "new_deal"
            ? <NewDealCard key={it.id} item={it} prop={it.proposition} />
            : <UpdateCard key={it.id} item={it} prop={it.proposition} />
          ))}
        </div>
      )}
    </>
  );
}

function ToolbarGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--sp-2)",
        padding: "var(--sp-3)",
        marginBottom: "var(--sp-2)",
        background: "var(--bg-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 8.5,
          letterSpacing: ".08em",
          color: "var(--text-3)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap", alignItems: "center" }}>
        {children}
      </div>
      <div style={{ fontSize: 10, color: "var(--text-3)", lineHeight: 1.5 }}>
        {hint}
      </div>
    </div>
  );
}

function UpdateCard({ item, prop }: { item: ReviewRow; prop: UpdateProposition }) {
  const isMajor = prop.type_changement === "MAJEUR";
  return (
    <div
      style={{
        background: "var(--bg-1)",
        border: `1px solid ${isMajor ? "var(--crimson-bd)" : "var(--border)"}`,
        borderLeft: `3px solid ${isMajor ? "var(--crimson)" : "var(--navy)"}`,
        borderRadius: "var(--r-md)",
        padding: "var(--sp-4)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--sp-3)", flexWrap: "wrap", marginBottom: "var(--sp-2)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)" }}>
          UPDATE · Deal #{prop.deal_id} · field <b style={{ color: "var(--text)" }}>{prop.champ_modifie}</b>
          {" · "}confidence <b style={{ color: (item.confiance ?? 0) >= 85 ? "var(--navy)" : "var(--amber)" }}>{item.confiance ?? "—"}</b>
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: ".08em",
            padding: "2px 8px", borderRadius: "var(--r-sm)",
            background: isMajor ? "var(--crimson-bg)" : "var(--navy-bg)",
            color: isMajor ? "var(--crimson)" : "var(--navy)",
            border: `1px solid ${isMajor ? "var(--crimson-bd)" : "var(--navy-bd)"}`,
          }}
        >
          {prop.type_changement === "MAJEUR" ? "MAJOR" : "MINOR"}
        </span>
      </div>
      <div style={{ display: "flex", gap: "var(--sp-3)", fontSize: 12, marginBottom: "var(--sp-2)", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>Before</div>
          <div style={{ color: "var(--text-2)" }}>{prop.ancienne_valeur ?? "—"}</div>
        </div>
        <div style={{ alignSelf: "center", color: "var(--text-3)" }}>→</div>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>After</div>
          <div style={{ fontWeight: 600 }}>{prop.nouvelle_valeur}</div>
        </div>
      </div>
      {prop.resume && (
        <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: "var(--sp-2)", lineHeight: 1.6 }}>{prop.resume}</div>
      )}
      <SourceAndActions item={item} />
    </div>
  );
}

function NewDealCard({ item, prop }: { item: ReviewRow; prop: NewDealProposition }) {
  const d = prop.deal;
  return (
    <div
      style={{
        background: "var(--bg-1)",
        border: "1px solid var(--cobalt-bd)",
        borderLeft: "3px solid var(--cobalt)",
        borderRadius: "var(--r-md)",
        padding: "var(--sp-4)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--sp-3)", flexWrap: "wrap", marginBottom: "var(--sp-2)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)" }}>
          NEW DEAL · confidence <b style={{ color: "var(--cobalt)" }}>{item.confiance ?? "—"}</b>
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: ".08em",
            padding: "2px 8px", borderRadius: "var(--r-sm)",
            background: "var(--cobalt-bg)", color: "var(--cobalt)",
            border: "1px solid var(--cobalt-bd)",
          }}
        >
          🔍 DISCOVERY
        </span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
        {d.f} {d.nm}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-2)", marginBottom: "var(--sp-3)" }}>
        {d.c} · acq. {d.acq} · {d.v} · {d.r} · close {d.cl} · {d.reg}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: "var(--sp-2)", lineHeight: 1.6 }}>
        <b>Description: </b>{d.desc}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: "var(--sp-3)", lineHeight: 1.6 }}>
        <b>AI: </b>{d.ai}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)", marginBottom: "var(--sp-2)" }}>
        Offer: {d.pr.cur}{d.pr.o || "?"} · {d.pr.sym || "—"} · announced {d.pr.ad}
      </div>
      <SourceAndActions item={item} />
    </div>
  );
}

function SourceAndActions({ item }: { item: ReviewRow }) {
  return (
    <>
      {item.source_url && (
        <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--cobalt)", wordBreak: "break-all" }}>
          {item.source_url}
        </a>
      )}
      <div style={{ display: "flex", gap: "var(--sp-2)", marginTop: "var(--sp-3)" }}>
        <form action={approveItem}>
          <input type="hidden" name="id" value={item.id} />
          <SubmitButton className="btn btn-primary btn-sm" pendingLabel="…">
            ✓ Approve
          </SubmitButton>
          <PendingBar />
        </form>
        <form action={rejectItem}>
          <input type="hidden" name="id" value={item.id} />
          <SubmitButton className="btn btn-secondary btn-sm" pendingLabel="…">
            ✕ Reject
          </SubmitButton>
          <PendingBar />
        </form>
      </div>
    </>
  );
}
