"use client";

import { type CSSProperties, type ReactNode } from "react";
import { useModal } from "./modals/ModalProvider";

// Bouton client pour ouvrir une modale depuis un Server Component (ex. page Home).
export default function ModalButton({
  modal,
  className,
  style,
  children,
}: {
  modal: "access" | "contact" | "login";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { open } = useModal();
  return (
    <button className={className} style={style} onClick={() => open(modal)}>
      {children}
    </button>
  );
}
