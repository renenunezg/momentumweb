import { PageDescription, PageHeader, PageShell, PageTitle, PageMeta } from "@/components/page-layout";
import type { Metadata } from "next";
import { fetchNhlPositionGrades, fetchTeams } from "@/lib/nhl";
import { LastUpdated } from "@/components/last-updated";
import PositionGrades from "@/components/position-grades";

// Every read here is expired by the revalidation webhook when its table is
// published, and nothing on the page depends on the clock, so the week is only
// a backstop.
export const revalidate = 604800;

// The season is named by the year it opens in.
function seasonLabel(season: number): string {
  return `${season}-${String((season + 1) % 100).padStart(2, "0")}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const { season } = await fetchNhlPositionGrades();
  const year = seasonLabel(season ?? new Date().getFullYear());
  return {
    title: `NHL Player Grades ${year}`,
    description: `Grades on the 20 to 80 scale for every qualified NHL forward, defenseman and goalie in ${year}, from each skater's effect on expected goals with linemates held constant and each goalie's goals saved above expected.`,
  };
}

export default async function NhlPlayersPage() {
  const [grades, teams] = await Promise.all([fetchNhlPositionGrades(), fetchTeams()]);
  const { season, index, details } = grades;

  if (season == null || index.length === 0) {
    return (
      <PageShell>
        <PageTitle>Player Grades</PageTitle>
        <p className="text-muted-foreground">
          No player grades have been published yet. The grades appear once the
          season is a few games old.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>Player Grades</PageTitle>
          <PageMeta>
            <PageDescription className="type-eyebrow">{seasonLabel(season)}</PageDescription>
            <LastUpdated timestamp={grades.asOf} schedule="Updates Mondays and Thursdays" />
          </PageMeta>
        </div>
      </PageHeader>

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Forwards, defensemen and goalies, each graded against their own position.
        A skater&apos;s grade ranks the goals he adds and prevents; a goalie&apos;s
        ranks the goals he saves above expected.
      </p>

      <PositionGrades
        sport="nhl"
        season={season}
        index={index}
        details={details}
        teams={[...teams.values()].map((t) => ({ team: t.team_abbr, logo_light: t.logo_light, logo_dark: t.logo_dark }))}
      />
    </PageShell>
  );
}
