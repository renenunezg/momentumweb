import { renderShareCard, SHARE_CARD_CONTENT_TYPE, SHARE_CARD_SIZE } from "@/components/share-card";
import { fetchNflHomeRatings } from "@/lib/home-research.server";

export const alt = "Player grades and team ratings | René Núñez";
export const size = SHARE_CARD_SIZE;
export const contentType = SHARE_CARD_CONTENT_TYPE;
// Rebuilt by the ratings publish webhook, like the ratings pages.
export const revalidate = 604800;

export default async function OpenGraphImage() {
  return renderShareCard({
    eyebrow: "Sports analytics",
    title: "Player grades & team ratings",
    subtitle: "Talent and matchups for sports analysis, fantasy, and DFS research.",
    chips: ["NFL", "College football", "MLB", "NHL"],
    league: { name: "NFL", ratings: await fetchNflHomeRatings() },
  });
}
