import { PageDescription, PageHeader, PageShell, PageTitle, PageMeta } from "@/components/page-layout";
import type { Metadata } from "next";
import {
  fetchLatestRatings,
  fetchPriorWeekRatings,
  fetchTeams,
  fetchUnitRatings,
} from "@/lib/cfb";
import { keepLastGood } from "@/lib/keep-last-good";
import { fetchComparisonProjections } from "@/lib/football-comparison.server";
import { fetchCfbPlayoffForecast } from "@/lib/cfb-playoffs.server";
import { decodeCfbPlayoffs, type CfbPlayoffPayload } from "@/lib/cfb-playoffs";
import { LastUpdated } from "@/components/last-updated";
import CfbRatings from "@/components/cfb-ratings";
import { HowGraded } from "@/components/how-graded";

// Every read here is expired by the revalidation webhook when its table is
// published, and nothing on the page depends on the clock, so the week is only
// a backstop.
export const revalidate = 604800;

export async function generateMetadata(): Promise<Metadata> {
  const { season, week } = await fetchLatestRatings();
  const year = season ?? new Date().getFullYear();
  return {
    title: `College Football Power Ratings ${year}`,
    description: `Bayesian power ratings for every FBS and FCS team${week != null ? ` through week ${week}` : ""} of the ${year} season, with offense and defense splits, unit ratings, and model uncertainty.`,
  };
}

export default async function RatingsPage() {
  const [{ ratings, season, week }, teams, playoffs] = await Promise.all([
    fetchLatestRatings(),
    fetchTeams(),
    fetchCfbPlayoffForecast(),
  ]);
  const forecast = playoffs?.season === season ? playoffs : null;
  const [units, projections, prior] =
    season != null && week != null
      ? await Promise.all([
          fetchUnitRatings(season, week),
          fetchComparisonProjections("cfb", season, week),
          fetchPriorWeekRatings(season, week),
        ])
      : [[], { games: [], unavailable: false }, { week: null, ratings: {} }];
  keepLastGood("CFB ratings projections", projections.unavailable);

  if (ratings.length === 0) {
    return (
      <PageShell>
        <PageTitle>CFB Power Ratings</PageTitle>
        <p className="text-muted-foreground">
          No ratings published yet.
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
            CFB Power Ratings
          </PageTitle>
          <PageMeta>
            {weekLabel && (
              <PageDescription className="type-eyebrow">
                {weekLabel}
              </PageDescription>
            )}
            <LastUpdated timestamp={lastUpdated} schedule="Updates when a new forecast is published" />
          </PageMeta>
          <div className="mt-2">
            <HowGraded label="How this works"
              lead={<>Model and market-implied strength, in points above an average FBS team on a neutral field.</>}
            >
              <p>
                Rankings follow the model. The published model ratings are the fitted
                ratings moved part of the way toward each team&apos;s market-history
                rating, with no input from the coming week&apos;s matchups. Tap a
                rating for its uncertainty and source.
              </p>
              <p>
                Off and Def split the model rating into offense and defense.
                Market is fitted to earlier closing spreads with a prior-season market
                baseline and leaves out season win totals.
                {prior.week != null && (
                  <>
                    {" "}Chg is the change in model rating since the week {prior.week}{" "}
                    ratings.
                  </>
                )}
              </p>
              <p>
                {forecast && (
                  <>
                    Record and AP rank under each FBS team are current through the
                    week {forecast.ap_week} AP poll.{" "}
                  </>
                )}
                Unit ratings describe each team and do not feed the model or the
                Off and Def split. Pass and run blocking come from shared team
                outcomes and do not isolate the line.
              </p>
            </HowGraded>
          </div>
        </div>
      </PageHeader>

      <CfbRatings
        ratings={ratings}
        units={units}
        projections={projections}
        teams={[...teams.values()]}
        prior={prior}
        standings={forecast ? standings(forecast) : {}}
      />
    </PageShell>
  );
}

// Record and AP rank ride on the playoff forecast, which carries them for
// every FBS team; only the short label crosses to the client.
function standings(payload: CfbPlayoffPayload): Record<number, string> {
  return Object.fromEntries(
    decodeCfbPlayoffs(payload).teams.map((t) => [
      t.id,
      `${t.wins}-${t.losses}${t.ap_rank != null ? ` · AP ${t.ap_rank}` : ""}`,
    ]),
  );
}
