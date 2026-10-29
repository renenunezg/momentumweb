"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ParkCarry } from "@/components/mlb-carry-charts";
import { Pager } from "@/components/pager";
import { ToggleGroup } from "@/components/toggle-group";
import { PlayerCell } from "@/components/player-cell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CarryMinorRow, MinorLevel, MinorSummary } from "@/lib/mlb-carry";
import { mlbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { cn, foldSearch } from "@/lib/utils";

const LEVELS: { key: MinorLevel; label: string }[] = [
  { key: "aaa", label: "Triple-A" },
  { key: "fsl", label: "Florida State League" },
];
const PAGE_SIZE = 25;
type SortKey = "carry" | "carry_raw" | "exit_velo" | "n_air" | "hr";
const COLUMNS: { key: SortKey; label: string; format: (v: number) => string }[] = [
  { key: "n_air", label: "Air balls", format: (v) => v.toFixed(0) },
  { key: "carry", label: "Carry", format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}` },
  { key: "carry_raw", label: "Unadjusted", format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}` },
  { key: "exit_velo", label: "Exit velo", format: (v) => v.toFixed(1) },
  { key: "hr", label: "HR", format: (v) => v.toFixed(0) },
];

export function CarryMinors({ rows, summaries, season }: { rows: CarryMinorRow[]; summaries: Record<MinorLevel, MinorSummary>; season: number }) {
  const [level, setLevel] = useState<MinorLevel>("aaa");
  const [sortKey, setSortKey] = useState<SortKey>("carry");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const search = useDeferredValue(foldSearch(query.trim()));
  const summary = summaries[level];
  const label = LEVELS.find((l) => l.key === level)!.label;

  const shown = useMemo(
    () =>
      rows
        .filter((r) => r.level === level && r.season === season && r.n_air >= summary.qualified_air)
        .filter((r) => !search || foldSearch(r.player_name).includes(search))
        .sort((a, b) => (dir === "desc" ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey])),
    [rows, level, season, summary.qualified_air, search, sortKey, dir],
  );
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  // Phones keep carry and whatever the board is sorted by.
  const onPhone = (key: SortKey) => key === "carry" || key === sortKey;
  const current = Math.min(page, totalPages - 1);

  return (
    <div className="space-y-4">
      <ToggleGroup
        label="Level"
        options={LEVELS}
        value={level}
        onChange={(next) => {
          setLevel(next);
          setPage(0);
        }}
        variant="chip"
      />
      <p className="max-w-3xl text-sm leading-relaxed">
        In {label}, carry is measured against {label} hitters for the same exit velocity, launch angle, direction, ballpark and
        month. Among {summary.qualified} hitters with {summary.qualified_air}+ balls in the air in {season}, one half of a season
        predicts the other at {summary.split_half.toFixed(2)}
        {Number.isFinite(summary.year_to_year) ? `, and one season predicts the next at ${summary.year_to_year.toFixed(2)}` : ""}. There is no
        bat tracking below the majors, so these hitters have carry but no swing physics.
      </p>
      <ParkCarry parks={summary.parks} />
      <div className="flex flex-wrap items-end gap-4">
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">Search</span>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search hitters"
            className="w-56 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="space-y-1 sm:hidden">
          <span className="block text-xs text-muted-foreground">Sort by</span>
          <select
            value={sortKey}
            onChange={(e) => {
              setSortKey(e.target.value as SortKey);
              setDir("desc");
              setPage(0);
            }}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </label>
        <span className="text-xs text-muted-foreground">{shown.length} hitters, {label} {season}</span>
        <Pager page={current} totalPages={totalPages} onPage={setPage} />
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="type-eyebrow text-muted-foreground">Hitter</TableHead>
              {COLUMNS.map((c) => (
                <TableHead key={c.key} className={cn("whitespace-nowrap text-right", !onPhone(c.key) && "hidden sm:table-cell")} aria-sort={c.key === sortKey ? (dir === "desc" ? "descending" : "ascending") : undefined}>
                  <button
                    type="button"
                    onClick={() => {
                      if (c.key === sortKey) setDir(dir === "desc" ? "asc" : "desc");
                      else {
                        setSortKey(c.key);
                        setDir("desc");
                      }
                      setPage(0);
                    }}
                    className={cn("type-eyebrow inline-flex items-center gap-1", c.key === sortKey ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                  >
                    {c.label}
                    {c.key === sortKey && <span aria-hidden="true">{dir === "desc" ? "▼" : "▲"}</span>}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map((r) => (
              <TableRow key={`${r.player_id}-${r.level}`}>
                <TableCell className="whitespace-nowrap">
                  <PlayerCell athleteId={String(r.player_id)} headshotUrl={mlbPlayerHeadshotUrl(r.player_id)} name={r.player_name}
                    team={r.team ?? "–"} position={null} logo={undefined} />
                </TableCell>
                {COLUMNS.map((c) => (
                  <TableCell key={c.key} className={cn("text-right font-mono tabular-nums", !onPhone(c.key) && "hidden sm:table-cell")}>{c.format(r[c.key])}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end">
        <Pager page={current} totalPages={totalPages} onPage={setPage} />
      </div>
    </div>
  );
}
