import Link from "next/link";

// Fixed above the StatusBar on all public pages. Ultra-low profile —
// one-liner with legal link roster + a "not advice" tag. Needed
// because the StatusBar reads as session chrome, not legal context.
// Hidden on /admin surfaces where it would compete with pipeline tools.
export default function ComplianceFooter() {
  return (
    <footer className="compliance-footer" aria-label="Compliance and legal links">
      <span className="cf-tag">NOT INVESTMENT ADVICE</span>
      <span className="cf-sep">·</span>
      <Link href="/legal/terms">Terms</Link>
      <span className="cf-sep">·</span>
      <Link href="/legal/privacy">Privacy</Link>
      <span className="cf-sep">·</span>
      <Link href="/legal/disclosures">Disclosures</Link>
      <span className="cf-sep">·</span>
      <Link href="/legal/methodology">Methodology</Link>
      <span className="cf-right">© {new Date().getFullYear()} SpecialSitsIntel · Delaware</span>
    </footer>
  );
}
