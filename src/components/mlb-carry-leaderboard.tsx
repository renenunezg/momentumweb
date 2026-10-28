"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { InfoTip } from "@/components/info-tip";
import { PlayerCell } from "@/components/player-cell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { slashLine, swingType, type CarryHitterRow, type LeaderboardStudy } from "@/lib/mlb-carry";
import { mlbTeamIdentity } from "@/lib/mlb-teams";
import { mlbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { cn, foldSearch } from "@/lib/utils";

type SortKey = "carry" | "physics" | "unexplained" | "backspin" | "tilt" | "attack" | "bat_speed" | "n_air";
const ROWS = 50;

const COLUMNS: { key: SortKey; label: string; tip: string; format: (v: number) => string }[] = [
  { key: "n_air", label: "Air balls", tip: "Balls hit in the air (10 to 50 degrees, 90+ mph) this season.", format: (v) => v.toFixed(0) },
  { key: "carry", label: "Carry", tip: "Average feet beyond the league distance for the same exit velocity, launch angle, direction, ballpark and month.", format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}` },
  { key: "physics", label: "Swing physics", tip: "The part of his carry the collision and flight physics of his measured swing explains.", format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}` },
  { key: "unexplained", label: "Unexplained", tip: "Carry minus swing physics.", format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}` },
  { key: "backspin", label: "Backspin", tip: "Estimated backspin relative to the league at the same launch angle, in rpm. Relative only: public data cannot pin the absolute level.", format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}` },
  { key: "tilt", label: "Tilt", tip: "Swing path tilt at a belt-high pitch. Lower is a flatter swing plane.", format: (v) => `${v.toFixed(0)}°` },
  { key: "attack", label: "Attack", tip: "Attack angle at a belt-high pitch: how steeply the barrel rises at contact.", format: (v) => `${v.toFixed(0)}°` },
  { key: "bat_speed", label: "Bat speed", tip: "Average bat speed (mph) on competitive swings: the fastest 90% of his tracked swings, as Baseball Savant defines them.", format: (v) => v.toFixed(1) },
];

function value(row: CarryHitterRow, key: SortKey): number | null {
  if (key === "unexplained") return row.physics == null ? null : row.carry - row.physics;
  return row[key];
}

export function CarryLeaderboard({ hitters, study }: { hitters: CarryHitterRow[]; study: LeaderboardStudy }) {
  const [sortKey, setSortKey] = useState<SortKey>("carry");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [query, setQuery] = useState("");
  const [minAir, setMinAir] = useState(80);
  const [limit, setLimit] = useState(ROWS);
  const search = useDeferredValue(foldSearch(query.trim()));

  const rows = useMemo(() => {
    const filtered = hitters.filter((h) => h.n_air >= minAir && (!search || foldSearch(h.player_name).includes(search)));
    return filtered.sort((a, b) => {
      const va = value(a, sortKey);
      const vb = value(b, sortKey);
      if (va == null) return 1;
      if (vb == null) return -1;
      return dir === "desc" ? vb - va : va - vb;
    });
  }, [hitters, minAir, search, sortKey, dir]);

  const onSort = (key: SortKey) => {
    if (key === sortKey) setDir(dir === "desc" ? "asc" : "desc");
    else {
      setSortKey(key);
      setDir("desc");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-4">
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">Search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Junior Caminero"
            className="w-56 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">Minimum air balls</span>
          <select value={minAir} onChange={(e) => setMinAir(Number(e.target.value))} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm">
            {[50, 80, 120].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <span className="text-xs text-muted-foreground">{rows.length} hitters, {study.season}</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Hitter</TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Swing</TableHead>
              {COLUMNS.map((c) => (
                <TableHead key={c.key} className="whitespace-nowrap text-right" aria-sort={c.key === sortKey ? (dir === "desc" ? "descending" : "ascending") : undefined}>
                  <button
                    type="button"
                    onClick={() => onSort(c.key)}
                    className={cn("inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider", c.key === sortKey ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                  >
                    {c.label}
                    {c.key === sortKey && <span aria-hidden="true">{dir === "desc" ? "▼" : "▲"}</span>}
                  </button>
                  <InfoTip text={c.tip} label={`What is ${c.label}?`} className="ml-1" />
                </TableHead>
              ))}
              <TableHead className="text-right font-mono text-[11px] uppercase tracking-wider text-muted-foreground">HR</TableHead>
              <TableHead className="text-right font-mono text-[11px] uppercase tracking-wider text-muted-foreground">OPS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, limit).map((h) => {
              const line = slashLine(h);
              return (
                <TableRow key={h.player_id}>
                  <TableCell className="whitespace-nowrap">
                    <PlayerCell athleteId={String(h.player_id)} headshotUrl={mlbPlayerHeadshotUrl(h.player_id)} name={h.player_name}
                      team={h.team ?? "–"} position={null} logo={mlbTeamIdentity(h.team)} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {[swingType(study.swing_types.tilt, h.tilt), swingType(study.swing_types.attack, h.attack)].filter(Boolean).join(", ") || "–"}
                  </TableCell>
                  {COLUMNS.map((c) => {
                    const v = value(h, c.key);
                    return (
                      <TableCell key={c.key} className="text-right font-mono tabular-nums">
                        {v == null ? "–" : c.format(v)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right font-mono tabular-nums">{h.hr}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{line.ops.toFixed(3).replace(/^0/, "")}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {rows.length > limit && (
        <button type="button" onClick={() => setLimit(limit + ROWS)} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Show {Math.min(ROWS, rows.length - limit)} more of {rows.length}
        </button>
      )}
    </div>
  );
}
