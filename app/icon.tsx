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
            fontSize: 34,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -1.5,
            color: FG,
            // Additional 1.2px stroke on top of the 900 weight fattens the
            // glyph past what the system font alone can do at 32×32, so it
            // reads as a confident mark instead of a thin outline.
            WebkitTextStroke: "1.2px #4a9cff",
            display: "flex",
          }}
        >
          S
        </span>
        {/* Horizontal bar with rounded pill ends crossing the glyph. */}
        <div
          style={{
            position: "absolute",
            left: 2,
            right: 2,
            top: 14,
            height: 4,
            background: FG,
            borderRadius: 2,
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
