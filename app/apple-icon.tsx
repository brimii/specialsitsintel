import { ImageResponse } from "next/og";

// iOS home-screen icon (Add to Home Screen). Rendered at 180x180, the
// size Apple expects for modern retina displays. Transparent background
// so the user's wallpaper shows through once iOS applies its rounded-
// corner mask — no cream square frame against a dark wallpaper.
//
// This file serves the LIGHT variant (navy mark) which iOS uses by
// default, and on light-mode home screens. The dark variant is served
// by app/apple-icon-dark/route.tsx and wired via the metadata.icons.other
// array in app/layout.tsx with a media query.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const NAVY = "#162f68";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          color: NAVY,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontFamily: "system-ui",
          // NO background — transparent PNG.
        }}
      >
        <span
          style={{
            fontSize: 150,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -6,
            paddingTop: 10,
            color: NAVY,
          }}
        >
          S
        </span>
        {/* Horizontal rule across the middle of the icon. */}
        <div
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            top: 95,
            height: 8,
            background: NAVY,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
