"use client";

import { useId, useMemo } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { ArrowLeftRight, BarChart3, Check, ChevronsUpDown } from "lucide-react";
import { replaceLocation, useLocationSearch } from "@/lib/use-location-search";
import { teamColor } from "@/lib/team-colors";
import { cn, formatDate, formatSigned } from "@/lib/utils";
import { TeamLogo, type TeamLogoSource } from "@/components/team-logo";
import { ToggleGroup } from "@/components/toggle-group";
import {
  type LimitedDataRule,
  type PowerRatingRow,
} from "@/components/power-ratings-table";

export const FOOTBALL_UNIT_COLUMNS = [
  { key: "rush_offense", label: "Rush O", name: "Rush offense" },
  { key: "pass_offense", label: "Pass O", name: "Pass offense" },
  { key: "rush_defense", label: "Rush D", name: "Rush defense" },
  { key: "pass_defense", label: "Pass D", name: "Pass defense" },
  { key: "pass_block", label: "Pass Blk", name: "Pass blocking" },
  { key: "run_block", label: "Run Blk", name: "Run blocking" },
] as const;

export const NFL_UNIT_COLUMNS = [
  ...FOOTBALL_UNIT_COLUMNS,
  { key: "special_teams", label: "ST", name: "Special teams" },
] as const;

type UnitKey = (typeof NFL_UNIT_COLUMNS)[number]["key"];
type UnitRow = Partial<Record<UnitKey, number | null>> & {
  as_of: string;
  source_season?: number | null;
  unit_history_missing?: boolean;
  classification?: string | null;
};
type RatingRow = PowerRatingRow & {
  season: number;
  classification?: string | null;
};

const MODES = [
  { key: "matchups", label: "Offense vs defense" },
  { key: "units", label: "Same units" },
] as const;

function TeamPicker<T extends RatingRow>({
  label,
  rows,
  selected,
  rowKey,
  onChange,
}: {
  label: string;
  rows: T[];
  selected: T;
  rowKey: (row: T) => string | number;
  onChange: (row: T) => void;
}) {
  const inputId = useId();
  return (
    <Combobox.Root
      items={rows}
      value={selected}
      onValueChange={(row) => {
        if (row) onChange(row);
      }}
      itemToStringLabel={(row) => row.team}
      itemToStringValue={(row) => String(rowKey(row))}
      isItemEqualToValue={(a, b) => rowKey(a) === rowKey(b)}
      autoHighlight
    >
      <div className="min-w-0 space-y-2">
        <label
          htmlFor={inputId}
          className="font-mono text-xs uppercase tracking-wider text-muted-foreground"
        >
          {label}
        </label>
        <div className="relative">
          <Combobox.Input
            id={inputId}
            className="h-11 w-full rounded-md border border-border bg-background py-2 pl-3 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Search teams…"
          />
          <Combobox.Trigger
            aria-label={`Choose ${label.toLowerCase()}`}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronsUpDown className="size-4" />
          </Combobox.Trigger>
        </div>
      </div>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={6} className="z-50">
          <Combobox.Popup className="w-[var(--anchor-width)] min-w-48 overflow-hidden rounded-md border border-border bg-background shadow-lg">
            <Combobox.Empty className="p-3 text-sm text-muted-foreground">
              No teams found.
            </Combobox.Empty>
            <Combobox.List className="max-h-64 overflow-y-auto p-1">
              {(row: T) => (
                <Combobox.Item
                  key={rowKey(row)}
                  value={row}
                  className="flex cursor-default items-center justify-between gap-3 rounded-sm px-3 py-2 text-sm outline-none data-highlighted:bg-muted"
                >
                  {row.team}
                  <Combobox.ItemIndicator>
                    <Check className="size-4" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

function unitValue(row: UnitRow | undefined, key: UnitKey) {
  const value = row?.[key];
  return !row?.unit_history_missing && value != null && Number.isFinite(value)
    ? value
    : null;
}

type ChartEntry = {
  team: string;
  value: number | null;
  color: string;
  detail?: string;
};

function RatingBars({
  entries,
  extent,
  compact = false,
}: {
  entries: ChartEntry[];
  extent: number;
  compact?: boolean;
}) {
  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <div key={index} className="space-y-1.5">
          {!compact && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
              <span className="font-medium">{entry.team}</span>
              <span className="text-muted-foreground">{entry.detail}</span>
            </div>
          )}
          <div
            className="flex items-center gap-3"
            role="img"
            aria-label={`${entry.team}: ${formatSigned(entry.value)}${entry.detail ? `, ${entry.detail}` : ""}`}
          >
            {compact && (
              <span
                className="w-14 shrink-0 truncate text-[10px] text-muted-foreground"
                title={entry.team}
                aria-hidden="true"
              >
                {entry.team}
              </span>
            )}
            <div
              className="relative h-5 min-w-0 flex-1 rounded-sm bg-muted/70"
              aria-hidden="true"
            >
              <span className="absolute inset-y-0 left-1/4 border-l border-border/60" />
              <span className="absolute inset-y-0 left-3/4 border-l border-border/60" />
              {entry.value != null && entry.value !== 0 && (
                <span
                  className="absolute inset-y-1 rounded-sm border border-foreground/15"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${entry.color} 85%, var(--foreground))`,
                    left: `${50 + Math.min(0, entry.value / extent) * 50}%`,
                    width: `${(Math.abs(entry.value) / extent) * 50}%`,
                  }}
                />
              )}
              <span className="absolute -inset-y-0.5 left-1/2 border-l border-muted-foreground/70" />
            </div>
            <span
              className="w-12 shrink-0 text-right font-mono text-lg tabular-nums"
              aria-hidden="true"
            >
              {formatSigned(entry.value)}
            </span>
          </div>
        </div>
      ))}
      <div
        className={cn(
          "flex justify-between pr-15 text-[10px] tabular-nums text-muted-foreground",
          compact && "pl-17",
        )}
        aria-hidden="true"
      >
        <span>{formatSigned(-extent, 0)}</span>
        <span>0 · Average</span>
        <span>{formatSigned(extent, 0)}</span>
      </div>
    </div>
  );
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
    detail: [label, value == null ? "Unavailable" : `#${rank} of ${count}`]
      .filter(Boolean)
      .join(" · "),
  };
}

export function FootballTeamComparison<T extends RatingRow, U extends UnitRow>({
  ratings,
  units,
  rowKey,
  unitKey,
  logo,
  limited,
  sport,
}: {
  ratings: T[];
  units: U[];
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

  function selectTeams(a: T, b: T) {
    const url = new URL(window.location.href);
    url.searchParams.set("team", String(rowKey(a)));
    url.searchParams.set("opponent", String(rowKey(b)));
    replaceLocation(url);
  }

  return (
    <div className="space-y-6">
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <TeamPicker
          label="Team A"
          rows={alphabetical}
          selected={left}
          rowKey={rowKey}
          onChange={(row) =>
            selectTeams(row, rowKey(row) === rowKey(right) ? left : right)
          }
        />
        <button
          type="button"
          onClick={() => selectTeams(right, left)}
          className="flex h-11 items-center justify-center gap-2 rounded-md border border-border px-3 text-xs text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Swap teams"
        >
          <ArrowLeftRight className="size-4" />
          <span className="sm:sr-only">Swap teams</span>
        </button>
        <TeamPicker
          label="Team B"
          rows={alphabetical}
          selected={right}
          rowKey={rowKey}
          onChange={(row) =>
            selectTeams(rowKey(row) === rowKey(left) ? right : left, row)
          }
        />
      </div>

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
                  <h2 className="font-heading text-xl sm:text-3xl">
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
              <h3 className="font-heading text-sm">{label}</h3>
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
          <h2 className="flex items-center gap-2 font-heading text-lg">
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
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                offense: left,
                defense: right,
                offenseUnit: leftUnit,
                defenseUnit: rightUnit,
              },
              {
                offense: right,
                defense: left,
                offenseUnit: rightUnit,
                defenseUnit: leftUnit,
              },
            ].flatMap(({ offense, defense, offenseUnit, defenseUnit }) =>
              (["pass", "rush"] as const).map((play) => (
                <article
                  key={`${rowKey(offense)}-${play}`}
                  className="space-y-4 rounded-lg border border-border bg-card p-4"
                >
                  <h3 className="font-heading">
                    {offense.team} {play === "pass" ? "passing" : "rushing"}
                  </h3>
                  <RatingBars
                    extent={unitExtent}
                    entries={[
                      unitEntry(
                        offenseUnit,
                        `${play}_offense`,
                        peers,
                        offense.team,
                        rowKey(offense) === rowKey(left)
                          ? leftColor
                          : rightColor,
                        "Offense",
                      ),
                      unitEntry(
                        defenseUnit,
                        `${play}_defense`,
                        peers,
                        defense.team,
                        rowKey(defense) === rowKey(left)
                          ? leftColor
                          : rightColor,
                        "Defense",
                      ),
                    ]}
                  />
                </article>
              )),
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {columns.map((column) => (
              <article
                key={column.key}
                className="space-y-4 rounded-lg border border-border bg-card p-4"
              >
                <h3 className="font-heading">{column.name}</h3>
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
              These describe past performance, not projected matchup points.
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
                    "no unit history; neutral fallback values are excluded from this comparison."
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
              not add up to Offense or Defense. Blocking ratings reflect shared
              outcomes, not isolated line grades.{" "}
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
