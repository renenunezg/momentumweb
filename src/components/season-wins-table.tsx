"use client";

import { useMemo, useState } from "react";
import type { NflSeasonWinTotal, NflTeamIdentity } from "@/lib/types";
import { TeamLogo } from "@/components/team-logo";
import { ViewTabPanel, ViewTabs } from "@/components/view-tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const views = [
  { key: "all", label: "All" },
  { key: "AFC", label: "AFC" },
  { key: "NFC", label: "NFC" },
] as const;
type View = (typeof views)[number]["key"];
type Sort = "projected_wins" | "difference";

export function SeasonWinsTable({
  rows,
  teams,
}: {
  rows: NflSeasonWinTotal[];
  teams: NflTeamIdentity[];
}) {
  const [view, setView] = useState<View>("all");
  const [division, setDivision] = useState("all");
  const divisions = useMemo(() => [...new Set(rows.filter((row) => view === "all" || row.conference === view).map((row) => row.division).filter((name): name is string => Boolean(name)))].sort(), [rows, view]);
  const [sort, setSort] = useState<Sort>("projected_wins");
  const [ascending, setAscending] = useState(false);
  const identities = useMemo(
    () => new Map(teams.map((t) => [t.team_abbr, t])),
    [teams],
  );
  const visible = useMemo(
    () =>
      rows
        .filter((row) => (view === "all" || row.conference === view) && (division === "all" || row.division === division))
        .map((row) => ({
          ...row,
          difference:
            row.sportsbook_win_total == null
              ? null
              : row.projected_wins - row.sportsbook_win_total,
        }))
        .sort((a, b) => {
          const left = a[sort],
            right = b[sort];
          if (left == null)
            return right == null ? a.team.localeCompare(b.team) : 1;
          if (right == null) return -1;
          return (
            (ascending ? left - right : right - left) ||
            a.team.localeCompare(b.team)
          );
        }),
    [rows, view, division, sort, ascending],
  );
  const inSeason = rows.some((row) => row.games_played > 0);

  function selectSort(next: Sort) {
    if (sort === next) setAscending(!ascending);
    else {
      setSort(next);
      setAscending(false);
    }
  }
  const sortButton = (key: Sort, label: string) => (
    <TableHead
      className="text-right"
      aria-sort={
        sort === key ? (ascending ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        aria-label={label}
        onClick={() => selectSort(key)}
        className={cn(
          "font-mono text-xs uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          sort === key && "text-foreground underline underline-offset-4",
        )}
      >
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">
          {key === "projected_wins" ? "Wins" : "Diff"}
        </span>
        <span aria-hidden="true">
          {sort === key ? (ascending ? " ↑" : " ↓") : ""}
        </span>
      </button>
    </TableHead>
  );

  return (
    <ViewTabs
      label="Season wins conference"
      options={views}
      value={view}
      onValueChange={(next) => { setView(next); setDivision("all"); }}
    >
      <ViewTabPanel value={view} className="space-y-3">
        <label className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Division</span>
          <select aria-label="Season wins division" value={division} onChange={(event) => setDivision(event.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2">
            <option value="all">All divisions</option>
            {divisions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>{visible.length} teams · Sort by wins or difference.</p>
          <p className="hidden items-center gap-3 sm:flex" aria-hidden="true">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-5 rounded-full bg-foreground/20" />
              80% range
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-foreground" />
              Model mean
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-0.5 bg-accent-amber" />
              Book
            </span>
          </p>
        </div>
        <Table>
          <TableCaption className="sr-only">
            NFL projected regular-season wins, 80 percent model ranges, and
            frozen preseason sportsbook totals
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Team</TableHead>
              {inSeason && (
                <TableHead className="hidden text-right sm:table-cell">
                  Record
                </TableHead>
              )}
              {sortButton("projected_wins", "Projected")}
              <TableHead className="text-right sm:min-w-44">
                <span className="hidden sm:inline">80% range</span>
                <span className="sm:hidden" aria-label="80 percent range">
                  80%
                </span>
              </TableHead>
              <TableHead className="text-right">Book</TableHead>
              {sortButton("difference", "Difference")}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.team_abbr}>
                <TableCell className="py-3">
                  <span className="inline-flex items-center gap-2 align-middle">
                    <TeamLogo
                      team={identities.get(row.team_abbr)}
                      name={row.team}
                    />
                    <span className="hidden font-medium sm:inline">
                      {row.team}
                    </span>
                    <span
                      className="font-medium sm:hidden"
                      aria-label={row.team}
                    >
                      {row.team_abbr}
                    </span>
                  </span>
                  <span className="mt-0.5 hidden pl-7 text-[10px] text-muted-foreground sm:block">
                    {row.division}
                  </span>
                  {inSeason && (
                    <span className="mt-0.5 block pl-7 text-[10px] text-muted-foreground sm:hidden">
                      {row.wins}-{row.losses}
                      {row.ties > 0 ? `-${row.ties}` : ""}
                    </span>
                  )}
                </TableCell>
                {inSeason && (
                  <TableCell className="hidden text-right text-muted-foreground sm:table-cell">
                    {row.wins}-{row.losses}
                    {row.ties > 0 ? `-${row.ties}` : ""}
                  </TableCell>
                )}
                <TableCell className="text-right font-semibold">
                  {row.projected_wins.toFixed(1)}
                  {inSeason && (
                    <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                      +{row.remaining_expected_wins.toFixed(1)} /{" "}
                      {row.games_remaining} left
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <span>
                    {row.wins_p10}–{row.wins_p90}
                  </span>
                  <div
                    className="relative mt-1 ml-auto hidden h-3 w-36 sm:block"
                    aria-hidden="true"
                  >
                    <div className="absolute top-1.5 h-px w-full bg-border" />
                    <div
                      className="absolute top-1 h-1.5 rounded-full bg-foreground/20"
                      style={{
                        left: `${(row.wins_p10 / 17) * 100}%`,
                        width: `${((row.wins_p90 - row.wins_p10) / 17) * 100}%`,
                      }}
                    />
                    {row.sportsbook_win_total != null && (
                      <div
                        className="absolute top-0.5 h-3 w-0.5 -translate-x-1/2 bg-accent-amber"
                        style={{
                          left: `${(row.sportsbook_win_total / 17) * 100}%`,
                        }}
                      />
                    )}
                    <div
                      className="absolute top-1 h-2 w-2 -translate-x-1/2 rounded-full bg-foreground"
                      style={{ left: `${(row.projected_wins / 17) * 100}%` }}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {row.sportsbook_win_total?.toFixed(1) ?? "–"}
                </TableCell>
                <TableCell className="text-right">
                  {row.difference == null
                    ? "–"
                    : `${row.difference >= 0 ? "+" : ""}${row.difference.toFixed(1)}`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ViewTabPanel>
    </ViewTabs>
  );
}
