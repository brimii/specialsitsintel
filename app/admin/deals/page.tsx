import { createAdminClient } from "@/lib/supabase/server";
import { changeDealMinTier } from "./actions";

const TIERS = ["free", "analyst", "institutional", "enterprise"] as const;

type DealRow = {
  id: number;
  flag: string | null;
  nom: string;
  categorie: string | null;
  statut: string | null;
  min_tier: string | null;
  spread: number | null;
};

export default async function AdminDeals() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("deals")
    .select("id, flag, nom, categorie, statut, min_tier, spread")
    .order("id", { ascending: true });

  const deals = (data as DealRow[] | null) ?? [];

  return (
    <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "60px 1.6fr 0.8fr 0.9fr 0.7fr 1fr",
          gap: "var(--sp-3)",
          padding: "10px var(--sp-5)",
          fontFamily: "var(--font-mono)",
          fontSize: 8,
          textTransform: "uppercase",
          letterSpacing: ".08em",
          color: "var(--text-3)",
          background: "var(--bg-2)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span>ID</span>
        <span>Nom</span>
        <span>Catégorie</span>
        <span>Statut</span>
        <span>Spread</span>
        <span>Min tier</span>
      </div>
      {deals.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>
          Aucun deal — fais `npm run seed`.
        </div>
      ) : (
        deals.map((d) => (
          <div
            key={d.id}
            style={{
              display: "grid",
              gridTemplateColumns: "60px 1.6fr 0.8fr 0.9fr 0.7fr 1fr",
              gap: "var(--sp-3)",
              padding: "8px var(--sp-5)",
              alignItems: "center",
              borderBottom: "1px solid var(--border)",
              fontSize: 11,
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)" }}>{d.id}</span>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
              {d.flag ?? ""} {d.nom}
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>{d.categorie ?? "—"}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-2)" }}>{d.statut ?? "—"}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--navy)" }}>
              {d.spread != null ? `${d.spread.toFixed(1)}%` : "—"}
            </span>
            <form action={changeDealMinTier} style={{ display: "flex", gap: 6 }}>
              <input type="hidden" name="deal_id" value={d.id} />
              <select className="form-input" name="min_tier" defaultValue={d.min_tier ?? "analyst"} style={{ fontSize: 10 }}>
                {TIERS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button className="btn btn-secondary btn-sm" type="submit">OK</button>
            </form>
          </div>
        ))
      )}
    </div>
  );
}
