"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Command palette (⌘K). Opens from anywhere on the site, searches
// across navigation routes + deals (by name/ticker/acquirer) + a few
// terminal actions. Keyboard-first: arrow keys navigate, Enter picks,
// Escape closes. Fuzzy match is a simple case-insensitive substring
// with a small priority bonus for name-start matches.

type CmdDeal = { id: number; nom: string; acquereur: string | null; price: { sym?: string } | null };

type Item =
  | { kind: "nav"; label: string; hint: string; href: string; icon: string }
  | { kind: "deal"; label: string; hint: string; id: number; icon: string }
  | { kind: "action"; label: string; hint: string; run: () => void; icon: string };

const NAV_ITEMS: Omit<Extract<Item, { kind: "nav" }>, "kind">[] = [
  { label: "Deal Universe", hint: "Live US event-driven table", href: "/", icon: "◈" },
  { label: "Home", hint: "Product overview", href: "/home", icon: "⌂" },
  { label: "My Portfolio", hint: "Positions + P&L", href: "/portfolio", icon: "◉" },
  { label: "Strategies", hint: "7 sub-strategies", href: "/strategies", icon: "◫" },
  { label: "Market Regime", hint: "Macro + strategy fit", href: "/market-regime", icon: "◬" },
  { label: "Historical", hint: "25 legendary deals", href: "/historical", icon: "★" },
  { label: "US Regulators", hint: "FTC, DOJ, CFIUS, FCC...", href: "/regulators", icon: "⊞" },
  { label: "Glossary", hint: "Event-driven vocabulary", href: "/glossary", icon: "◷" },
  { label: "Pricing", hint: "Plans & subscription", href: "/pricing", icon: "€" },
  { label: "Terms of Service", hint: "Legal", href: "/legal/terms", icon: "§" },
  { label: "Privacy Policy", hint: "Legal", href: "/legal/privacy", icon: "§" },
  { label: "Disclosures", hint: "Legal", href: "/legal/disclosures", icon: "§" },
  { label: "Methodology", hint: "How the pipeline works", href: "/legal/methodology", icon: "§" },
];

function fuzzyScore(q: string, label: string): number {
  const lc = label.toLowerCase();
  const ql = q.toLowerCase();
  if (!ql) return 0;
  if (lc === ql) return 1000;
  if (lc.startsWith(ql)) return 800;
  const idx = lc.indexOf(ql);
  if (idx >= 0) return 500 - idx;
  // char-by-char subsequence
  let qi = 0;
  for (let i = 0; i < lc.length && qi < ql.length; i++) {
    if (lc[i] === ql[qi]) qi++;
  }
  return qi === ql.length ? 100 : -1;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const [deals, setDeals] = useState<CmdDeal[]>([]);
  const router = useRouter();

  // Global ⌘K / Ctrl+K opens the palette. Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Lazy-load the deal index once the palette first opens. Simple
  // select from Supabase, cached for the lifetime of the component.
  useEffect(() => {
    if (!open || deals.length > 0) return;
    const supabase = createClient();
    if (!supabase) return;
    supabase
      .from("deals")
      .select("id, nom, acquereur, price")
      .limit(500)
      .then(({ data }) => {
        if (data) setDeals(data as CmdDeal[]);
      });
  }, [open, deals.length]);

  // Reset state when closed; focus input when opened.
  useEffect(() => {
    if (open) {
      setQ("");
      setCursor(0);
      // Delay to let the DOM mount
      setTimeout(() => {
        document.getElementById("cmd-input")?.focus();
      }, 20);
    }
  }, [open]);

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];

    // Actions — always available
    const actions: Item[] = [
      {
        kind: "action",
        label: "Toggle command palette",
        hint: "⌘K",
        icon: "⌨",
        run: () => setOpen((v) => !v),
      },
      {
        kind: "action",
        label: "Sign out",
        hint: "End the current session",
        icon: "⎋",
        run: async () => {
          const s = createClient();
          if (s) await s.auth.signOut();
          router.refresh();
        },
      },
    ];

    // Score everything if there's a query, otherwise return a default
    // mix of nav + top deals.
    if (!q.trim()) {
      out.push(...NAV_ITEMS.map((n) => ({ ...n, kind: "nav" as const })));
      out.push(
        ...deals.slice(0, 12).map((d) => ({
          kind: "deal" as const,
          label: d.nom,
          hint: d.acquereur ?? (d.price?.sym ?? "—"),
          id: d.id,
          icon: "◈",
        })),
      );
      out.push(...actions);
      return out;
    }

    const scored: Array<{ item: Item; score: number }> = [];
    for (const n of NAV_ITEMS) {
      const s = Math.max(fuzzyScore(q, n.label), fuzzyScore(q, n.hint));
      if (s >= 0) scored.push({ item: { ...n, kind: "nav" }, score: s + 50 });
    }
    for (const d of deals) {
      const s = Math.max(
        fuzzyScore(q, d.nom),
        fuzzyScore(q, d.acquereur ?? ""),
        fuzzyScore(q, d.price?.sym ?? ""),
      );
      if (s >= 0) {
        scored.push({
          item: {
            kind: "deal",
            label: d.nom,
            hint: `${d.acquereur ?? ""} · ${d.price?.sym ?? ""}`.trim(),
            id: d.id,
            icon: "◈",
          },
          score: s,
        });
      }
    }
    for (const a of actions) {
      const s = fuzzyScore(q, a.label);
      if (s >= 0) scored.push({ item: a, score: s });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 30).map((x) => x.item);
  }, [q, deals, router]);

  // Keep cursor within bounds as the list shrinks.
  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, items.length - 1)));
  }, [items.length]);

  const pick = (item: Item) => {
    setOpen(false);
    if (item.kind === "nav") {
      router.push(item.href);
    } else if (item.kind === "deal") {
      // Route to / and pass the deal id as a hash so DealUniverse can select it.
      router.push(`/#deal-${item.id}`);
    } else {
      item.run();
    }
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(items.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[cursor];
      if (item) pick(item);
    }
  };

  if (!open) return null;

  return (
    <div
      className="cmd-overlay"
      role="dialog"
      aria-label="Command palette"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="cmd-box">
        <div className="cmd-input-wrap">
          <span className="cmd-prompt">⌘K</span>
          <input
            id="cmd-input"
            type="text"
            placeholder="Search deals, pages, actions…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
            autoComplete="off"
            spellCheck={false}
          />
          <span className="cmd-esc">ESC</span>
        </div>
        <div className="cmd-list" role="listbox">
          {items.length === 0 ? (
            <div className="cmd-empty">No match. Try "merger", "US Steel", "pricing", "sign out"…</div>
          ) : (
            items.map((item, i) => {
              const active = i === cursor;
              return (
                <button
                  type="button"
                  key={`${item.kind}-${item.label}-${i}`}
                  className={`cmd-item${active ? " active" : ""}`}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => pick(item)}
                  role="option"
                  aria-selected={active}
                >
                  <span className="cmd-ic">{item.icon}</span>
                  <span className="cmd-label">{item.label}</span>
                  <span className="cmd-hint">{item.hint}</span>
                  <span className="cmd-kind">{item.kind.toUpperCase()}</span>
                </button>
              );
            })
          )}
        </div>
        <div className="cmd-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>⏎</kbd> select</span>
          <span><kbd>ESC</kbd> close</span>
          <span style={{ marginLeft: "auto" }}>{items.length} results</span>
        </div>
      </div>
    </div>
  );
}
