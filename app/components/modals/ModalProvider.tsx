"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const linkBtnStyle = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--navy)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  cursor: "pointer",
  textDecoration: "underline",
} as const;

type ModalName = "access" | "contact" | "login";
type Ctx = { open: (m: ModalName) => void; close: () => void };

const ModalCtx = createContext<Ctx | null>(null);

export function useModal() {
  const c = useContext(ModalCtx);
  if (!c) throw new Error("useModal doit être utilisé dans ModalProvider");
  return c;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalName | null>(null);

  useEffect(() => {
    if (!modal) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [modal]);

  const close = () => setModal(null);

  return (
    <ModalCtx.Provider value={{ open: setModal, close }}>
      {children}
      {modal === "access" && <AccessModal onClose={close} />}
      {modal === "contact" && <ContactModal onClose={close} />}
      {modal === "login" && <LoginModal onClose={close} />}
    </ModalCtx.Provider>
  );
}

function Overlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div
      className="modal-overlay active"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box">{children}</div>
    </div>
  );
}

function Header({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div className="modal-hd">
      <div>
        <div className="modal-title">{title}</div>
        <div className="modal-subtitle">{subtitle}</div>
      </div>
      <button className="modal-close" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}

const isEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

function AccessModal({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [fn, setFn] = useState("");
  const [ln, setLn] = useState("");
  const [fund, setFund] = useState("");
  const [email, setEmail] = useState("");
  const [aum, setAum] = useState("");
  const [strat, setStrat] = useState("");
  const [errs, setErrs] = useState<{ fn?: boolean; fund?: boolean; email?: boolean }>({});

  const submit = () => {
    const e = { fn: !fn.trim(), fund: !fund.trim(), email: !isEmail(email) };
    setErrs(e);
    if (e.fn || e.fund || e.email) return;
    setSubmitted(true);
  };

  return (
    <Overlay onClose={onClose}>
      <Header
        title="Request Institutional Access"
        subtitle="Currently onboarding event-driven funds. Priority to funds with AUM >€50M in event-driven strategies."
        onClose={onClose}
      />
      {!submitted ? (
        <>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input className={`form-input${errs.fn ? " invalid" : ""}`} value={fn} onChange={(e) => setFn(e.target.value)} placeholder="Jean-Baptiste" />
                <div className={`form-error${errs.fn ? " visible" : ""}`}>Required</div>
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-input" value={ln} onChange={(e) => setLn(e.target.value)} placeholder="Dupont" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Fund / Firm Name</label>
              <input className={`form-input${errs.fund ? " invalid" : ""}`} value={fund} onChange={(e) => setFund(e.target.value)} placeholder="Acme Capital Management" />
              <div className={`form-error${errs.fund ? " visible" : ""}`}>Required</div>
            </div>
            <div className="form-group">
              <label className="form-label">Work Email</label>
              <input className={`form-input${errs.email ? " invalid" : ""}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jb@acmecapital.com" />
              <div className={`form-error${errs.email ? " visible" : ""}`}>Enter a valid email</div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">AUM (€M)</label>
                <input className="form-input" type="number" value={aum} onChange={(e) => setAum(e.target.value)} placeholder="250M" />
              </div>
              <div className="form-group">
                <label className="form-label">Strategy Focus</label>
                <select className="form-input" value={strat} onChange={(e) => setStrat(e.target.value)}>
                  <option value="">Select…</option>
                  <option>Merger Arbitrage</option>
                  <option>Distressed / Credit</option>
                  <option>Activism</option>
                  <option>Multi-strategy Event-Driven</option>
                  <option>Long/Short Equity</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={submit}>
              Request Access →
            </button>
          </div>
        </>
      ) : (
        <div className="modal-success visible">
          <div className="success-icon">✓</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Request received</div>
          <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>
            Our team will review your application and reach out within 24 hours. Priority given to
            event-driven funds &gt;€50M AUM.
          </div>
        </div>
      )}
    </Overlay>
  );
}

function ContactModal({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <Overlay onClose={onClose}>
      <Header
        title="Contact Sales"
        subtitle="Institutional & Enterprise pricing. Custom integrations. White-label solutions."
        onClose={onClose}
      />
      {!submitted ? (
        <>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@fund.com" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Fund / Organization</label>
              <input className="form-input" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Firm name" />
            </div>
            <div className="form-group">
              <label className="form-label">What are you looking for?</label>
              <textarea
                className="form-input"
                rows={4}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Institutional seats, API access, white-label, or custom coverage…"
                style={{ resize: "vertical" }}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={() => setSubmitted(true)}>
              Send Message →
            </button>
          </div>
        </>
      ) : (
        <div className="modal-success visible">
          <div className="success-icon">✓</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Message sent</div>
          <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>
            We&apos;ll be in touch within one business day.
          </div>
        </div>
      )}
    </Overlay>
  );
}

type LoginMode = "login" | "signup" | "forgot";

function LoginModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const switchMode = (m: LoginMode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  const submit = async () => {
    setError(null);
    setInfo(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Authentication not configured (Supabase env missing).");
      return;
    }
    if (!isEmail(email)) {
      setError("Enter a valid email.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) return setError(error.message);
        onClose();
        router.refresh();
      } else if (mode === "signup") {
        if (pass.length < 8) return setError("Password: 8 characters minimum.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
        });
        if (error) return setError(error.message);
        if (data.session) {
          onClose();
          router.refresh();
        } else {
          setInfo("Account created! Check your email to confirm your address.");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/confirm`,
        });
        if (error) return setError(error.message);
        setInfo("Reset email sent. Check your inbox.");
      }
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<LoginMode, string> = {
    login: "Log in",
    signup: "Sign up",
    forgot: "Forgot password",
  };
  const subtitles: Record<LoginMode, string> = {
    login: "Access your SpecialSitsIntel dashboard.",
    signup: "Create your SpecialSitsIntel account.",
    forgot: "We'll send you a reset link.",
  };
  const ctaLabel = loading
    ? "…"
    : mode === "login"
      ? "Log in →"
      : mode === "signup"
        ? "Sign up →"
        : "Send link →";

  return (
    <Overlay onClose={onClose}>
      <Header title={titles[mode]} subtitle={subtitles[mode]} onClose={onClose} />
      <div className="modal-body">
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@fund.com"
          />
        </div>
        {mode !== "forgot" && (
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        )}
        {mode === "login" && (
          <div style={{ textAlign: "right", marginBottom: "var(--sp-2)" }}>
            <button type="button" onClick={() => switchMode("forgot")} style={linkBtnStyle}>
              Forgot password?
            </button>
          </div>
        )}
        {error && <div className="form-error visible">{error}</div>}
        {info && <div style={{ fontSize: 11, color: "var(--navy)", lineHeight: 1.6, marginTop: 6 }}>{info}</div>}
        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: "var(--sp-3)" }}>
          {mode === "login" && (
            <>
              No account?{" "}
              <button type="button" onClick={() => switchMode("signup")} style={linkBtnStyle}>
                Sign up
              </button>
            </>
          )}
          {mode === "signup" && (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => switchMode("login")} style={linkBtnStyle}>
                Sign in
              </button>
            </>
          )}
          {mode === "forgot" && (
            <button type="button" onClick={() => switchMode("login")} style={linkBtnStyle}>
              ← Back to sign in
            </button>
          )}
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {ctaLabel}
        </button>
      </div>
    </Overlay>
  );
}
