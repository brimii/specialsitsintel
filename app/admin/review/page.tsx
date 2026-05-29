import { createAdminClient } from "@/lib/supabase/server";
import { approveItem, rejectItem, runPipelineNow } from "./actions";

type Proposition = {
  deal_id: number;
  champ_modifie: string;
  ancienne_valeur: string | null;
  nouvelle_valeur: string;
  type_changement?: "MAJEUR" | "MINEUR";
  resume?: string;
};

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--sp-4)" }}>
        <div style={{ fontSize: 13, color: "var(--text-2)" }}>
          <b>{items.length}</b> proposition(s) en attente. Source : SEC EDGAR + extraction Claude.
        </div>
        <form action={runPipelineNow}>
          <button type="submit" className="btn btn-secondary btn-sm">
            ▶ Lancer le pipeline maintenant
          </button>
        </form>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)", fontSize: 12, background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
          File vide. Tu peux lancer le pipeline ci-dessus pour aller chercher les dépôts SEC récents.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
          {items.map((it) => {
            const p = it.proposition;
            const isMajor = p.type_changement === "MAJEUR";
            return (
              <div
                key={it.id}
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
                    Deal #{p.deal_id} · champ <b style={{ color: "var(--text)" }}>{p.champ_modifie}</b>
                    {" · "}
                    confiance <b style={{ color: (it.confiance ?? 0) >= 85 ? "var(--navy)" : "var(--amber)" }}>{it.confiance ?? "—"}</b>
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 8,
                      letterSpacing: ".08em",
                      padding: "2px 8px",
                      borderRadius: "var(--r-sm)",
                      background: isMajor ? "var(--crimson-bg)" : "var(--navy-bg)",
                      color: isMajor ? "var(--crimson)" : "var(--navy)",
                      border: `1px solid ${isMajor ? "var(--crimson-bd)" : "var(--navy-bd)"}`,
                    }}
                  >
                    {p.type_changement ?? "MINEUR"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "var(--sp-3)", fontSize: 12, marginBottom: "var(--sp-2)", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>Avant</div>
                    <div style={{ color: "var(--text-2)" }}>{p.ancienne_valeur ?? "—"}</div>
                  </div>
                  <div style={{ alignSelf: "center", color: "var(--text-3)" }}>→</div>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>Après</div>
                    <div style={{ fontWeight: 600 }}>{p.nouvelle_valeur}</div>
                  </div>
                </div>
                {p.resume && (
                  <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: "var(--sp-2)", lineHeight: 1.6 }}>{p.resume}</div>
                )}
                {it.source_url && (
                  <a href={it.source_url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--cobalt)", wordBreak: "break-all" }}>
                    {it.source_url}
                  </a>
                )}
                <div style={{ display: "flex", gap: "var(--sp-2)", marginTop: "var(--sp-3)" }}>
                  <form action={approveItem}>
                    <input type="hidden" name="id" value={it.id} />
                    <button type="submit" className="btn btn-primary btn-sm">✓ Approuver</button>
                  </form>
                  <form action={rejectItem}>
                    <input type="hidden" name="id" value={it.id} />
                    <button type="submit" className="btn btn-secondary btn-sm">✕ Rejeter</button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
