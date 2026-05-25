import { ALERTS } from "@/app/data/content";

const colHex: Record<string, string> = {
  G: "#162f68",
  A: "#9c6d2a",
  R: "#a83232",
  P: "#6b52a0",
  B: "#3660a0",
};

// Bandeau "LIVE INTEL" défilant. Items dupliqués pour la boucle (scroll-x).
export default function AlertStrip() {
  const items = [...ALERTS, ...ALERTS];
  return (
    <div className="alert-strip">
      <div className="alert-label">
        <span className="live-dot" />
        LIVE INTEL
      </div>
      <div className="alerts-scroll">
        <div className="alerts-inner">
          {items.map((a, i) => {
            const hex = colHex[a.c] || "#162f68";
            return (
              <div className="alert-item" key={i}>
                <span className="alert-type" style={{ color: hex, background: `${hex}14`, borderColor: `${hex}33` }}>
                  {a.t}
                </span>
                <span className="alert-msg">{a.x}</span>
                <span className="alert-time">{a.d}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
