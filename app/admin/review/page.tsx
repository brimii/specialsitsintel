import { createAdminClient } from "@/lib/supabase/server";
import { approveItem, rejectItem, runPipelineNow, runFullScan, runDiscoveryNow } from "./actions";
import { SubmitButton } from "./SubmitButton";

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--sp-3)", flexWrap: "wrap", marginBottom: "var(--sp-4)" }}>
        <div style={{ fontSize: 13, color: "var(--text-2)" }}>
          <b>{items.length}</b> proposition(s) en attente. Source : SEC EDGAR + extraction Claude.
        </div>
        <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap" }}>
          <form action={runPipelineNow}>
            <SubmitButton className="btn btn-secondary btn-sm" pendingLabel="Scan en cours… (~30 s)">
              ▶ Mise à jour rapide (10 deals)
            </SubmitButton>
          </form>
          <form action={runFullScan}>
            <SubmitButton className="btn btn-secondary btn-sm" pendingLabel="Scan complet… (10-20 min)">
              ▶▶ Mise à jour complète (213 deals, 2 ans)
            </SubmitButton>
          </form>
          <form action={runDiscoveryNow}>
            <SubmitButton className="btn btn-primary btn-sm" pendingLabel="Découverte en cours… (~1-2 min)">
              🔍 Découvrir de nouveaux deals
            </SubmitButton>
          </form>
        </div>
      </div>
      <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: "var(--sp-4)", lineHeight: 1.6 }}>
        <b>Mise à jour</b> = scanne les deals existants pour des modifs (statut, proba…).
        <b> Découverte</b> = scanne les S-4 / DEFM14A / SC TO-T / SC 13D récents pour repérer de
        nouveaux deals event-driven, puis les met en file de validation. Logs dans le terminal
        <code> npm run dev </code> (lignes <code>[runDiscoveryNow]</code>).
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)", fontSize: 12, background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
          File vide. Lance un scan ou une découverte ci-dessus.
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
          MISE À JOUR · Deal #{prop.deal_id} · champ <b style={{ color: "var(--text)" }}>{prop.champ_modifie}</b>
          {" · "}confiance <b style={{ color: (item.confiance ?? 0) >= 85 ? "var(--navy)" : "var(--amber)" }}>{item.confiance ?? "—"}</b>
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
          {prop.type_changement ?? "MINEUR"}
        </span>
      </div>
      <div style={{ display: "flex", gap: "var(--sp-3)", fontSize: 12, marginBottom: "var(--sp-2)", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>Avant</div>
          <div style={{ color: "var(--text-2)" }}>{prop.ancienne_valeur ?? "—"}</div>
        </div>
        <div style={{ alignSelf: "center", color: "var(--text-3)" }}>→</div>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>Après</div>
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
          NOUVEAU DEAL · confiance <b style={{ color: "var(--cobalt)" }}>{item.confiance ?? "—"}</b>
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: ".08em",
            padding: "2px 8px", borderRadius: "var(--r-sm)",
            background: "var(--cobalt-bg)", color: "var(--cobalt)",
            border: "1px solid var(--cobalt-bd)",
          }}
        >
          🔍 DÉCOUVERTE
        </span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
        {d.f} {d.nm}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-2)", marginBottom: "var(--sp-3)" }}>
        {d.c} · acq. {d.acq} · {d.v} · {d.r} · close {d.cl} · {d.reg}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: "var(--sp-2)", lineHeight: 1.6 }}>
        <b>Description : </b>{d.desc}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: "var(--sp-3)", lineHeight: 1.6 }}>
        <b>AI : </b>{d.ai}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)", marginBottom: "var(--sp-2)" }}>
        Prix offre : {d.pr.cur}{d.pr.o || "?"} · {d.pr.sym || "—"} · annoncé {d.pr.ad}
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
            ✓ Approuver
          </SubmitButton>
        </form>
        <form action={rejectItem}>
          <input type="hidden" name="id" value={item.id} />
          <SubmitButton className="btn btn-secondary btn-sm" pendingLabel="…">
            ✕ Rejeter
          </SubmitButton>
        </form>
      </div>
    </>
  );
}
