import { renderShareCard, SHARE_CARD_CONTENT_TYPE, SHARE_CARD_SIZE } from "@/components/share-card";

export const alt = "College football model | René Núñez";
export const size = SHARE_CARD_SIZE;
export const contentType = SHARE_CARD_CONTENT_TYPE;

export default function OpenGraphImage() {
  return renderShareCard({
    eyebrow: "College football",
    title: "CFB Model Ratings",
    subtitle:
      "Power ratings for every D-I team, weekly spread and total projections, and a Heisman board, graded against the closing line.",
    chips: ["266 D-I teams", "Spreads & totals", "Heisman", "Open source"],
  });
}
