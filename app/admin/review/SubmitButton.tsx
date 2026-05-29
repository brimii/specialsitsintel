"use client";

import { useFormStatus } from "react-dom";
import type { CSSProperties, ReactNode } from "react";

// Bouton de soumission qui affiche l'état "en cours" du server action.
// À placer DANS un <form action={...}>.
export function SubmitButton({
  children,
  pendingLabel,
  className,
  style,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} style={style}>
      {pending ? (pendingLabel ?? "Traitement…") : children}
    </button>
  );
}
