"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ratingHeatmap } from "@/lib/rating-heatmap";
import { RatingsHeatmapLegend } from "@/components/ratings-heatmap-legend";
import { EVEN_HEAT_HEAD, HeatValue, evenHeatColumns } from "@/components/heat-value";
import { cn, formatSigned } from "@/lib/utils";
import { RatingsSearch, useRatingsSearch } from "@/components/ratings-search";
import { TeamLogo, type TeamLogoSource } from "@/components/team-logo";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Opponent-adjusted unit ratings with a sortable column per unit. Generic
// over the column set because the NFL adds special teams.
export function UnitRatingsTable<
  K extends string,
  U extends { team: string } & Record<K, number | null>,
>({
  units,
  heatmapUnits = units,
  columns,
  defaultSort,
  rowKey,
  logo,
  shortName,
  powerRank,
  intro,
  controls,
  badge,
  caption,
}: {
  units: U[];
  heatmapUnits?: U[];
  columns: readonly { key: K; label: string }[];
  defaultSort: K;
  rowKey: (unit: U) => string | number;
  logo: (unit: U) => TeamLogoSource | undefined;
  shortName?: (unit: U) => string;
  powerRank: Map<string | number, number>;
  intro: ReactNode;
  controls?: ReactNode;
  badge?: (unit: U) => { label: string; note: string } | null;
  caption: string;
}) {
  const [sortKey, setSortKey] = useState<K>(defaultSort);
  const sorted = useMemo(
    () =>
      [...units].sort(
        (a, b) => (b[sortKey] ?? -Infinity) - (a[sortKey] ?? -Infinity)
      ),
    [units, sortKey]
  );
  const { query, setQuery, matches, total } = useRatingsSearch(sorted);
  const heatmap = useMemo(() => new Map(columns.map(({ key }) => [
    key, ratingHeatmap(heatmapUnits.map((unit) => unit[key]), { center: 0 }),
  ])), [columns, heatmapUnits]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
          {intro}
        </p>
        {controls}
      </div>

      <RatingsSearch
        query={query}
        onChange={setQuery}
        shown={matches.length}
        total={total}
      />
      <RatingsHeatmapLegend centered />
      <div className="overflow-x-auto">
        {/* Phones: tighter, even columns, wrapped headers and one-line teams so every
            unit fits. The header buttons share one minimum, close to the widest label
            word, so a narrow phone squeezes every unit column alike. */}
        <Table
          density="compact"
          className="max-sm:[--table-cell-x:0.125rem] max-sm:[&_td]:text-xs"
          style={evenHeatColumns(columns.length)}
        >
          <TableCaption className="sr-only">{caption}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-right max-sm:w-auto">Rk</TableHead>
              <TableHead>Team</TableHead>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn("text-right max-sm:whitespace-normal max-sm:align-bottom", EVEN_HEAT_HEAD)}
                  aria-sort={sortKey === column.key ? "descending" : "none"}
                >
                  <button
                    type="button"
                    onClick={() => setSortKey(column.key)}
                    className={cn(
                      "type-eyebrow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:min-w-8",
                      sortKey === column.key
                        ? "text-foreground underline underline-offset-4"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {column.label}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matches.map(({ row: unit, rank: unitRank }) => {
              const flag = badge?.(unit);
              const rank = powerRank.get(rowKey(unit));
              return (
                <TableRow key={rowKey(unit)}>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {unitRank}
                  </TableCell>
                  <TableCell className="max-sm:whitespace-normal">
                    <span className="inline-flex items-center gap-1.5 align-middle sm:gap-2">
                      <TeamLogo team={logo(unit)} name={unit.team} />
                      <span className="font-medium">
                        {shortName ? (
                          <>
                            <span className="sm:hidden">{shortName(unit)}</span>
                            <span className="max-sm:hidden">{unit.team}</span>
                          </>
                        ) : unit.team}
                      </span>
                      {rank != null && (
                        <span className="font-mono text-xs text-muted-foreground max-sm:hidden">
                          <span className="sr-only">power rating rank </span>
                          {rank}
                        </span>
                      )}
                    </span>
                    {flag && (
                      <span
                        className="type-eyebrow ml-2 text-accent-amber max-sm:ml-0 max-sm:block max-sm:text-[0.625rem] max-sm:tracking-normal max-sm:normal-case"
                        title={flag.note}
                      >
                        {flag.label}
                        <span className="sr-only">: {flag.note}</span>
                      </span>
                    )}
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn("text-right", sortKey === column.key && "font-semibold")}
                    >
                      <HeatValue compact style={heatmap.get(column.key)?.(unit[column.key])}>
                        {formatSigned(unit[column.key])}
                      </HeatValue>
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
