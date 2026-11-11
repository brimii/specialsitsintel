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
            fontSize: 180,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -8,
            color: FG,
            WebkitTextStroke: "6px #4a9cff",
            display: "flex",
          }}
        >
          S
        </span>
        <div
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            top: 82,
            height: 16,
            background: FG,
            borderRadius: 8,
            display: "flex",
          }}
        />
      </div>
    ),
    { ...SIZE, headers: { "content-type": "image/png" } },
  );
}
