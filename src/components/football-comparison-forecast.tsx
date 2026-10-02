import type { ComparisonProjection } from "@/lib/football-comparison";
import { formatHomeLine, formatKickoff } from "@/lib/football";
import { formatDate, formatNumber } from "@/lib/utils";

export function FootballComparisonForecast({
  game,
}: {
  game: ComparisonProjection;
}) {
  return (
    <section
      aria-label="Published game forecast"
      className="overflow-hidden rounded-lg border border-border"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 bg-muted/40 px-4 py-3">
        <div>
          <h2 className="font-heading text-lg">
            {game.awayTeam} {game.neutralSite ? "vs" : "at"} {game.homeTeam}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {game.season} · Week {game.week}
            {game.kickoff &&
              ` · ${formatKickoff.day(game.kickoff)} ${formatKickoff.time(game.kickoff)} ET`}
          </p>
        </div>
        {game.neutralSite && (
          <span className="rounded-sm border border-border px-2 py-1 text-xs">
            Neutral site
          </span>
        )}
      </div>
      <dl className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="space-y-1 p-4">
          <dt className="text-xs text-muted-foreground">Forecast home line</dt>
          <dd className="font-mono text-2xl tabular-nums">
            {formatHomeLine(game.forecastSpread)}
          </dd>
          <dd className="text-xs">{game.homeTeam}</dd>
        </div>
        <div className="space-y-1 p-4">
          <dt className="text-xs text-muted-foreground">
            Market home line at forecast
          </dt>
          <dd className="font-mono text-2xl tabular-nums">
            {formatHomeLine(game.marketSpread)}
          </dd>
          <dd className="text-xs">
            {game.marketSpread == null ? "No recorded line" : game.homeTeam}
          </dd>
        </div>
        <div className="space-y-1 p-4">
          <dt className="text-xs text-muted-foreground">Projected score</dt>
          <dd className="flex items-baseline justify-between gap-3">
            <span className="text-xs">{game.awayTeam}</span>
            <span className="font-mono text-xl tabular-nums">
              {formatNumber(game.awayPoints)}
            </span>
          </dd>
          <dd className="flex items-baseline justify-between gap-3">
            <span className="text-xs">{game.homeTeam}</span>
            <span className="font-mono text-xl tabular-nums">
              {formatNumber(game.homePoints)}
            </span>
          </dd>
        </div>
      </dl>
      <p className="border-t border-border px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        Published {formatDate(game.asOf)}. Negative favors {game.homeTeam};
        positive favors {game.awayTeam}.
        {game.neutralSite &&
          " Home/away are designated sides at a neutral venue."}
      </p>
      <details className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Forecast details
        </summary>
        <p className="mt-2">
          Pure model home line: {formatHomeLine(game.pureSpread)}. The published
          forecast and projected score may include market adjustments. Market
          lines are recorded with the forecast, not live odds.
        </p>
      </details>
    </section>
  );
}

export function FootballComparisonLine({
  awayTeam,
  homeTeam,
  spread,
  homeField,
  neutralSite,
  asOf,
}: {
  awayTeam: string;
  homeTeam: string;
  spread: number | null;
  homeField: number | null;
  neutralSite: boolean;
  asOf: string;
}) {
  return (
    <section
      aria-label="Ratings-based matchup line"
      className="overflow-hidden rounded-lg border border-border"
    >
      <div className="bg-muted/40 px-4 py-3">
        <h2 className="font-heading text-lg">
          {awayTeam} {neutralSite ? "vs" : "at"} {homeTeam}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {neutralSite ? "Neutral field" : `${homeTeam} at home`}
        </p>
      </div>
      <div className="space-y-2 p-4">
        <p className="text-xs text-muted-foreground">Ratings-based model line</p>
        <p className="font-mono text-3xl tabular-nums">
          {spread == null ? "Unavailable" : formatHomeLine(spread)}
        </p>
        <p className="text-sm">{homeTeam}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {spread == null
            ? "A matching ratings snapshot and fitted home-field advantage are required."
            : neutralSite
              ? "Current power ratings on a neutral field."
              : `Current power ratings with ${formatNumber(homeField, 2)} points of fitted home-field advantage.`}
        </p>
      </div>
      <details className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Line details
        </summary>
        <p className="mt-2 leading-relaxed">
          Ratings from {formatDate(asOf)}. Away rating minus home rating
          {neutralSite ? "." : " minus home-field advantage."} Negative favors {homeTeam};
          positive favors {awayTeam}. This comparison uses team strength only.
          Game-specific quarterback, rest, pace, and market adjustments appear
          in published game forecasts when available.
        </p>
      </details>
    </section>
  );
}
