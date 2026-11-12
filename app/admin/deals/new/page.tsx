import DealForm from "../DealForm";

export const dynamic = "force-dynamic";

export default function NewDealPage() {
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
        New deal
      </div>
      <DealForm deal={null} />
    </div>
  );
}
