import { ImageResponse } from "next/og";

// iOS home-screen icon (Add to Home Screen). 180×180 transparent —
// no filled square frame around the mark, per user request. The S +
// rounded bar sit on the user's wallpaper directly. Cyan is readable
// on every iOS background thanks to its saturation.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const FG = "#4a9cff";

export default function AppleIcon() {
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
    { ...size },
  );
}
