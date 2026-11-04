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
  // Live date shown in the header pill. Initialised empty to avoid an SSR /
  // client hydration mismatch (server clock may drift from the browser's),
  // then filled in on mount + refreshed at the next midnight so the pill
  // always reads today's date without a hard reload.
  const [today, setToday] = useState<string>("");

  useEffect(() => {
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    setToday(fmt(new Date()));
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const t = setTimeout(() => setToday(fmt(new Date())), nextMidnight.getTime() - now.getTime());
    return () => clearTimeout(t);
  }, []);

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
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "var(--navy)",
            }}
            aria-label="SpecialSitsIntel"
          >
            {/* Bar mark — bold sans S transected by a horizontal rule.
                Tick marks on either side of the bar are omitted at this
                scale (they'd disappear below 2px). */}
            <svg width="32" height="32" viewBox="0 0 100 100" aria-hidden="true">
              <text
                x="50"
                y="82"
                textAnchor="middle"
                fontFamily="Syne, system-ui, sans-serif"
                fontSize="100"
                fontWeight="700"
                letterSpacing="-4"
                fill="currentColor"
              >
                S
              </text>
              <rect x="4" y="52" width="92" height="4.5" fill="currentColor" />
            </svg>
          </div>
          <div>
            <span className="logo-mark">
              <b>SpecialSits</b>Intel
            </span>
            <div className="live-pill">
              <span className="live-dot" />
              <span suppressHydrationWarning>LIVE{today ? ` · ${today}` : ""}</span>
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
