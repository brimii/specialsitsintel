import { ImageResponse } from "next/og";

// Browser-tab favicon. Transparent background per user request —
// the S + rounded horizontal bar sit on whatever chrome the browser
// paints. Cyan is used instead of navy because it keeps contrast on
// BOTH dark tabs (default in most modern browsers) and light tabs,
// which the earlier navy-on-transparent version failed at.

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const FG = "#4a9cff"; // Neon-Grid accent — readable on dark + light chromes

export default function Icon() {
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
            fontSize: 28,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -1,
            color: FG,
            display: "flex",
          }}
        >
          S
        </span>
        {/* Horizontal bar with rounded pill ends crossing the glyph. */}
        <div
          style={{
            position: "absolute",
            left: 3,
            right: 3,
            top: 15,
            height: 2,
            background: FG,
            borderRadius: 1,
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
