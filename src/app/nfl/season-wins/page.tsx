import type { Metadata } from "next";
import { fetchSeasonWinTotals, fetchTeams } from "@/lib/nfl";
import { LastUpdated } from "@/components/last-updated";
import { SeasonWinsTable } from "@/components/season-wins-table";

export const revalidate = 3600;
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
  const first = rows[0];
  if (!first)
    return (
      <main id="main" className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8">
        <h1 className="font-heading text-2xl tracking-tight">NFL Season Win Projections</h1>
        <p className="mt-4 text-muted-foreground">
          {unavailable
            ? "Season projections are temporarily unavailable. Please check back shortly."
            : "Season projections will appear here once the full forecast is published."}
        </p>
      </main>
    );
  const inSeason = rows.some((row) => row.games_played > 0);
  return (
    <main
      id="main"
      className="mx-auto w-full max-w-5xl min-w-0 space-y-6 px-4 py-8"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">NFL Season Win Projections</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {first.season} · Regular season ·{" "}
            {inSeason ? "Updated outlook" : "Preseason outlook"}
          </p>
        </div>
        <LastUpdated
          timestamp={first.as_of}
          schedule="Updates with each projection refresh"
        />
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Projected regular-season win totals for all 32 NFL teams, next to the
        preseason sportsbook line. Expected wins cover the full 17-game schedule. The range shows the
        middle 80% of simulated season outcomes, including uncertainty in team
        strength and individual games.
        {inSeason &&
          " Completed results are locked in; projected wins include wins already earned plus expected remaining wins."}
      </p>
      <div className="border-y border-rule-strong py-4 text-sm leading-relaxed">
        <span className="font-medium">Model output and sportsbook input.</span>{" "}
        <span className="text-muted-foreground">
          Book is the frozen preseason line, which also informs the model&apos;s
          initial ratings. These forecasts are therefore not independent of that
          input. Difference is projected wins minus Book, without an additional
          game-line blend.
        </span>
      </div>
      <SeasonWinsTable rows={rows} teams={[...teams.values()]} />
      <div className="grid gap-6 border-t border-rule-strong pt-5 text-xs leading-relaxed text-muted-foreground sm:grid-cols-2">
        <div className="space-y-2">
          <h2 className="font-mono uppercase tracking-wider text-foreground">
            Forecast assumptions
          </h2>
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
        </div>
        <div className="space-y-2">
          <h2 className="font-mono uppercase tracking-wider text-foreground">
            Sources and timing
          </h2>
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
        </div>
      </div>
    </main>
  );
}
