import { renderPlayerCard } from "@/components/share-player-card";
import { buildNhlGradedPlayers, fetchNhlPlayerTraitRows, fetchNhlPositionGrades, fetchTeams, seasonLabel } from "@/lib/nhl";
import { formatDate } from "@/lib/utils";

// One image per player, drawn on its first request and rebuilt by the grades
// publish webhook, like the player grades page.
export const dynamic = "force-static";
export const revalidate = 604800;
export const generateStaticParams = () => [];

export async function GET(_request: Request, { params }: { params: Promise<{ position: string; athleteId: string }> }) {
  const [{ position, athleteId }, grades, teams] = await Promise.all([params, fetchNhlPositionGrades(), fetchTeams()]);
  return renderPlayerCard({
    league: "NHL",
    sport: "nhl",
    position,
    athleteId,
    context: grades.season == null ? "" : `${seasonLabel(grades.season)} · As of ${formatDate(grades.asOf)}`,
    grades,
    teams: [...teams.values()].map((t) => ({ team: t.team_abbr, logo_light: t.logo_light, logo_dark: t.logo_dark })),
    loadPlayer: async (season, id) => buildNhlGradedPlayers(await fetchNhlPlayerTraitRows(season, [id]))[id],
  });
}
