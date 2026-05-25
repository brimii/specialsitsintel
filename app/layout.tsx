import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import KpiBar from "./components/KpiBar";
import Ticker from "./components/Ticker";
import { ModalProvider } from "./components/modals/ModalProvider";

export const metadata: Metadata = {
  title: "SpecialSitsIntel — Institutional Event-Driven Intelligence",
  description:
    "Terminal d'intelligence special situations pour fonds event-driven : merger arb, activisme, distressed, spin-offs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ModalProvider>
          <Sidebar />
          <KpiBar />
          <Ticker />
          {children}
        </ModalProvider>
      </body>
    </html>
  );
}
