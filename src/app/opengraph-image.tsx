import { ImageResponse } from "next/og";

export const alt = "René Núñez | Probabilistic Sports Forecasting";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// One site-wide card: link previews on X and Reddit are the main referral
// channel, and a bare URL gets no clicks. Colors mirror the favicon.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#0b0f17",
          color: "#f4f4f5",
          fontFamily: "Georgia, serif",
        }}
      >
        <svg width="160" height="80" viewBox="0 0 32 16">
          <line x1="1" y1="14" x2="31" y2="14" stroke="#3b4252" strokeWidth="0.6" />
          <path
            d="M 1 14 C 6 14, 9 13, 11 9 C 13 3, 15 1, 16 1 C 17 1, 19 3, 21 9 C 23 13, 26 14, 31 14"
            fill="none"
            stroke="#22c55e"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 72, letterSpacing: -2, lineHeight: 1 }}>
            René Núñez
          </div>
          <div style={{ fontSize: 34, color: "#a1a1aa", lineHeight: 1.3 }}>
            Probabilistic forecasting models for MLB, college football, and the
            NFL, graded in public against the closing line.
          </div>
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#22c55e",
            fontFamily: "Menlo, monospace",
            letterSpacing: 2,
          }}
        >
          renenunez.dev
        </div>
      </div>
    ),
    size,
  );
}
