import { renderShareCard, SHARE_CARD_CONTENT_TYPE, SHARE_CARD_SIZE } from "@/components/share-card";

export const alt = "MLB Batted-Ball Carry | René Núñez";
export const size = SHARE_CARD_SIZE;
export const contentType = SHARE_CARD_CONTENT_TYPE;

export default function OpenGraphImage() {
  return renderShareCard({
    eyebrow: "MLB",
    title: "Batted-Ball Carry",
    subtitle: "Why some hitters' fly balls travel farther than others hit just as hard, traced through the air and the spin to the swing.",
    chips: ["Carry leaderboard", "Spin and swing path", "Swing lab"],
  });
}
