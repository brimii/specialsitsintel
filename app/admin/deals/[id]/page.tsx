import { notFound } from "next/navigation";
import DealForm from "../DealForm";
import { getDealByIdRaw } from "@/lib/deals-v2";

export const dynamic = "force-dynamic";

export default async function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) notFound();
  const deal = await getDealByIdRaw(id);
  if (!deal) notFound();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: ".12em",
          color: "var(--text-3)",
          textTransform: "uppercase",
        }}
      >
        Edit deal #{id}
      </div>
      <DealForm deal={deal} />
    </div>
  );
}
