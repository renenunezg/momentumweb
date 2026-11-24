import { GRADE_ROWS, renderLeadersPoster } from "@/components/share-poster";
import { fetchPlayerGradeLeaders } from "@/lib/mlb-players";
import { mlbTeamIdentity } from "@/lib/mlb-teams";
import { mlbPlayerHeadshotUrl } from "@/lib/player-headshots";
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
  const leaders = await fetchPlayerGradeLeaders(group, GRADE_ROWS);
  return renderLeadersPoster({
    league: "MLB",
    title: `MLB Player Grades | ${group}`,
    context: leaders.length ? `Projecting the ${leaders[0].season} season` : "",
    rows: leaders.map((row) => ({
      key: String(row.player_id),
      name: row.player_name ?? String(row.player_id),
      sub: [row.team || "Free agent", row.age == null ? null : `Age ${formatNumber(row.age, 0)}`].filter(Boolean).join(" · "),
      portraitUrl: mlbPlayerHeadshotUrl(row.player_id),
      logo: mlbTeamIdentity(row.team),
      team: row.team || "FA",
      grade: row.grade!,
      gradeText: formatNumber(row.grade, 0),
    })),
  });
}
