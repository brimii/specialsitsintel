import { ImageResponse } from "next/og";

// Dark-mode iOS home-screen variant. Same geometry as apple-icon.tsx
// (transparent background, cyan S + rounded bar) — cyan is readable
// on both light and dark wallpapers, so the dark-mode variant is a
// safe mirror in case iOS still fetches /apple-icon-dark from the
// layout metadata media query.

export const runtime = "nodejs";
export const contentType = "image/png";

const FG = "#4a9cff";
const SIZE = { width: 180, height: 180 };

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontFamily: "system-ui",
        }}
      >
        <span
          style={{
            fontSize: 150,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -5,
            color: FG,
            display: "flex",
          }}
        >
          S
        </span>
        <div
          style={{
            position: "absolute",
            left: 18,
            right: 18,
            top: 86,
            height: 9,
            background: FG,
            borderRadius: 4.5,
            display: "flex",
          }}
        />
      </div>
    ),
    { ...SIZE, headers: { "content-type": "image/png" } },
  );
}
