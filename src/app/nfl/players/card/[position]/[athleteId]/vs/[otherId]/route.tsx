import { renderComparisonCard } from "@/components/share-player-card";
import { fetchGradeTeams, fetchNflGradedPlayers, fetchNflPositionGrades } from "@/lib/nfl";

// One image per pair of players, drawn on its first request and rebuilt by the grades
// publish webhook, like the player grades page.
export const dynamic = "force-static";
export const revalidate = 604800;
export const generateStaticParams = () => [];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ position: string; athleteId: string; otherId: string }> },
) {
  const [{ position, athleteId, otherId }, grades, teams] = await Promise.all([params, fetchNflPositionGrades(), fetchGradeTeams()]);
  return renderComparisonCard({
    league: "NFL",
    sport: "nfl",
    position,
    athleteIds: [athleteId, otherId],
    context: `${grades.season} · Through week ${grades.week}`,
    grades,
    teams: teams,
    loadPlayers: fetchNflGradedPlayers,
  });
}
