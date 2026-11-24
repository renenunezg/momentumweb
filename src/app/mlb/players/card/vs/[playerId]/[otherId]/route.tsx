import { renderMetricsComparison, type ComparisonPlayer } from "@/components/share-player-card";
import { fetchPlayerComparison, type ComparedPlayer } from "@/lib/mlb-players";
import { mlbTeamIdentity } from "@/lib/mlb-teams";
import { mlbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { mlbComparisonMetrics, orderTraits, traitLabel } from "@/lib/player-values";

// One image per pair of players, drawn on its first request and rebuilt by
// the grades publish webhook, like the player grades page.
export const dynamic = "force-static";
export const revalidate = 604800;
export const generateStaticParams = () => [];

const face = (row: ComparedPlayer): ComparisonPlayer => ({
  name: row.player_name ?? String(row.player_id),
  sub: `${row.team || "FA"} · ${row.position_group}`,
  team: row.team || "FA",
  logo: mlbTeamIdentity(row.team),
  portraitUrl: mlbPlayerHeadshotUrl(row.player_id),
});

export async function GET(_request: Request, { params }: { params: Promise<{ playerId: string; otherId: string }> }) {
  const { playerId, otherId } = await params;
  const ids: [number, number] = [Number(playerId), Number(otherId)];
  if (!ids.every(Number.isInteger) || ids[0] === ids[1]) return new Response("Not found", { status: 404 });
  const { players, traits } = await fetchPlayerComparison(ids);
  const first = players.find((row) => row.player_id === ids[0]);
  const second = players.find((row) => row.player_id === ids[1]);
  if (!first || !second) return new Response("Not found", { status: 404 });
  const gradeOf = (id: number, trait: string) => traits.find((t) => t.player_id === id && t.trait === trait)?.grade ?? null;
  // Every trait either player is graded on, once, in card order.
  const names = [...new Set(orderTraits(traits).map((t) => t.trait))];
  return renderMetricsComparison({
    league: "MLB",
    context: `Projecting the ${first.season} season | Grades are relative to each player's position`,
    players: [face(first), face(second)],
    metrics: mlbComparisonMetrics([first, second]),
    grades: names.map((name) => ({ label: traitLabel(name).label, values: [gradeOf(ids[0], name), gradeOf(ids[1], name)] })),
  });
}
