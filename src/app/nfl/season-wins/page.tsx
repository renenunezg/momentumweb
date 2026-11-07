import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { keepLastGood } from "@/lib/keep-last-good";
import { fetchSeasonWinTotals, fetchTeams } from "@/lib/nfl";
import { LastUpdated } from "@/components/last-updated";
import { SeasonWinsTable } from "@/components/season-wins-table";
import { HowGraded } from "@/components/how-graded";

// Every read here is expired by the revalidation webhook when its table is
// published, and nothing on the page depends on the clock, so the week is only
// a backstop.
export const revalidate = 604800;
export const metadata: Metadata = {
  title: "NFL Season Win Totals Projections",
  description:
    "Projected regular-season wins for all 32 NFL teams, with model uncertainty ranges and preseason sportsbook comparisons.",
};

function dateLabel(value: string | null) {
  if (!value) return "Unavailable";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function SeasonWinsPage() {
  const [{ rows, unavailable }, teams] = await Promise.all([
    fetchSeasonWinTotals(),
    fetchTeams(),
  ]);
  keepLastGood("NFL season wins", unavailable);
  const first = rows[0];
  if (!first)
    return (
      <PageShell>
        <PageTitle>NFL Season Win Projections</PageTitle>
        <p className="text-muted-foreground">
          {unavailable
            ? "Season projections are temporarily unavailable. Please check back shortly."
            : "Season projections will appear here once the full forecast is published."}
        </p>
      </PageShell>
    );
  const inSeason = rows.some((row) => row.games_played > 0);
  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>NFL Season Win Projections</PageTitle>
          <PageDescription className="type-eyebrow">
            {first.season} · Regular season ·{" "}
            {inSeason ? "Updated outlook" : "Preseason outlook"}
          </PageDescription>
        </div>
        <LastUpdated
          timestamp={first.as_of}
          schedule="Updates with each projection refresh"
        />
      </PageHeader>
      <div className="space-y-2">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Book is the frozen preseason line, which also informs the model&apos;s
          initial ratings, so the two are not independent.
        </p>
        <HowGraded label="How this works">
          <p>
            Expected wins cover the full 17-game schedule. The range shows the
            middle 80% of simulated season outcomes, including uncertainty in team
            strength and individual games.
            {inSeason &&
              " Completed results are locked in; projected wins include wins already earned plus expected remaining wins."}
          </p>
          <p>
            Each remaining game is simulated from its published margin: games that
            already have a sportsbook line use the margin blended with that line,
            and games without a line yet use the model&apos;s own margin.
            Difference is projected wins minus Book.
          </p>
          <p>
            Current team strengths and expected starting quarterbacks are held
            through the remaining schedule. Future injuries, lineup changes, and
            ties are not simulated. Completed ties count as zero wins.
          </p>
          <p>
            Ranges come from {first.simulation_count.toLocaleString("en-US")}{" "}
            reproducible simulations with shared team-strength uncertainty.
            Their season-level coverage has not yet been calibrated against
            historical outcomes.
          </p>
          <p>
            Ratings:{" "}
            {first.ratings_through_week === 0
              ? "preseason prior"
              : `games through Week ${first.ratings_through_week}`}
            . Schedule retrieved {dateLabel(first.schedule_fetched_at)}. Depth
            chart: {dateLabel(first.depth_chart_as_of)}.
          </p>
          <p>
            Book:{" "}
            {first.sportsbook_source_url ? (
              <a
                className="underline underline-offset-4 hover:text-foreground"
                href={first.sportsbook_source_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {first.sportsbook_source_name ?? "Preseason source"}
              </a>
            ) : (
              (first.sportsbook_source_name ?? "Source unavailable")
            )}
            , {dateLabel(first.sportsbook_source_date)}. This is a frozen
            comparison, not a live quote.
          </p>
        </HowGraded>
      </div>
      <SeasonWinsTable rows={rows} teams={[...teams.values()]} />
    </PageShell>
  );
}
