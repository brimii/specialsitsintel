"use client";

import { useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useModal } from "./modals/ModalProvider";

// Lance le Checkout Stripe pour un palier. Si l'utilisateur n'est pas connecté,
// ouvre la modale de connexion d'abord (le paiement exige une identité serveur).
export default function CheckoutButton({
  tier,
  className,
  children,
}: {
  tier: "analyst" | "institutional" | "enterprise";
  className?: string;
  children: ReactNode;
}) {
  const { open } = useModal();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    const supabase = createClient();
    if (!supabase) {
      alert("Authentification non configurée.");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      open("login");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Erreur lors de la création du paiement.");
        setLoading(false);
      }
    } catch {
      alert("Erreur réseau.");
      setLoading(false);
    }
  };

  return (
    <button className={className} onClick={onClick} disabled={loading}>
      {loading ? "…" : children}
    </button>
  );
}
