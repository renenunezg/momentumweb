import { PageDescription, PageHeader, PageShell, PageTitle, PageMeta } from "@/components/page-layout";
import { PlayerSectionTabs } from "@/components/player-section-tabs";
import type { Metadata } from "next";
import { fetchGradeTeams, fetchPositionGrades } from "@/lib/cfb";
import { LastUpdated } from "@/components/last-updated";
import PositionGrades from "@/components/position-grades";

// Every read here is expired by the revalidation webhook when its table is
// published, and nothing on the page depends on the clock, so the week is only
// a backstop.
export const revalidate = 604800;

export async function generateMetadata(): Promise<Metadata> {
  const { season, week } = await fetchPositionGrades();
  const year = season ?? new Date().getFullYear();
  return {
    title: `College Football Player Grades ${year}`,
    description: `Per-position scouting grades and wins above replacement for every qualified FBS player in ${year}${week != null ? ` through week ${week}` : ""}, built from opponent-adjusted traits.`,
  };
}

export default async function PlayersPage() {
  const [grades, teams] = await Promise.all([fetchPositionGrades(), fetchGradeTeams()]);
  const { season, week, index, details, gradedCounts } = grades;

  if (season == null || index.length === 0) {
    return (
      <PageShell>
        <PageTitle>Player Grades</PageTitle>
        <p className="text-muted-foreground">
          No position grades have been published yet. The grades appear once the
          first week of the season is final.
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
            <PageDescription className="type-eyebrow">
              {season} · Through week {week}
            </PageDescription>
            <LastUpdated timestamp={grades.asOf} schedule="Updates after each Monday refresh" />
          </PageMeta>
        </div>
      </PageHeader>
      <PlayerSectionTabs />

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Position-specific grades and wins above replacement.
      </p>

      <PositionGrades
        sport="cfb"
        season={season}
        index={index}
        details={details}
        gradedCounts={gradedCounts}
        teams={teams}
      />
    </PageShell>
  );
}
