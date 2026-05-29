"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Set a new password after clicking the recovery email link (the verify
// callback gives the user an active session, so updateUser({ password }) works).
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setError("Authentication not configured.");
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
        <div className="hero-eyebrow">Account security</div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(24px,3vw,34px)", margin: "8px 0 20px" }}>
          New password
        </h1>
        {done ? (
          <div className="ai-block navy">
            <div className="ai-block-label">✓ Password updated</div>
            <div className="ai-block-text">Redirecting…</div>
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">New password</label>
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
              {loading ? "…" : "Update →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
