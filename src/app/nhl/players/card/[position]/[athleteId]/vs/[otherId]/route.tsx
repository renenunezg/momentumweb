import { renderComparisonCard } from "@/components/share-player-card";
import { fetchNhlGradedPlayers, fetchNhlPositionGrades, fetchTeams, seasonLabel } from "@/lib/nhl";
import { formatDate } from "@/lib/utils";

// One image per pair of players, drawn on its first request and rebuilt by the grades
// publish webhook, like the player grades page.
export const dynamic = "force-static";
export const revalidate = 604800;
export const generateStaticParams = () => [];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ position: string; athleteId: string; otherId: string }> },
) {
  const [{ position, athleteId, otherId }, grades, teams] = await Promise.all([params, fetchNhlPositionGrades(), fetchTeams()]);
  return renderComparisonCard({
    league: "NHL",
    sport: "nhl",
    position,
    athleteIds: [athleteId, otherId],
    context: grades.season == null ? "" : `${seasonLabel(grades.season)} · As of ${formatDate(grades.asOf)}`,
    grades,
    teams: [...teams.values()].map((t) => ({ team: t.team_abbr, logo_light: t.logo_light, logo_dark: t.logo_dark })),
    loadPlayers: fetchNhlGradedPlayers,
  });
}
