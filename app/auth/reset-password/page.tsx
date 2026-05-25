"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Page de définition d'un nouveau mot de passe (après clic sur le lien de
// récupération reçu par email — l'utilisateur a alors une session active).
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setError("Authentification non configurée.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/"), 1500);
  };

  return (
    <div className="page active">
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "60px clamp(20px,3vw,32px)" }}>
        <div className="hero-eyebrow">Sécurité du compte</div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(24px,3vw,34px)", margin: "8px 0 20px" }}>
          Nouveau mot de passe
        </h1>
        {done ? (
          <div className="ai-block navy">
            <div className="ai-block-label">✓ Mot de passe mis à jour</div>
            <div className="ai-block-text">Redirection en cours…</div>
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">Nouveau mot de passe</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            {error && <div className="form-error visible">{error}</div>}
            <button
              className="btn btn-primary"
              style={{ marginTop: "var(--sp-4)", width: "100%" }}
              onClick={submit}
              disabled={loading}
            >
              {loading ? "…" : "Mettre à jour →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
