import { ImageResponse } from "next/og";

// Open Graph + Twitter share image. 1200x630. Satori (the renderer
// behind next/og) requires `display: flex` on every div with multiple
// children, so every container below is explicit.

export const alt = "SpecialSitsIntel — US Event-Driven Intelligence Terminal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  const CYAN = "#4a9cff";
  const INK = "#0a0f28";
  const CREAM = "#e8eefc";
  const AMBER = "#ffa94d";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: INK,
          backgroundImage:
            "linear-gradient(rgba(74,156,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(74,156,255,.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          color: CREAM,
          display: "flex",
          flexDirection: "column",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        {/* Top row — brand + live + domain */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            marginBottom: 80,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: 2,
              color: CYAN,
              fontWeight: 600,
              marginRight: 24,
            }}
          >
            SSI
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 14,
              color: AMBER,
              letterSpacing: 3,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 10,
                height: 10,
                borderRadius: 999,
                background: AMBER,
                marginRight: 8,
              }}
            />
            LIVE
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: "auto",
              fontSize: 16,
              color: "#8595b8",
              letterSpacing: 2,
            }}
          >
            SPECIALSITSINTEL.COM
          </div>
        </div>

        {/* Mark + wordmark lockup */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              width: 140,
              height: 140,
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              color: CYAN,
              marginRight: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 180,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: -6,
              }}
            >
              S
            </div>
            <div
              style={{
                display: "flex",
                position: "absolute",
                left: 0,
                right: 0,
                top: 72,
                height: 10,
                background: CYAN,
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 64,
                fontWeight: 700,
                color: CREAM,
                lineHeight: 1,
                letterSpacing: -2,
                marginBottom: 10,
              }}
            >
              SpecialSitsIntel
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 20,
                color: "#8595b8",
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              US Event-Driven Intelligence
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            fontSize: 36,
            lineHeight: 1.15,
            color: CREAM,
            letterSpacing: -1,
            marginTop: "auto",
            maxWidth: "88%",
            flexWrap: "wrap",
          }}
        >
          Everything Bloomberg doesn't do, at a fraction of the cost.
        </div>

        {/* Footer rule */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            marginTop: 32,
            paddingTop: 20,
            borderTop: `1px solid ${CYAN}33`,
            fontSize: 16,
            color: "#8595b8",
            letterSpacing: 2,
          }}
        >
          <div style={{ display: "flex" }}>
            MERGER ARB · ACTIVISM · DISTRESSED · SPIN-OFFS · RESTRUCTURING
          </div>
          <div style={{ display: "flex", marginLeft: "auto", color: AMBER }}>
            INSTITUTIONAL ACCESS
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
