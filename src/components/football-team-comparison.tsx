"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { replaceLocation, useLocationSearch } from "@/lib/use-location-search";
import type { ComparisonProjections } from "@/lib/football-comparison";
import {
  FootballComparisonForecast,
  FootballComparisonLine,
} from "@/components/football-comparison-forecast";
import { teamColor } from "@/lib/team-colors";
import { cn, formatDate, formatSigned } from "@/lib/utils";
import { TeamLogo, type TeamLogoSource } from "@/components/team-logo";
import { ToggleGroup } from "@/components/toggle-group";
import {
  AwayHomePickers,
  RatingBars,
  type ChartEntry,
} from "@/components/team-comparison-parts";
import {
  type LimitedDataRule,
  type PowerRatingRow,
} from "@/components/power-ratings-table";
import { FOOTBALL_UNIT_COLUMNS, NFL_UNIT_COLUMNS } from "@/lib/football-units";

type UnitKey = (typeof NFL_UNIT_COLUMNS)[number]["key"];
type UnitRow = Partial<Record<UnitKey, number | null>> & {
  as_of: string;
  source_season?: number | null;
  unit_history_missing?: boolean;
  classification?: string | null;
};
type RatingRow = PowerRatingRow & {
  season: number;
  week: number;
  as_of: string;
  classification?: string | null;
};

const MODES = [
  { key: "matchups", label: "Offense vs defense" },
  { key: "units", label: "Same units" },
] as const;

function unitValue(row: UnitRow | undefined, key: UnitKey) {
  const value = row?.[key];
  return !row?.unit_history_missing && value != null && Number.isFinite(value)
    ? value
    : null;
}

function unitEntry(
  row: UnitRow | undefined,
  metric: UnitKey,
  peers: UnitRow[],
  team: string,
  color: string,
  label?: string,
): ChartEntry {
  const value = unitValue(row, metric);
  let count = 0;
  let rank = 1;
  for (const peer of peers) {
    const candidate = unitValue(peer, metric);
    if (candidate == null) continue;
    count++;
    if (value != null && candidate > value) rank++;
  }
  return {
    team,
    value,
    color,
    label,
    detail: value == null ? "Unavailable" : `#${rank} of ${count}`,
  };
}

export function FootballTeamComparison<T extends RatingRow, U extends UnitRow>({
  ratings,
  units,
  projections,
  rowKey,
  unitKey,
  logo,
  limited,
  sport,
}: {
  ratings: T[];
  units: U[];
  projections: ComparisonProjections;
  rowKey: (row: T) => string | number;
  unitKey: (row: U) => string | number;
  logo: (row: T) => (TeamLogoSource & { color: string | null }) | undefined;
  limited: LimitedDataRule;
  sport: "cfb" | "nfl";
}) {
  const search = useLocationSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const alphabetical = useMemo(
    () => [...ratings].sort((a, b) => a.team.localeCompare(b.team)),
    [ratings],
  );
  const unitsByTeam = useMemo(
    () => new Map(units.map((row) => [String(unitKey(row)), row])),
    [units, unitKey],
  );
  const left =
    ratings.find((row) => String(rowKey(row)) === params.get("team")) ??
    ratings[0];
  const right =
    ratings.find(
      (row) =>
        String(rowKey(row)) === params.get("opponent") &&
        rowKey(row) !== rowKey(left),
    ) ?? ratings.find((row) => rowKey(row) !== rowKey(left));
  const leftKey = left ? String(rowKey(left)) : "";
  const rightKey = right ? String(rowKey(right)) : "";
  const neutralSite = params.get("venue") === "neutral";
  const game = projections.games.find(
    (item) =>
      item.awayKey === leftKey && item.homeKey === rightKey &&
      item.neutralSite === neutralSite,
  );
  // HFA is a fitted model parameter shared by the week's non-neutral games.
  // Never treat a neutral game's zero as the model's home-field advantage.
  // A started game keeps the forecast it kicked off with, so only the latest
  // publish speaks for the current ratings.
  const weekGames = projections.games.filter(
    (item) =>
      item.season === left?.season &&
      item.week === left?.week &&
      item.neutralSite === false &&
      item.homeFieldPoints != null &&
      Number.isFinite(item.homeFieldPoints),
  );
  const latestPublish = Math.max(
    ...weekGames.map((item) => Date.parse(item.asOf)),
  );
  const homeFields = weekGames.flatMap((item) =>
    Date.parse(item.asOf) === latestPublish && item.homeFieldPoints != null
      ? [item.homeFieldPoints]
      : [],
  );
  const fittedHomeField =
    homeFields.length > 0 &&
    homeFields.every((value) => Math.abs(value - homeFields[0]) < 1e-6)
      ? homeFields[0]
      : null;
  const homeField = neutralSite ? 0 : fittedHomeField;
  const ratingsLine =
    left && right &&
    left.season === right.season && left.week === right.week &&
    left.as_of === right.as_of &&
    Number.isFinite(left.power_rating) && Number.isFinite(right.power_rating) &&
    homeField != null
      ? left.power_rating - right.power_rating - homeField
      : null;
  const mode = params.get("compare") === "units" ? "units" : "matchups";
  const scope =
    sport === "nfl"
      ? "NFL"
      : left?.classification === right?.classification
        ? (left?.classification ?? "D1").toUpperCase()
        : "D1";
  const peers = useMemo(
    () =>
      units.filter(
        (row) =>
          scope === "NFL" ||
          scope === "D1" ||
          row.classification?.toUpperCase() === scope,
      ),
    [units, scope],
  );

  if (!left || !right)
    return (
      <p className="text-sm text-muted-foreground">
        At least two teams are needed to compare ratings.
      </p>
    );

  const leftUnit = unitsByTeam.get(String(rowKey(left)));
  const rightUnit = unitsByTeam.get(String(rowKey(right)));
  const columns = sport === "cfb" ? FOOTBALL_UNIT_COLUMNS : NFL_UNIT_COLUMNS;

  const leftColor = teamColor(logo(left)) ?? "var(--chart-1)";
  const rightColor = teamColor(logo(right)) ?? "var(--chart-2)";
  const overallMetrics = [
    ["Power rating", "power_rating"],
    ["Offense", "offense_points"],
    ["Defense", "defense_points"],
  ] as const;
  const overallExtent = Math.max(
    5,
    Math.ceil(
      Math.max(
        ...overallMetrics.flatMap(([, key]) => [
          Math.abs(left[key] ?? 0),
          Math.abs(right[key] ?? 0),
        ]),
      ) / 5,
    ) * 5,
  );
  const unitExtent = Math.max(
    1,
    Math.ceil(
      Math.max(
        ...columns.flatMap(({ key }) => [
          Math.abs(unitValue(leftUnit, key) ?? 0),
          Math.abs(unitValue(rightUnit, key) ?? 0),
        ]),
      ),
    ),
  );

  function selectTeams(a: T, b: T, neutral = neutralSite) {
    const url = new URL(window.location.href);
    url.searchParams.set("team", String(rowKey(a)));
    url.searchParams.set("opponent", String(rowKey(b)));
    if (neutral) url.searchParams.set("venue", "neutral");
    else url.searchParams.delete("venue");
    replaceLocation(url);
  }

  return (
    <div className="space-y-section">
      {projections.games.length > 0 && (
        <label className="block space-y-2 text-xs text-muted-foreground">
          <span className="type-eyebrow">
            Published matchup
          </span>
          <select
            aria-label="Published matchup"
            value={game?.gameId ?? ""}
            className="block h-11 w-full min-w-0 rounded-md border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => {
              const selected = projections.games.find(
                (item) => item.gameId === event.target.value,
              );
              const away = ratings.find(
                (row) => String(rowKey(row)) === selected?.awayKey,
              );
              const home = ratings.find(
                (row) => String(rowKey(row)) === selected?.homeKey,
              );
              if (away && home) {
                selectTeams(away, home, selected?.neutralSite === true);
              }
            }}
          >
            <option value="" disabled>
              Choose a published game, or compare any two teams below
            </option>
            {[...projections.games].sort((a, b) => a.awayTeam.localeCompare(b.awayTeam) || a.homeTeam.localeCompare(b.homeTeam)).map((item) => (
              <option key={item.gameId} value={item.gameId}>
                {item.awayTeam} {item.neutralSite ? "vs" : "at"} {item.homeTeam}
                {item.neutralSite ? " (neutral)" : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      <AwayHomePickers
        rows={alphabetical}
        away={left}
        home={right}
        rowKey={rowKey}
        onSelect={(away, home) => selectTeams(away, home)}
      />

      <ToggleGroup
        label="Venue"
        variant="pill"
        options={[
          { key: "home", label: `At ${right.team}` },
          { key: "neutral", label: "Neutral field" },
        ]}
        value={neutralSite ? "neutral" : "home"}
        onChange={(venue) => selectTeams(left, right, venue === "neutral")}
      />

      {/* A scheduled game shows its published forecast; the ratings-based
          line is only for pairings and venues the model has not projected. */}
      {game ? (
        <FootballComparisonForecast game={game} />
      ) : (
        <FootballComparisonLine
          awayTeam={left.team}
          homeTeam={right.team}
          spread={ratingsLine}
          homeField={homeField}
          neutralSite={neutralSite}
          asOf={left.as_of}
        />
      )}

      <section
        aria-label="Overall team comparison"
        className="overflow-hidden rounded-lg border border-border"
      >
        <div className="grid grid-cols-2">
          {[left, right].map((row, index) => {
            const color = index === 0 ? leftColor : rightColor;
            return (
              <div
                key={rowKey(row)}
                className={cn(
                  "min-w-0 border-t-4 p-4 sm:p-5",
                  index === 1 && "border-l border-l-border text-right",
                )}
                style={{
                  borderTopColor: color,
                  background: `linear-gradient(${index === 0 ? 120 : 240}deg, color-mix(in srgb, ${color} 12%, transparent), transparent)`,
                }}
              >
                <div
                  className={cn(
                    "mb-2 flex items-center gap-2",
                    index === 1 && "justify-end",
                  )}
                >
                  <TeamLogo
                    team={logo(row)}
                    name={row.team}
                    className="size-9 sm:size-11"
                  />
                  <h2 className="type-section">
                    {row.team}
                  </h2>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  #{ratings.indexOf(row) + 1} {sport === "cfb" ? "D1" : "NFL"}{" "}
                  power rank
                </p>
                {limited.isLimited(row) && (
                  <p
                    className="mt-1 text-xs text-accent-amber"
                    title={limited.rowNote}
                  >
                    Limited rating data
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="grid gap-5 border-t border-border p-4 sm:grid-cols-3 sm:p-5">
          {overallMetrics.map(([label, key]) => (
            <div key={key} className="space-y-3">
              <h3 className="type-subsection">{label}</h3>
              <RatingBars
                compact
                extent={overallExtent}
                entries={[
                  { team: left.team, value: left[key], color: leftColor },
                  { team: right.team, value: right[key], color: rightColor },
                ]}
              />
            </div>
          ))}
        </div>
        <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-5">
          Points per game above average · Higher is better, including defense
        </p>
      </section>

      <section className="space-y-4" aria-label="Unit comparison">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="type-section flex items-center gap-2">
            <BarChart3 className="size-5 text-muted-foreground" />
            Unit comparison
          </h2>
          <ToggleGroup
            label="Unit comparison mode"
            options={MODES}
            value={mode}
            variant="pill"
            onChange={(next) => {
              const url = new URL(window.location.href);
              url.searchParams.set("compare", next);
              replaceLocation(url);
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Higher is better · Bars show ratings relative to average · Ranks
          within {scope}
        </p>
        {mode === "matchups" ? (
          <div className="space-y-section">
            {[
              {
                offense: left,
                defense: right,
                offenseUnit: leftUnit,
                defenseUnit: rightUnit,
                offenseColor: leftColor,
                defenseColor: rightColor,
              },
              {
                offense: right,
                defense: left,
                offenseUnit: rightUnit,
                defenseUnit: leftUnit,
                offenseColor: rightColor,
                defenseColor: leftColor,
              },
            ].map(
              ({
                offense,
                defense,
                offenseUnit,
                defenseUnit,
                offenseColor,
                defenseColor,
              }) => (
                <section
                  key={rowKey(offense)}
                  aria-label={`${offense.team} on offense`}
                  className="overflow-hidden rounded-lg border border-border"
                >
                  <div
                    className="flex items-center gap-3 border-l-4 px-4 py-4 sm:px-5"
                    style={{
                      borderLeftColor: offenseColor,
                      background: `color-mix(in srgb, ${offenseColor} 9%, transparent)`,
                    }}
                  >
                    <TeamLogo
                      team={logo(offense)}
                      name={offense.team}
                      className="size-9"
                    />
                    <div className="min-w-0">
                      <h3 className="type-subsection">
                        {offense.team} on offense
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {offense.team} offense vs {defense.team} defense
                      </p>
                    </div>
                  </div>
                  <div className="grid divide-y divide-border border-t border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                    {(["pass", "rush"] as const).map((play) => {
                      const blocking = unitEntry(
                        offenseUnit,
                        play === "pass" ? "pass_block" : "run_block",
                        peers,
                        offense.team,
                        offenseColor,
                      );

                      return (
                        <article key={play} className="space-y-4 p-4 sm:p-5">
                          <h4 className="type-subsection border-b border-border pb-2">
                            {play === "pass"
                              ? "Through the air"
                              : "On the ground"}
                          </h4>
                          <RatingBars
                            extent={unitExtent}
                            entries={[
                              unitEntry(
                                offenseUnit,
                                `${play}_offense`,
                                peers,
                                offense.team,
                                offenseColor,
                                play === "pass"
                                  ? "Pass offense"
                                  : "Rush offense",
                              ),
                              unitEntry(
                                defenseUnit,
                                `${play}_defense`,
                                peers,
                                defense.team,
                                defenseColor,
                                play === "pass"
                                  ? "Pass defense"
                                  : "Rush defense",
                              ),
                            ]}
                          />
                          <aside
                            aria-label={`${offense.team} ${play === "pass" ? "pass" : "run"} blocking`}
                            className="space-y-2 rounded-sm border-l-2 bg-muted/40 px-3 py-2"
                            style={{ borderLeftColor: offenseColor }}
                          >
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <span className="text-xs">
                                {offense.team} ·{" "}
                                {play === "pass"
                                  ? "Pass blocking"
                                  : "Run blocking"}
                              </span>
                              <span className="font-mono tabular-nums">
                                {formatSigned(blocking.value)}{" "}
                                <span className="ml-1 text-xs text-muted-foreground">
                                  {blocking.detail}
                                </span>
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Reflects the whole offense, including the QB and
                              ball carrier.
                            </p>
                          </aside>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ),
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {columns.map((column) => (
              <article
                key={column.key}
                className="space-y-4 rounded-lg border border-border bg-card p-4"
              >
                <h3 className="type-subsection">{column.name}</h3>
                <RatingBars
                  extent={unitExtent}
                  entries={[
                    unitEntry(
                      leftUnit,
                      column.key,
                      peers,
                      left.team,
                      leftColor,
                    ),
                    unitEntry(
                      rightUnit,
                      column.key,
                      peers,
                      right.team,
                      rightColor,
                    ),
                  ]}
                />
              </article>
            ))}
          </div>
        )}
        <details className="rounded-lg border border-border px-4 py-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Rating details and sources
          </summary>
          <div className="mt-3 space-y-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {sport === "cfb"
                ? "Opponent-adjusted PPA per game above an average FBS team."
                : "Opponent-adjusted points per game above league average."}{" "}
              Positive is better for every unit. Ranks exclude missing history.
              These describe past performance and do not project matchup points.
            </p>
            {[
              { rating: left, source: leftUnit },
              { rating: right, source: rightUnit },
            ].map(({ rating, source }) => {
              return (
                <p
                  key={rowKey(rating)}
                  className={cn(
                    "text-xs",
                    !source || source.unit_history_missing
                      ? "text-accent-amber"
                      : "text-muted-foreground",
                  )}
                >
                  {rating.team}:{" "}
                  {!source ? (
                    "unit ratings unavailable for this snapshot."
                  ) : source.unit_history_missing ? (
                    "no unit history, so neutral fallback values are excluded from this comparison."
                  ) : (
                    <>
                      {source.source_season != null &&
                        `${source.source_season} game history${source.source_season < rating.season ? " (prior season)" : ""} · `}
                      Updated {formatDate(source.as_of)}.
                    </>
                  )}
                </p>
              );
            })}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Unit ratings are descriptive companions to power ratings and do
              not add up to Offense or Defense. Blocking ratings come from shared
              team outcomes.{" "}
              <a
                href={`/${sport}/methodology#units`}
                className="underline underline-offset-4 hover:text-foreground"
              >
                How units are rated
              </a>
            </p>
          </div>
        </details>
      </section>
    </div>
  );
}
