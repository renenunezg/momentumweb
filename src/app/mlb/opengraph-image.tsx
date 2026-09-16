import { renderShareCard, SHARE_CARD_CONTENT_TYPE, SHARE_CARD_SIZE } from "@/components/share-card";

export const alt = "MLB model | René Núñez";
export const size = SHARE_CARD_SIZE;
export const contentType = SHARE_CARD_CONTENT_TYPE;

export default function OpenGraphImage() {
  return renderShareCard({
    eyebrow: "MLB",
    title: "MLB Model Predictions",
    subtitle:
      "Daily run-distribution forecasts from per-plate-appearance simulation, with calibrated win and total probabilities benchmarked against the market.",
    chips: ["Daily picks", "Calibrated probabilities", "Open source"],
  });
}
