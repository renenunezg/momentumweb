import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The custom m from the wordmark, at touch-icon size; iOS rounds the corners itself.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#10342D" }}>
        <svg width="112" height="84" viewBox="62 0 696 519">
          <path fill="#F3F0E7" transform="translate(0 519) scale(1 -1)" d="M62 0V511H165V473C197 503 237 519 282 519C350 519 393 493 420 451C455 496 505 519 570 519C691 519 758 450 758 329V0H645V311C645 384 610 417 553 417C495 417 461 381 461 311V0H348V311C348 384 313 417 256 417C203 417 175 383 175 311V0Z" />
        </svg>
      </div>
    ),
    size,
  );
}
