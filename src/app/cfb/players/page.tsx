import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import { PlayerSectionTabs } from "@/components/player-section-tabs";
import type { Metadata } from "next";
import { fetchPositionGrades, fetchTeams } from "@/lib/cfb";
import { formatNumber, formatSigned } from "@/lib/utils";
import { KpiCard } from "@/components/kpi-card";
import { LastUpdated } from "@/components/last-updated";
import PositionGrades from "@/components/position-grades";
import { GRADE_TIP, WAR_TIP } from "@/lib/position-traits";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { season, week } = await fetchPositionGrades();
  const year = season ?? new Date().getFullYear();
  return {
    title: `College Football Player Grades ${year}`,
    description: `Per-position scouting grades and wins above replacement for every qualified FBS player in ${year}${week != null ? ` through week ${week}` : ""}, built from opponent-adjusted traits rather than raw box score totals.`,
  };
}

export default async function PlayersPage() {
  const [grades, teams] = await Promise.all([fetchPositionGrades(), fetchTeams()]);
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

  const topQb = index.find((row) => row.positionGroup === "QB" && row.grade != null) ?? null;
  const warLeader = Object.values(details)
    .filter((p) => p.war != null)
    .sort((a, b) => (b.war ?? 0) - (a.war ?? 0))[0] ?? null;
  const gradedTotal = Object.values(gradedCounts).reduce((sum, n) => sum + n, 0);

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>Player Grades</PageTitle>
          <PageDescription className="type-eyebrow">
            {season} · Through week {week}
          </PageDescription>
        </div>
        <LastUpdated timestamp={grades.asOf} schedule="Updates after each Monday refresh" />
      </PageHeader>
      <PlayerSectionTabs />

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Position-specific grades and wins above replacement. Explore the traits
        behind each grade, see additional context, or compare two players at the
        same position.
      </p>

      <div className="grid grid-cols-3 gap-3 border-y border-rule-strong [&>div]:py-3 sm:gap-4">
        <KpiCard
          compact
          label="Top QB"
          value={topQb?.name ?? "–"}
          sub={topQb ? `${topQb.team} · ${formatNumber(topQb.grade, 1)} grade` : "no graded quarterbacks"}
          tooltip={GRADE_TIP}
        />
        <KpiCard
          compact
          label="WAR leader"
          value={warLeader?.name ?? "–"}
          sub={warLeader ? `${warLeader.team} · ${formatSigned(warLeader.war, 2)} wins` : "no credited plays"}
          tooltip={`${WAR_TIP} Leader in the initial player list.`}
        />
        <KpiCard
          compact
          label="Graded"
          value={formatNumber(gradedTotal, 0)}
          sub="qualified this week"
          tooltip="Requires the week’s minimum games played (up to six) and the traits needed for the position’s grade."
        />
      </div>

      <PositionGrades
        sport="cfb"
        season={season}
        index={index}
        details={details}
        gradedCounts={gradedCounts}
        teams={[...teams.values()]}
      />
    </PageShell>
  );
}
