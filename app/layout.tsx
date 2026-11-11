import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import KpiBar from "./components/KpiBar";
import Ticker from "./components/Ticker";
import TopBar from "./components/TopBar";
import StatusBar from "./components/StatusBar";
import ComplianceFooter from "./components/ComplianceFooter";
import CookieBanner from "./components/CookieBanner";
import CommandPalette from "./components/CommandPalette";
import { ModalProvider } from "./components/modals/ModalProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://specialsitsintel.com"),
  title: "SpecialSitsIntel — Institutional Event-Driven Intelligence",
  description:
    "US event-driven intelligence terminal for institutional investors — merger arbitrage, activism, distressed, spin-offs, restructurings, tender offers. AI-curated, human-validated.",
  openGraph: {
    type: "website",
    siteName: "SpecialSitsIntel",
    title: "SpecialSitsIntel — US Event-Driven Intelligence Terminal",
    description:
      "AI-curated US merger arb, activism, distressed, spin-off intelligence for institutional funds. Everything Bloomberg doesn't do, at a fraction of the cost.",
    url: "https://specialsitsintel.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpecialSitsIntel — US Event-Driven Intelligence",
    description:
      "AI-curated US merger arb, activism, distressed, spin-off intelligence for institutional funds.",
  },
  // Icons are intentionally not declared here. Next.js auto-injects
  // <link> tags from the file-based convention in this directory:
  //   app/favicon.ico   → /favicon.ico (legacy clients, Safari, Slack)
  //   app/icon.png      → /icon with hash (modern browser tabs, 32×32)
  //   app/apple-icon.png → /apple-icon with hash (iOS home screen, 180×180)
  // All three are the same Syne bar-mark the Sidebar paints — rasterised
  // once with Playwright to pixel-match the live site. Declaring an
  // `icons` field here would suppress that auto-injection, and the raw
  // /icon URL cannot be hardcoded because Next.js hashes it at build.
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
          <TopBar />
          <KpiBar />
          <Ticker />
          {children}
          <ComplianceFooter />
          <StatusBar />
          <CookieBanner />
          <CommandPalette />
        </ModalProvider>
      </body>
    </html>
  );
}
