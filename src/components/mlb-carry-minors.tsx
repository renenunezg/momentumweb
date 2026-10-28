"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ParkCarry } from "@/components/mlb-carry-charts";
import { PlayerCell } from "@/components/player-cell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CarryMinorRow, MinorLevel, MinorSummary } from "@/lib/mlb-carry";
import { mlbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { cn, foldSearch } from "@/lib/utils";

const LEVELS: { key: MinorLevel; label: string }[] = [
  { key: "aaa", label: "Triple-A" },
  { key: "fsl", label: "Florida State League" },
];
const ROWS = 50;
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
  const [limit, setLimit] = useState(ROWS);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Level">
        {LEVELS.map((l) => (
          <button
            key={l.key}
            type="button"
            aria-pressed={level === l.key}
            onClick={() => setLevel(l.key)}
            className="rounded border border-border px-2 py-0.5 text-sm text-muted-foreground hover:text-foreground aria-pressed:border-foreground/50 aria-pressed:text-foreground"
          >
            {l.label}
          </button>
        ))}
      </div>
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
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search hitters"
            className="w-56 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <span className="text-xs text-muted-foreground">{shown.length} hitters, {label} {season}</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Hitter</TableHead>
              {COLUMNS.map((c) => (
                <TableHead key={c.key} className="whitespace-nowrap text-right" aria-sort={c.key === sortKey ? (dir === "desc" ? "descending" : "ascending") : undefined}>
                  <button
                    type="button"
                    onClick={() => {
                      if (c.key === sortKey) setDir(dir === "desc" ? "asc" : "desc");
                      else {
                        setSortKey(c.key);
                        setDir("desc");
                      }
                    }}
                    className={cn("inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider", c.key === sortKey ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                  >
                    {c.label}
                    {c.key === sortKey && <span aria-hidden="true">{dir === "desc" ? "▼" : "▲"}</span>}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.slice(0, limit).map((r) => (
              <TableRow key={`${r.player_id}-${r.level}`}>
                <TableCell className="whitespace-nowrap">
                  <PlayerCell athleteId={String(r.player_id)} headshotUrl={mlbPlayerHeadshotUrl(r.player_id)} name={r.player_name}
                    team={r.team ?? "–"} position={null} logo={undefined} />
                </TableCell>
                {COLUMNS.map((c) => (
                  <TableCell key={c.key} className="text-right font-mono tabular-nums">{c.format(r[c.key])}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {shown.length > limit && (
        <button type="button" onClick={() => setLimit(limit + ROWS)} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Show {Math.min(ROWS, shown.length - limit)} more of {shown.length}
        </button>
      )}
    </div>
  );
}
