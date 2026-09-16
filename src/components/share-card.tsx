import { ImageResponse } from "next/og";

export const SHARE_CARD_SIZE = { width: 1200, height: 630 };
export const SHARE_CARD_CONTENT_TYPE = "image/png";

export type ShareCardProps = {
  // Small mono label above the title, e.g. the sport. Omitted on the site card.
  eyebrow?: string;
  title: string;
  subtitle: string;
  // Short proof points rendered as pills along the bottom edge.
  chips: readonly string[];
};

// One renderer behind every opengraph-image route: link previews on X and
// Reddit are the main referral channel, and a bare URL gets no clicks. Colors
// mirror the favicon. Satori needs display:flex on every multi-child box.
export function renderShareCard({ eyebrow, title, subtitle, chips }: ShareCardProps) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          background: "#0b0f17",
          color: "#f4f4f5",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="120" height="60" viewBox="0 0 32 16">
            <line x1="1" y1="14" x2="31" y2="14" stroke="#3b4252" strokeWidth="0.6" />
            <path
              d="M 1 14 C 6 14, 9 13, 11 9 C 13 3, 15 1, 16 1 C 17 1, 19 3, 21 9 C 23 13, 26 14, 31 14"
              fill="none"
              stroke="#22c55e"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          {eyebrow ? (
            <div
              style={{
                fontSize: 26,
                color: "#22c55e",
                fontFamily: "Menlo, monospace",
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              {eyebrow}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 72, letterSpacing: -2, lineHeight: 1 }}>{title}</div>
          <div style={{ fontSize: 32, color: "#a1a1aa", lineHeight: 1.3 }}>{subtitle}</div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: "Menlo, monospace",
          }}
        >
          <div style={{ display: "flex", gap: 14 }}>
            {chips.map((chip) => (
              <div
                key={chip}
                style={{
                  fontSize: 22,
                  color: "#d4d4d8",
                  padding: "10px 18px",
                  border: "1.5px solid #3b4252",
                  borderRadius: 999,
                }}
              >
                {chip}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 24, color: "#22c55e", letterSpacing: 2 }}>renenunez.dev</div>
        </div>
      </div>
    ),
    SHARE_CARD_SIZE,
  );
}
