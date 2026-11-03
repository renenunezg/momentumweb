import { renderShareCard, SHARE_CARD_CONTENT_TYPE, SHARE_CARD_SIZE } from "@/components/share-card";

export const alt = "NHL team analysis | René Núñez";
export const size = SHARE_CARD_SIZE;
export const contentType = SHARE_CARD_CONTENT_TYPE;

export default function OpenGraphImage() {
  return renderShareCard({
    eyebrow: "NHL",
    title: "NHL Team Analysis",
    subtitle:
      "Explore team strength through goals, expected goals, and attack and defense ratings, with daily game projections.",
    chips: ["Team ratings", "Expected goals", "Projections"],
  });
}
