import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="page active" id="page-admin">
      <div style={{ maxWidth: "var(--content-max)", margin: "0 auto", padding: "32px clamp(20px,3vw,32px) 80px" }}>
        <div className="hero-eyebrow">Admin Console</div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(24px,3vw,36px)", margin: "8px 0 20px" }}>
          Administration
        </h1>
        <div className="filter-pills" style={{ marginBottom: "var(--sp-6)" }}>
          <Link href="/admin" className="filter-pill">Vue d&apos;ensemble</Link>
          <Link href="/admin/users" className="filter-pill">Utilisateurs</Link>
          <Link href="/admin/deals" className="filter-pill">Deals</Link>
          <Link href="/admin/review" className="filter-pill">Revue IA</Link>
        </div>
        {children}
      </div>
    </div>
  );
}
