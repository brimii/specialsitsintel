import { ImageResponse } from "next/og";

// Browser-tab favicon. Transparent background so the mark sits on top
// of whatever chrome the browser paints (light tabs in Safari/Chrome,
// dark tabs in Firefox's dark mode). Navy mark is legible on both.

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const NAVY = "#162f68";

export default function Icon() {
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
          // NO background — transparent PNG so the host surface shows through.
        }}
      >
        <span
          style={{
            fontSize: 32,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -1,
            paddingTop: 2,
            color: NAVY,
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
