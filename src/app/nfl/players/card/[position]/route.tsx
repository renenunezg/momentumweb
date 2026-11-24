import { renderGradesPoster } from "@/components/share-poster";
import { fetchGradeTeams, fetchNflPositionGrades } from "@/lib/nfl";

// One image per position, drawn on its first request and rebuilt by the grades
// publish webhook, like the player grades page.
export const dynamic = "force-static";
export const revalidate = 604800;
export const generateStaticParams = () => [];

export async function GET(_request: Request, { params }: { params: Promise<{ position: string }> }) {
  const [{ position }, grades, teams] = await Promise.all([params, fetchNflPositionGrades(), fetchGradeTeams()]);
  return renderGradesPoster({
    league: "NFL",
    position,
    context: `${grades.season} · Through week ${grades.week}`,
    grades,
    teams,
  });
}
