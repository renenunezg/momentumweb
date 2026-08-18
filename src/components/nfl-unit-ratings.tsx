"use client";

import { useMemo, useState } from "react";
import type {
  NflTeamIdentity,
  NflTeamRating,
  NflTeamUnitRating,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { TeamLogo } from "@/components/team-logo";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

const COLUMNS = [
  { key: "rush_offense", label: "Rush O" },
  { key: "pass_offense", label: "Pass O" },
  { key: "rush_defense", label: "Rush D" },
  { key: "pass_defense", label: "Pass D" },
  { key: "pass_block", label: "Pass Blk" },
  { key: "run_block", label: "Run Blk" },
  { key: "special_teams", label: "ST" },
] as const;

type UnitKey = (typeof COLUMNS)[number]["key"];

function fmt(value: number | null): string {
  if (value == null) return "–";
  const s = value.toFixed(1);
  return value > 0 ? `+${s}` : s;
}

export default function NflUnitRatings({
  units,
  ratings,
  teamByAbbr,
}: {
  units: NflTeamUnitRating[];
  ratings: NflTeamRating[];
  teamByAbbr: Map<string, NflTeamIdentity>;
}) {
  const [sortKey, setSortKey] = useState<UnitKey>("pass_offense");

  // Keep the overall power-rating order available so the default sort ties
  // back to the main table the reader just left.
  const powerRank = useMemo(
    () => new Map(ratings.map((r, i) => [r.team_abbr, i + 1])),
    [ratings]
  );

  const sorted = useMemo(
    () =>
      [...units].sort(
        (a, b) => (b[sortKey] ?? -Infinity) - (a[sortKey] ?? -Infinity)
      ),
    [units, sortKey]
  );

  if (units.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Unit ratings appear once the season has played games; the preseason
        forecast publishes team ratings only.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Points per game above league average, opponent adjusted. Companions to
        the power ratings, not components: they do not sum to Off and Def, and
        the line ratings attribute outcomes without snap level film data.
        Click a column to sort.
      </p>
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
            {sorted.map((u, index) => (
              <TableRow key={u.team_abbr}>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-2 align-middle">
                    <TeamLogo team={teamByAbbr.get(u.team_abbr)} name={u.team} />
                    <span className="font-medium">{u.team}</span>
                    <span className="font-mono text-xs opacity-60">
                      {powerRank.get(u.team_abbr)}
                    </span>
                  </span>
                </TableCell>
                {COLUMNS.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      "text-right font-mono tabular-nums",
                      sortKey === column.key && "font-semibold"
                    )}
                  >
                    {fmt(u[column.key])}
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
