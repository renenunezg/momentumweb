import { renderShareCard, SHARE_CARD_CONTENT_TYPE, SHARE_CARD_SIZE } from "@/components/share-card";
import { fetchNflHomeRatings } from "@/lib/home-research.server";

export const alt = "NFL player and team analysis | René Núñez";
export const size = SHARE_CARD_SIZE;
export const contentType = SHARE_CARD_CONTENT_TYPE;
// Rebuilt by the ratings publish webhook, like the ratings pages.
export const revalidate = 604800;

export default async function OpenGraphImage() {
  return renderShareCard({
    eyebrow: "NFL",
    title: "NFL Ratings & Grades",
    subtitle:
      "Team strength, player grades, projected production, and position-specific comparisons.",
    chips: ["Team ratings", "Player grades", "Projected production"],
    league: { name: "NFL", ratings: await fetchNflHomeRatings() },
  });
}
