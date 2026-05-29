"use client";

import { useFormStatus } from "react-dom";
import type { CSSProperties, ReactNode } from "react";

// Submit button that shows pending state. Wraps a server action <form>.
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
      {pending ? (pendingLabel ?? "Processing…") : children}
    </button>
  );
}
