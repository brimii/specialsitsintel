import { ImageResponse } from "next/og";

// Next.js auto-wires this as /icon.png and uses it as the browser-tab
// favicon. Rendered server-side at request time, cached by Next.
// Design: the "Bar" mark — bold sans-serif S transected by a
// horizontal rule. Matches the sidebar mark pixel-for-concept.

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Navy on cream, matching the app's light-mode terminal palette.
// Browsers render favicons in both light and dark contexts without
// theme awareness, so we commit to the light-mode look here — it
// stays legible on both light and dark browser chrome.
const NAVY = "#162f68";
const CREAM = "#ece8de";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: CREAM,
          color: NAVY,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontFamily: "system-ui",
        }}
      >
        <span
          style={{
            fontSize: 32,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -1,
            paddingTop: 2,
          }}
        >
          S
        </span>
        {/* Horizontal rule — the "bar" that defines the mark. */}
        <div
          style={{
            position: "absolute",
            left: 2,
            right: 2,
            top: 16,
            height: 2,
            background: NAVY,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
