"use client";

import { useFormStatus } from "react-dom";

// Indeterminate progress bar that appears while the parent <form>'s server
// action is running. Renders a thin shimmering bar (CSS in globals.css).
export function PendingBar() {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return <div className="pending-bar" aria-hidden="true" />;
}
