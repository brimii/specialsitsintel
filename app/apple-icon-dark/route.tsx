import { ImageResponse } from "next/og";

// Dark-mode variant of the iOS home-screen icon. Now that the default
// apple-icon is a filled Neon-Grid tile (deep-navy ground with a cyan
// mark), it already reads on every wallpaper and in every iOS theme,
// so this file is kept as a safe mirror in case iOS still fetches
// /apple-icon-dark from the layout metadata media query. Same bitmap.

export const runtime = "nodejs";
export const contentType = "image/png";

const BG = "#0a0f28";
const FG = "#4a9cff";
const SIZE = { width: 180, height: 180 };

export async function GET() {
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
        }}
      >
        <span
          style={{
            fontSize: 128,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -5,
            paddingTop: 8,
            color: FG,
            display: "flex",
          }}
        >
          S
        </span>
        <div
          style={{
            position: "absolute",
            left: 24,
            right: 24,
            top: 94,
            height: 7,
            background: FG,
            display: "flex",
          }}
        />
      </div>
    ),
    { ...SIZE, headers: { "content-type": "image/png" } },
  );
}
