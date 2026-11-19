"use client";

import { useMemo } from "react";
import type { NhlComparisonGame } from "@/lib/nhl";
import type { NhlTeamIdentity, NhlTeamRating } from "@/lib/types";
import { replaceLocation, useLocationSearch } from "@/lib/use-location-search";
import { teamColor } from "@/lib/team-colors";
import { cn, formatDate, formatNumber, formatPct } from "@/lib/utils";
import { TeamLogo } from "@/components/team-logo";
import { Kickoff } from "@/components/kickoff-cells";
import { AwayHomePickers, RatingBars } from "@/components/team-comparison-parts";

const rowKey = (row: NhlTeamRating) => row.team_abbr;

// Strengths are ratios to the league average, shown as percent better than
// average so both bars read higher-is-better: a 0.90 defense allows 10% fewer.
const attackPct = (row: NhlTeamRating) => (row.home_attack - 1) * 100;
const defensePct = (row: NhlTeamRating) => (1 - row.home_defense) * 100;

function roundUp(value: number, step: number, floor: number) {
  return Math.max(floor, Math.ceil(value / step) * step);
}

export function NhlTeamComparison({
  ratings,
  teams,
  games,
}: {
  // Sorted by rating, so the index is the league rank.
  ratings: NhlTeamRating[];
  teams: NhlTeamIdentity[];
  games: NhlComparisonGame[];
}) {
  const search = useLocationSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const teamByAbbr = useMemo(() => new Map(teams.map((t) => [t.team_abbr, t])), [teams]);
  const alphabetical = useMemo(
    () => [...ratings].sort((a, b) => a.team.localeCompare(b.team)),
    [ratings],
  );

  const away = ratings.find((row) => row.team_abbr === params.get("team")) ?? ratings[0];
  const home =
    ratings.find((row) => row.team_abbr === params.get("opponent") && row !== away) ??
    ratings.find((row) => row !== away);
  if (!away || !home) {
    return <p className="text-sm text-muted-foreground">At least two teams are needed to compare ratings.</p>;
  }
  // The next game of this pairing in this direction the latest run projected.
  const game = games.find(
    (item) => item.away_team_abbr === away.team_abbr && item.home_team_abbr === home.team_abbr,
  );

  function select(nextAway: NhlTeamRating, nextHome: NhlTeamRating) {
    const url = new URL(window.location.href);
    url.searchParams.set("team", nextAway.team_abbr);
    url.searchParams.set("opponent", nextHome.team_abbr);
    replaceLocation(url);
  }

  const color = (row: NhlTeamRating, fallback: string) => teamColor(teamByAbbr.get(row.team_abbr)) ?? fallback;
  const awayColor = color(away, "var(--chart-1)");
  const homeColor = color(home, "var(--chart-2)");
  const ratingExtent = roundUp(Math.max(Math.abs(away.rating), Math.abs(home.rating)), 0.5, 0.5);
  const strengthExtent = roundUp(
    Math.max(...[away, home].flatMap((row) => [Math.abs(attackPct(row)), Math.abs(defensePct(row))])),
    10,
    10,
  );
  const metrics = [
    { label: "Rating", value: (row: NhlTeamRating) => row.rating, extent: ratingExtent, digits: 2, unit: "" },
    { label: "Attack", value: attackPct, extent: strengthExtent, digits: 1, unit: "%" },
    { label: "Defense", value: defensePct, extent: strengthExtent, digits: 1, unit: "%" },
  ];

  return (
    <div className="space-y-section">
      {games.length > 0 && (
        <label className="block space-y-2 text-xs text-muted-foreground">
          <span className="type-eyebrow">Projected game</span>
          <select
            aria-label="Projected game"
            value={game?.game_id ?? ""}
            className="block h-11 w-full min-w-0 rounded-md border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => {
              const picked = games.find((item) => item.game_id === event.target.value);
              const a = ratings.find((row) => row.team_abbr === picked?.away_team_abbr);
              const h = ratings.find((row) => row.team_abbr === picked?.home_team_abbr);
              if (a && h) select(a, h);
            }}
          >
            <option value="" disabled>
              Choose a projected game, or compare any two teams below
            </option>
            {games.map((item) => (
              <option key={item.game_id} value={item.game_id}>
                {formatDate(item.game_date)}: {item.away_team_abbr} at {item.home_team_abbr}
              </option>
            ))}
          </select>
        </label>
      )}

      <AwayHomePickers rows={alphabetical} away={away} home={home} rowKey={rowKey} onSelect={select} />

      {game ? (
        <ProjectedGame game={game} away={away} home={home} />
      ) : (
        <RatingsMatchup away={away} home={home} />
      )}

      <section aria-label="Team ratings comparison" className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-2">
          {[away, home].map((row, index) => {
            const tint = index === 0 ? awayColor : homeColor;
            return (
              <div
                key={row.team_abbr}
                className={cn("min-w-0 border-t-4 p-4 sm:p-5", index === 1 && "border-l border-l-border text-right")}
                style={{
                  borderTopColor: tint,
                  background: `linear-gradient(${index === 0 ? 120 : 240}deg, color-mix(in srgb, ${tint} 12%, transparent), transparent)`,
                }}
              >
                <div className={cn("mb-2 flex items-center gap-2", index === 1 && "justify-end")}>
                  <TeamLogo team={teamByAbbr.get(row.team_abbr)} name={row.team} className="size-9 sm:size-11" />
                  <h2 className="type-section">{row.team}</h2>
                </div>
                <p className="font-mono text-xs text-muted-foreground">#{ratings.indexOf(row) + 1} NHL rating</p>
                {row.insufficient_window && (
                  <p className="mt-1 text-xs text-accent-amber">Fewer than ten games in the window</p>
                )}
              </div>
            );
          })}
        </div>
        <div className="grid gap-5 border-t border-border p-4 sm:grid-cols-3 sm:p-5">
          {metrics.map((metric) => (
            <div key={metric.label} className="space-y-3">
              <h3 className="type-subsection">{metric.label}</h3>
              <RatingBars
                compact
                extent={metric.extent}
                digits={metric.digits}
                unit={metric.unit}
                entries={[
                  { team: away.team_abbr, value: metric.value(away), color: awayColor },
                  { team: home.team_abbr, value: metric.value(home), color: homeColor },
                ]}
              />
            </div>
          ))}
        </div>
        <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-5">
          Attack and defense in percent better than league average · Higher is better, including defense
        </p>
      </section>
    </div>
  );
}

function MatchupHeader({ away, home, children }: { away: NhlTeamRating; home: NhlTeamRating; children?: React.ReactNode }) {
  return (
    <div className="bg-muted/40 px-4 py-3">
      <h2 className="type-section">
        {away.team} at {home.team}
      </h2>
      {children && <p className="mt-1 text-xs text-muted-foreground">{children}</p>}
    </div>
  );
}

function GoalsCell({ away, home, awayGoals, homeGoals, label }: {
  away: NhlTeamRating;
  home: NhlTeamRating;
  awayGoals: number | null;
  homeGoals: number | null;
  label: string;
}) {
  return (
    <div className="space-y-1 p-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      {[
        [away, awayGoals],
        [home, homeGoals],
      ].map(([row, goals]) => (
        <dd key={(row as NhlTeamRating).team_abbr} className="flex items-baseline justify-between gap-3">
          <span className="text-xs">{(row as NhlTeamRating).team_abbr}</span>
          <span className="font-mono text-xl tabular-nums">{formatNumber(goals as number | null, 2)}</span>
        </dd>
      ))}
    </div>
  );
}

function ProjectedGame({ game, away, home }: { game: NhlComparisonGame; away: NhlTeamRating; home: NhlTeamRating }) {
  return (
    <section aria-label="Published game forecast" className="overflow-hidden rounded-lg border border-border">
      <MatchupHeader away={away} home={home}>
        <Kickoff start={game.start_date} part="day" /> <Kickoff start={game.start_date} part="time" /> PT
      </MatchupHeader>
      <dl className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="space-y-1 p-4">
          <dt className="text-xs text-muted-foreground">Win probability</dt>
          {[
            [away, game.away_win_prob],
            [home, game.home_win_prob],
          ].map(([row, prob]) => (
            <dd key={(row as NhlTeamRating).team_abbr} className="flex items-baseline justify-between gap-3">
              <span className="text-xs">{(row as NhlTeamRating).team_abbr}</span>
              <span className="font-mono text-xl tabular-nums">{formatPct(prob as number | null, 0)}</span>
            </dd>
          ))}
        </div>
        <GoalsCell label="Expected goals" away={away} home={home} awayGoals={game.away_lambda} homeGoals={game.home_lambda} />
        <div className="space-y-1 p-4">
          <dt className="text-xs text-muted-foreground">Projected total</dt>
          <dd className="font-mono text-2xl tabular-nums">{formatNumber(game.model_total, 2)}</dd>
          <dd className="text-xs text-muted-foreground">goals</dd>
        </div>
      </dl>
      <details className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Forecast details
        </summary>
        <p className="mt-2 leading-relaxed">
          Published {formatDate(game.as_of)}. Pure model home win probability{" "}
          {formatPct(game.pure_home_win_prob, 1)}
          {game.market_home_prob != null && <>, market {formatPct(game.market_home_prob, 1)}</>}. The published
          forecast includes rest and any market blend.
        </p>
      </details>
    </section>
  );
}

// Each side's expected goals against an average opponent at its venue, scaled
// by the other side's defense: the published strengths alone, before rest.
function RatingsMatchup({ away, home }: { away: NhlTeamRating; home: NhlTeamRating }) {
  const awayGoals = away.away_xgf * home.home_defense;
  const homeGoals = home.home_xgf * away.away_defense;
  return (
    <section aria-label="Ratings-based expected goals" className="overflow-hidden rounded-lg border border-border">
      <MatchupHeader away={away} home={home}>No projected game for this pairing</MatchupHeader>
      <dl className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <GoalsCell label="Expected goals from ratings" away={away} home={home} awayGoals={awayGoals} homeGoals={homeGoals} />
        <div className="space-y-1 p-4">
          <dt className="text-xs text-muted-foreground">Expected total</dt>
          <dd className="font-mono text-2xl tabular-nums">{formatNumber(awayGoals + homeGoals, 2)}</dd>
          <dd className="text-xs text-muted-foreground">goals</dd>
        </div>
      </dl>
      <details className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          How this is computed
        </summary>
        <p className="mt-2 leading-relaxed">
          Ratings from {formatDate(away.as_of)}. Each team&apos;s expected goals at its venue against an average
          opponent, times the other team&apos;s defense. Rest and the market appear only in projected games, and win
          probabilities come from the model&apos;s projections.
        </p>
      </details>
    </section>
  );
}
