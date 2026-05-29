"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useModal } from "./modals/ModalProvider";
import { createClient } from "@/lib/supabase/client";
import PortalButton from "./PortalButton";

// Navigation principale — reproduit les 8 entrées de la maquette
const NAV = [
  { href: "/home", icon: "⌂", label: "Home" },
  { href: "/", icon: "◈", label: "Deal Universe" },
  { href: "/portfolio", icon: "◉", label: "My Portfolio" },
  { href: "/strategies", icon: "◫", label: "Strategies" },
  { href: "/market-regime", icon: "◬", label: "Market Regime" },
  { href: "/historical", icon: "★", label: "Historical" },
  { href: "/regulators", icon: "⊞", label: "Regulators" },
  { href: "/glossary", icon: "◷", label: "Glossary" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { open } = useModal();
  const [mobOpen, setMobOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onLogout = async () => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setEmail(null);
    router.refresh();
  };

  return (
    <>
      <nav>
      <div className="logo">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div
            style={{
              width: 28,
              height: 28,
              background: "var(--navy)",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="5" width="4" height="8" rx="1" fill="white" opacity=".7" />
              <rect x="5.5" y="2" width="4" height="11" rx="1" fill="white" opacity=".85" />
              <rect x="10" y="7" width="3" height="6" rx="1" fill="white" />
            </svg>
          </div>
          <div>
            <span className="logo-mark">
              <b>SpecialSits</b>Intel
            </span>
            <div className="live-pill">
              <span className="live-dot" />
              LIVE · May 23, 2026
            </div>
          </div>
        </div>
      </div>

      <div className="nav-items">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`nav-item${active ? " active" : ""}`}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="nav-footer">
        {email ? (
          <>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "var(--text-3)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={email}
            >
              {email}
            </div>
            <PortalButton className="btn btn-secondary btn-sm" style={{ width: "100%" }}>
              Manage subscription
            </PortalButton>
            <button className="btn btn-secondary btn-sm" style={{ width: "100%" }} onClick={onLogout}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-primary btn-sm" style={{ width: "100%" }} onClick={() => open("access")}>
              Request Access →
            </button>
            <button className="btn btn-secondary btn-sm" style={{ width: "100%" }} onClick={() => open("login")}>
              Log in
            </button>
          </>
        )}
      </div>

      <button
        className={`hamburger${mobOpen ? " open" : ""}`}
        onClick={() => setMobOpen((o) => !o)}
        aria-label="Menu"
      >
        <span />
        <span />
        <span />
      </button>
      </nav>

      <div className={`mob-nav${mobOpen ? " open" : ""}`}>
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mob-nav-item${active ? " active" : ""}`}
              onClick={() => setMobOpen(false)}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </>
  );
}
