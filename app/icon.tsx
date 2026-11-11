import { ImageResponse } from "next/og";

// Browser-tab favicon. 32×32 filled Neon-Grid tile — deep-navy ground
// with the cyan SSI "bar" mark. Must read on BOTH light and dark tabs
// (modern browsers default to dark), which the earlier transparent /
// navy-on-transparent version failed on — dark navy disappeared into
// the dark tab chrome.

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Neon-Grid palette tokens, same values the app uses in globals.css.
const BG = "#0a0f28"; // deep navy ground
const FG = "#4a9cff"; // cyan mark — legible on both dark and light tabs

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BG,
          color: FG,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontFamily: "system-ui",
          borderRadius: 6,
        }}
      >
        <span
          style={{
            fontSize: 24,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -1,
            paddingTop: 1,
            color: FG,
            display: "flex",
          }}
        >
          S
        </span>
        <div
          style={{
            position: "absolute",
            left: 4,
            right: 4,
            top: 17,
            height: 2,
            background: FG,
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
