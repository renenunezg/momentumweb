import { renderPlayerCard } from "@/components/share-player-card";
import { fetchGradeTeams, fetchGradedPlayers, fetchPositionGrades } from "@/lib/cfb";

// One image per player, drawn on its first request and rebuilt by the grades
// publish webhook, like the player grades page.
export const dynamic = "force-static";
export const revalidate = 604800;
export const generateStaticParams = () => [];

export async function GET(_request: Request, { params }: { params: Promise<{ position: string; athleteId: string }> }) {
  const [{ position, athleteId }, grades, teams] = await Promise.all([params, fetchPositionGrades(), fetchGradeTeams()]);
  return renderPlayerCard({
    league: "CFB",
    sport: "cfb",
    position,
    athleteId,
    context: `${grades.season} · Through week ${grades.week}`,
    grades,
    teams: teams,
    loadPlayers: fetchGradedPlayers,
  });
}
