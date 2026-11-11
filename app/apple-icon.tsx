import { ImageResponse } from "next/og";

// iOS home-screen icon (Add to Home Screen). 180×180 filled Neon-Grid
// tile with iOS mask. Deep-navy ground + cyan "S" mark + cyan bar.
// Unlike the earlier transparent-background variant, this stays
// legible on every wallpaper and in every iOS theme. iOS will round
// the corners itself via its standard mask.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const BG = "#0a0f28";
const FG = "#4a9cff";

export default function AppleIcon() {
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
    { ...size },
  );
}
