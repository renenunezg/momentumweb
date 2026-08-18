"use client";

import { useMemo, useState } from "react";
import type {
  CfbTeamIdentity,
  CfbTeamRating,
  CfbTeamUnitRating,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { TeamLogo } from "@/components/team-logo";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const COLUMNS = [
  { key: "rush_offense", label: "Rush O" },
  { key: "pass_offense", label: "Pass O" },
  { key: "rush_defense", label: "Rush D" },
  { key: "pass_defense", label: "Pass D" },
  { key: "pass_block", label: "Pass Blk" },
  { key: "run_block", label: "Run Blk" },
] as const;

const CLASSES = [
  { key: "fbs", label: "FBS" },
  { key: "fcs", label: "FCS" },
  { key: "all", label: "All D1" },
] as const;

type UnitKey = (typeof COLUMNS)[number]["key"];
type ClassKey = (typeof CLASSES)[number]["key"];

function fmt(value: number | null): string {
  if (value == null) return "–";
  const formatted = value.toFixed(1);
  return value > 0 ? `+${formatted}` : formatted;
}

export default function CfbUnitRatings({
  units,
  ratings,
  teamById,
}: {
  units: CfbTeamUnitRating[];
  ratings: CfbTeamRating[];
  teamById: Map<number, CfbTeamIdentity>;
}) {
  const [sortKey, setSortKey] = useState<UnitKey>("pass_offense");
  const [classification, setClassification] = useState<ClassKey>("fbs");

  const powerRank = useMemo(
    () => new Map(ratings.map((rating, index) => [rating.team_id, index + 1])),
    [ratings]
  );
  const sourceSeasons = useMemo(
    () =>
      [...new Set(units.map((unit) => unit.source_season).filter(Boolean))].sort(),
    [units]
  );
  const sorted = useMemo(
    () =>
      units
        .filter(
          (unit) =>
            classification === "all" || unit.classification === classification
        )
        .sort(
          (a, b) => (b[sortKey] ?? -Infinity) - (a[sortKey] ?? -Infinity)
        ),
    [classification, sortKey, units]
  );

  if (units.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Unit ratings have not been published for this ratings snapshot.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Opponent-adjusted PPA per game above an average FBS team. Positive is
          better in every column. These are descriptive companions to the power
          ratings, not model inputs or components of Off and Def. Pass and run
          blocking are shared-outcome proxies, not isolated line grades.
          {sourceSeasons.length === 1 && (
            <> Current preseason ratings use {sourceSeasons[0]} game history.</>
          )}
        </p>
        <div className="flex shrink-0 items-center font-mono text-xs uppercase tracking-wider">
          {CLASSES.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setClassification(option.key)}
              className={cn(
                "border-b-2 px-3 py-1.5 uppercase transition-colors",
                classification === option.key
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-right">Rk</TableHead>
              <TableHead>Team</TableHead>
              {COLUMNS.map((column) => (
                <TableHead key={column.key} className="text-right">
                  <button
                    type="button"
                    onClick={() => setSortKey(column.key)}
                    className={cn(
                      "font-mono text-xs uppercase tracking-wider transition-colors",
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
            {sorted.map((unit, index) => (
              <TableRow key={unit.team_id}>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-2 align-middle">
                    <TeamLogo
                      team={teamById.get(unit.team_id)}
                      name={unit.team}
                    />
                    <span className="font-medium">{unit.team}</span>
                    <span
                      className="font-mono text-xs text-muted-foreground"
                      title="Overall power-rating rank"
                    >
                      {powerRank.get(unit.team_id)}
                    </span>
                  </span>
                  {unit.unit_history_missing && (
                    <span
                      className="ml-2 font-mono text-[10px] uppercase tracking-wider text-accent-amber"
                      title="No prior-season unit history is available; all unit values use the neutral fallback."
                    >
                      No history
                    </span>
                  )}
                </TableCell>
                {COLUMNS.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      "text-right font-mono tabular-nums",
                      sortKey === column.key && "font-semibold"
                    )}
                  >
                    {fmt(unit[column.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
