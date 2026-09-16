import { renderShareCard, SHARE_CARD_CONTENT_TYPE, SHARE_CARD_SIZE } from "@/components/share-card";

export const alt = "René Núñez | Probabilistic Sports Forecasting";
export const size = SHARE_CARD_SIZE;
export const contentType = SHARE_CARD_CONTENT_TYPE;

export default function OpenGraphImage() {
  return renderShareCard({
    title: "René Núñez",
    subtitle:
      "Open forecasting models for the NFL, college football, MLB, and the NHL, graded in public against the closing line.",
    chips: ["Open source", "Public grading", "NFL · CFB · MLB · NHL"],
  });
}
