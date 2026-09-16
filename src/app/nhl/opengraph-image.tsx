import { renderShareCard, SHARE_CARD_CONTENT_TYPE, SHARE_CARD_SIZE } from "@/components/share-card";

export const alt = "NHL model | René Núñez";
export const size = SHARE_CARD_SIZE;
export const contentType = SHARE_CARD_CONTENT_TYPE;

export default function OpenGraphImage() {
  return renderShareCard({
    eyebrow: "NHL",
    title: "NHL Model Predictions",
    subtitle:
      "Daily win probabilities and goal totals from a Poisson goal model built on shot-quality windows, priced against the market.",
    chips: ["Daily picks", "Goal totals", "Open source"],
  });
}
