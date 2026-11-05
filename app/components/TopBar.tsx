"use client";

import { useEffect, useState } from "react";

// Terminal top bar — Bloomberg-style chrome above KpiBar. Fixed layout:
// brand + live indicator + command input + clock. The command input is
// a placeholder for now (⌘K palette ships in a later phase); the clock
// updates every second so it always reads correct.
export default function TopBar() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const fmt = () => {
      const d = new Date();
      const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
      const time = d.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });
      setNow(`${date} · ${time} · EST`);
    };
    fmt();
    const t = setInterval(fmt, 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="topbar">
      <span className="topbar-brand">SSI</span>
      <span className="topbar-live">
        <span className="topbar-dot" />
        LIVE
      </span>
      <span className="topbar-slash">/DEAL</span>
      <input
        className="topbar-cmd"
        placeholder="search · press ⌘K"
        aria-label="Command palette (coming soon)"
      />
      <span className="topbar-clock" suppressHydrationWarning>
        {now}
      </span>
      <span className="topbar-mkt">MKT OPEN</span>
    </div>
  );
}
