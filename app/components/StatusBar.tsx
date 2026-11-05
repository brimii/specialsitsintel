"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Fixed-bottom status bar — Bloomberg-style chrome. Shows keyboard
// shortcuts on the left and session identity on the right. Mobile
// hides the shortcuts (no keyboard) and shrinks the identity.
export default function StatusBar() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return (
    <div className="statusbar">
      <span className="statusbar-k"><span className="k">⌘K</span>CMD</span>
      <span className="statusbar-k"><span className="k">⌘W</span>WATCH</span>
      <span className="statusbar-k"><span className="k">⌘/</span>FILTER</span>
      <span className="statusbar-right">{email ? `ANALYST · ${email}` : "GUEST"}</span>
    </div>
  );
}
