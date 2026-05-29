import { createAdminClient } from "@/lib/supabase/server";
import { changeUserTier, changeUserRole } from "./actions";

const TIERS = ["free", "analyst", "institutional", "enterprise"] as const;
const ROLES = ["user", "admin"] as const;

type ProfileRow = {
  id: string;
  email: string | null;
  fund: string | null;
  tier: string | null;
  role: string | null;
  created_at: string | null;
};

export default async function AdminUsers() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, email, fund, tier, role, created_at")
    .order("created_at", { ascending: false });

  const profiles = (data as ProfileRow[] | null) ?? [];

  return (
    <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1.1fr 1fr 0.9fr 1fr",
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
        <span>Email · Fund</span>
        <span>Inscrit le</span>
        <span>Tier</span>
        <span>Rôle</span>
        <span>Actions</span>
      </div>
      {profiles.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>
          Aucun utilisateur.
        </div>
      ) : (
        profiles.map((p) => (
          <div
            key={p.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1.1fr 1fr 0.9fr 1fr",
              gap: "var(--sp-3)",
              padding: "10px var(--sp-5)",
              alignItems: "center",
              borderBottom: "1px solid var(--border)",
              fontSize: 11,
            }}
          >
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <div style={{ fontWeight: 600 }}>{p.email ?? "—"}</div>
              <div style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{p.fund ?? "—"}</div>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)" }}>
              {p.created_at ? new Date(p.created_at).toLocaleDateString("fr-FR") : "—"}
            </span>
            <form action={changeUserTier} style={{ display: "flex", gap: 6 }}>
              <input type="hidden" name="user_id" value={p.id} />
              <select className="form-input" name="tier" defaultValue={p.tier ?? "free"} style={{ fontSize: 10 }}>
                {TIERS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button className="btn btn-secondary btn-sm" type="submit">OK</button>
            </form>
            <form action={changeUserRole} style={{ display: "flex", gap: 6 }}>
              <input type="hidden" name="user_id" value={p.id} />
              <select className="form-input" name="role" defaultValue={p.role ?? "user"} style={{ fontSize: 10 }}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button className="btn btn-secondary btn-sm" type="submit">OK</button>
            </form>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)" }}>id: {p.id.slice(0, 8)}…</span>
          </div>
        ))
      )}
    </div>
  );
}
