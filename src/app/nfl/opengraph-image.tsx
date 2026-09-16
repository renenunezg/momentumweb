import { renderShareCard, SHARE_CARD_CONTENT_TYPE, SHARE_CARD_SIZE } from "@/components/share-card";

export const alt = "NFL model | René Núñez";
export const size = SHARE_CARD_SIZE;
export const contentType = SHARE_CARD_CONTENT_TYPE;

export default function OpenGraphImage() {
  return renderShareCard({
    eyebrow: "NFL",
    title: "NFL Model Ratings",
    subtitle:
      "Bayesian power ratings from drive-level EPA, weekly spread and total projections, season win totals, and awards odds, graded against the closing line.",
    chips: ["Spreads & totals", "Season wins", "Awards", "Open source"],
  });
}
