import { ImageResponse } from "next/og";

// Dark-mode variant of the iOS home-screen icon. Same 180x180 geometry
// as app/apple-icon.tsx, but with the mark in cream so it's legible
// against a dark wallpaper. Served at /apple-icon-dark and wired in
// app/layout.tsx via metadata.icons.other with a (prefers-color-scheme:
// dark) media query — modern iOS picks this up when the system theme
// is dark at home-screen render time.

export const runtime = "nodejs";
export const contentType = "image/png";

const CREAM = "#ece8de";
const SIZE = { width: 180, height: 180 };

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          color: CREAM,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontFamily: "system-ui",
          // Transparent background.
        }}
      >
        <span
          style={{
            fontSize: 150,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -6,
            paddingTop: 10,
            color: CREAM,
          }}
        >
          S
        </span>
        <div
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            top: 95,
            height: 8,
            background: CREAM,
          }}
        />
      </div>
    ),
    { ...SIZE, headers: { "content-type": "image/png" } },
  );
}
