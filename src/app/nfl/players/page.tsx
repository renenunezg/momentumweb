import { PageDescription, PageHeader, PageShell, PageTitle, PageMeta } from "@/components/page-layout";
import { NFL_PLAYER_SECTIONS, PlayerSectionTabs } from "@/components/player-section-tabs";
import type { Metadata } from "next";
import { fetchGradeTeams, fetchNflPositionGrades } from "@/lib/nfl";
import { formatNumber, formatSigned } from "@/lib/utils";
import { KpiCard } from "@/components/kpi-card";
import { LastUpdated } from "@/components/last-updated";
import PositionGrades from "@/components/position-grades";
import { SPORT_COPY } from "@/lib/position-traits";

// Every read here is expired by the revalidation webhook when its table is
// published, and nothing on the page depends on the clock, so the week is only
// a backstop.
export const revalidate = 604800;

export async function generateMetadata(): Promise<Metadata> {
  const { season, week } = await fetchNflPositionGrades();
  const year = season ?? new Date().getFullYear();
  return {
    title: `NFL Player Grades ${year}`,
    description: `Per-position scouting grades and wins above replacement for every qualified NFL player in ${year}${week != null ? ` through week ${week}` : ""}, built from opponent-adjusted traits rather than raw box score totals.`,
  };
}

export default async function NflPlayersPage() {
  const [grades, teams] = await Promise.all([fetchNflPositionGrades(), fetchGradeTeams()]);
  const { season, week, index, details, gradedCounts } = grades;
  const copy = SPORT_COPY.nfl;

  if (season == null || index.length === 0) {
    return (
      <PageShell>
        <PageTitle>Player Grades</PageTitle>
        <PlayerSectionTabs sections={NFL_PLAYER_SECTIONS} />
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
          <PageMeta>
            <PageDescription className="type-eyebrow">
              {season} · Through week {week}
            </PageDescription>
            <LastUpdated timestamp={grades.asOf} schedule="Updates after each Tuesday refresh" />
          </PageMeta>
        </div>
      </PageHeader>
      <PlayerSectionTabs sections={NFL_PLAYER_SECTIONS} />

      <div className="grid grid-cols-3 gap-3 border-y border-rule-strong [&>div]:py-3 sm:gap-4">
        <KpiCard
          compact
          label="Top QB"
          value={topQb?.name ?? "–"}
          sub={topQb ? `${topQb.team} · ${formatNumber(topQb.grade, 1)} grade` : "no graded quarterbacks"}
          tooltip={copy.gradeTip}
        />
        <KpiCard
          compact
          label="WAR leader"
          value={warLeader?.name ?? "–"}
          sub={warLeader ? `${warLeader.team} · ${formatSigned(warLeader.war, 2)} wins` : "no credited plays"}
          tooltip={`${copy.warTip} Leader in the initial player list.`}
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
        sport="nfl"
        season={season}
        index={index}
        details={details}
        gradedCounts={gradedCounts}
        teams={teams}
      />
    </PageShell>
  );
}
