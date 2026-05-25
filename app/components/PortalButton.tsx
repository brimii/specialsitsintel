"use client";

import { useState, type ReactNode } from "react";

// Ouvre le Customer Portal Stripe (gérer / annuler l'abonnement, carte…).
export default function PortalButton({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Erreur.");
        setLoading(false);
      }
    } catch {
      alert("Erreur réseau.");
      setLoading(false);
    }
  };

  return (
    <button className={className} style={style} onClick={onClick} disabled={loading}>
      {loading ? "…" : children}
    </button>
  );
}
