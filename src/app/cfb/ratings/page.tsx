import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { fetchLatestRatings, fetchTeams, fetchUnitRatings } from "@/lib/cfb";
import { fetchComparisonProjections } from "@/lib/football-comparison.server";
import { LastUpdated } from "@/components/last-updated";
import CfbRatings from "@/components/cfb-ratings";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { season, week } = await fetchLatestRatings();
  const year = season ?? new Date().getFullYear();
  return {
    title: `College Football Power Ratings ${year}`,
    description: `Bayesian power ratings for every FBS and FCS team${week != null ? ` through week ${week}` : ""} of the ${year} season, with offense and defense splits, unit ratings, and model uncertainty.`,
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
          fetchComparisonProjections("cfb", season, week),
        ])
      : [[], { games: [], unavailable: false }];

  if (ratings.length === 0) {
    return (
      <PageShell>
        <PageTitle>College Football Power Ratings</PageTitle>
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
            College Football Power Ratings
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
        Model and market-implied strength, in points above an average FBS team
        on a neutral field. Rankings follow the model. Tap a rating for its
        uncertainty and source.
      </p>

      <CfbRatings
        ratings={ratings}
        units={units}
        projections={projections}
        teams={[...teams.values()]}
      />

      <p className="text-xs text-muted-foreground">
        Off and Def split the model rating into offense and defense.
        Market is fitted to earlier closing spreads with a prior-season market
        baseline; it does not include season win totals.
      </p>
    </PageShell>
  );
}
