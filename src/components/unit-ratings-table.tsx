"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn, formatSigned } from "@/lib/utils";
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
  columns,
  defaultSort,
  rowKey,
  logo,
  powerRank,
  intro,
  controls,
  badge,
  caption,
}: {
  units: U[];
  columns: readonly { key: K; label: string }[];
  defaultSort: K;
  rowKey: (unit: U) => string | number;
  logo: (unit: U) => TeamLogoSource | undefined;
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

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
          {intro}
        </p>
        {controls}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableCaption className="sr-only">{caption}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-right">Rk</TableHead>
              <TableHead>Team</TableHead>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className="text-right"
                  aria-sort={sortKey === column.key ? "descending" : "none"}
                >
                  <button
                    type="button"
                    onClick={() => setSortKey(column.key)}
                    className={cn(
                      "font-mono text-xs uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
            {sorted.map((unit, index) => {
              const flag = badge?.(unit);
              const rank = powerRank.get(rowKey(unit));
              return (
                <TableRow key={rowKey(unit)}>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 align-middle">
                      <TeamLogo team={logo(unit)} name={unit.team} />
                      <span className="font-medium">{unit.team}</span>
                      {rank != null && (
                        <span className="font-mono text-xs text-muted-foreground">
                          <span className="sr-only">power rating rank </span>
                          {rank}
                        </span>
                      )}
                    </span>
                    {flag && (
                      <span
                        className="ml-2 font-mono text-[10px] uppercase tracking-wider text-accent-amber"
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
                      className={cn(
                        "text-right font-mono tabular-nums",
                        sortKey === column.key && "font-semibold"
                      )}
                    >
                      {formatSigned(unit[column.key])}
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
