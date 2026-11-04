import { renderShareCard, SHARE_CARD_CONTENT_TYPE, SHARE_CARD_SIZE } from "@/components/share-card";
import { fetchNhlHomeRatings } from "@/lib/home-research.server";

export const alt = "NHL team analysis | René Núñez";
export const size = SHARE_CARD_SIZE;
export const contentType = SHARE_CARD_CONTENT_TYPE;
// Rebuilt by the ratings publish webhook, like the ratings pages.
export const revalidate = 604800;

export default async function OpenGraphImage() {
  return renderShareCard({
    eyebrow: "NHL",
    title: "NHL Team Analysis",
    subtitle:
      "Explore team strength through goals, expected goals, and attack and defense ratings, with daily game projections.",
    chips: ["Team ratings", "Expected goals", "Projections"],
    league: { name: "NHL", ratings: await fetchNhlHomeRatings() },
  });
}
