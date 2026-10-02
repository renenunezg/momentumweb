import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { fetchLatestRatings, fetchTeams, fetchUnitRatings } from "@/lib/nfl";
import { fetchComparisonProjections } from "@/lib/football-comparison.server";
import { LastUpdated } from "@/components/last-updated";
import NflRatings from "@/components/nfl-ratings";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { season, week } = await fetchLatestRatings();
  const year = season ?? new Date().getFullYear();
  return {
    title: `NFL Power Ratings ${year}`,
    description: `Bayesian power ratings for all 32 NFL teams${week != null ? ` through week ${week}` : ""} of the ${year} season, built from drive-level EPA with offense, defense, and unit splits.`,
  };
}

export default async function RatingsPage() {
  const [{ ratings, season, week }, teams] = await Promise.all([
    fetchLatestRatings(),
    fetchTeams(),
  ]);
  const [units, projections] =
    season != null && week != null
      ? await Promise.all([
          fetchUnitRatings(season, week),
          fetchComparisonProjections("nfl", season, week),
        ])
      : [[], { games: [], unavailable: false }];

  if (ratings.length === 0) {
    return (
      <PageShell>
        <PageTitle>NFL Power Ratings</PageTitle>
        <p className="text-muted-foreground">
          No ratings published yet. Run the publish pipeline to load them.
        </p>
      </PageShell>
    );
  }

  const lastUpdated = ratings[0]?.as_of ?? null;
  const weekLabel =
    season != null && week != null ? `${season} · Week ${week}` : "";

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>
            NFL Power Ratings
          </PageTitle>
          {weekLabel && (
            <PageDescription className="font-mono text-xs uppercase tracking-wider">
              {weekLabel}
            </PageDescription>
          )}
        </div>
        <LastUpdated
          timestamp={lastUpdated}
          schedule="Updates when a new forecast is published"
        />
      </PageHeader>

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Power ratings for all 32 NFL teams, refit each week from drive-level
        EPA. A team&apos;s rating is its expected scoring margin against an
        average opponent on a neutral field, split into offense and defense
        points per game. Ratings are model output, not a poll. The published
        ratings are the fitted ratings shifted so that this week&apos;s
        rating differences plus home field match the published lines.
      </p>

      <NflRatings
        ratings={ratings}
        units={units}
        projections={projections}
        teams={[...teams.values()]}
      />

      <p className="text-xs text-muted-foreground">
        Off and Def are points per game above an average opponent; Rating is
        their sum. SD is the model&apos;s uncertainty about the rating.
      </p>
    </PageShell>
  );
}
