// Page Deal Universe (route par défaut). Socle : DealTable + DealDetail
// seront ajoutés à l'étape 2, avec les deals de la maquette puis Supabase.
export default function Home() {
  return (
    <div className="page active" id="page-u">
      <div style={{ maxWidth: "var(--content-max)", margin: "0 auto", padding: "32px clamp(20px,3vw,32px) 80px" }}>
        <div className="hero-eyebrow">Event-Driven Intelligence</div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px,4vw,44px)", lineHeight: 1.1, margin: "8px 0 12px" }}>
          Deal Universe
        </h1>
        <p style={{ color: "var(--text-2)", maxWidth: 560 }}>
          Socle visuel en place (coque, polices, design system). Le tableau des deals
          et le panneau de détail arrivent à la prochaine étape.
        </p>
      </div>
    </div>
  );
}
