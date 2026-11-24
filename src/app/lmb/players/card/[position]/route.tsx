import { GRADE_ROWS, renderLeadersPoster } from "@/components/share-poster";
import { lmbTeamCode, lmbTeamLogo } from "@/lib/lmb";
import { fetchLmbGradeLeaders } from "@/lib/lmb-data";
import { lmbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { MLB_POSITION_ORDER } from "@/lib/player-values";
import { formatNumber } from "@/lib/utils";

// One image per position, drawn on its first request and rebuilt by the grades
// publish webhook, like the player grades page.
export const dynamic = "force-static";
export const revalidate = 604800;
export const generateStaticParams = () => [];

export async function GET(_request: Request, { params }: { params: Promise<{ position: string }> }) {
  const { position } = await params;
  const group = MLB_POSITION_ORDER.find((key) => key.toLowerCase() === position.toLowerCase());
  if (!group) return new Response("Not found", { status: 404 });
  const leaders = await fetchLmbGradeLeaders(group, GRADE_ROWS);
  return renderLeadersPoster({
    league: "LMB",
    title: `LMB Player Grades | ${group}`,
    context: leaders.length ? `Projecting the ${leaders[0].grade_season} season` : "",
    rows: leaders.map((row) => {
      const code = lmbTeamCode(row.team_id ?? undefined);
      return {
        key: String(row.player_id),
        name: row.name,
        sub: code ?? "No club",
        portraitUrl: lmbPlayerHeadshotUrl(row.player_id),
        logo: code ? lmbTeamLogo(code) : undefined,
        team: code ?? "LMB",
        grade: row.grade!,
        gradeText: formatNumber(row.grade, 0),
      };
    }),
  });
}
