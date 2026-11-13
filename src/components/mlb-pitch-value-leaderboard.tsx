"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { InfoTip } from "@/components/info-tip";
import { Pager } from "@/components/pager";
import { PlayerCell } from "@/components/player-cell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { per100, pitchName, type PitchTypeValueRow, type PitchValueRow } from "@/lib/mlb-pitch-value";
import { mlbTeamIdentity } from "@/lib/mlb-teams";
import { mlbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { TAB_ITEM, TAB_LIST, TAB_OFF, TAB_ON } from "@/lib/tab-styles";
import { cn, foldSearch, formatSigned } from "@/lib/utils";

type View = "pitchers" | "types";
type SortKey = "pitches" | "usage" | "raw_runs" | "context_runs" | "runs" | "per_100";
const PAGE_SIZE = 25;

interface Row {
  key: string;
  player_id: number;
  player_name: string;
  team: string;
  pitch_type: string | null;
  values: Partial<Record<SortKey, number>>;
}

interface Column {
  key: SortKey;
  label: string;
  tip: string;
  format: (v: number) => string;
  // Lower is better for the pitcher, so these open sorted ascending.
  lowerIsBetter?: boolean;
  phone?: boolean;
}

const count = (v: number) => v.toLocaleString("en-US");
const RUNS: Column = {
  key: "runs", label: "Runs", lowerIsBetter: true, phone: true, format: (v) => formatSigned(v, 1),
  tip: "Runs against the league average, with each pitch valued at its average over bases and outs, contact valued by how it was hit, and park, hitter and season removed. Negative is better for the pitcher.",
};
const PER_100: Column = {
  key: "per_100", label: "Per 100", lowerIsBetter: true, phone: true, format: (v) => formatSigned(v, 2),
  tip: "Runs per 100 pitches.",
};
const COLUMNS: Record<View, Column[]> = {
  pitchers: [
    { key: "pitches", label: "Pitches", tip: "Pitches thrown this season.", format: count },
    { key: "raw_runs", label: "Raw", lowerIsBetter: true, format: (v) => formatSigned(v, 1), tip: "Runs as they happened: actual results on contact, in the bases and outs each pitch was thrown in, with no adjustments." },
    { key: "context_runs", label: "In context", lowerIsBetter: true, format: (v) => formatSigned(v, 1), tip: "Adjusted runs with each pitch valued in the bases and outs it was actually thrown in." },
    RUNS,
    PER_100,
  ],
  types: [
    { key: "usage", label: "Usage", tip: "Share of his pitches this season.", format: (v) => `${Math.round(100 * v)}%` },
    { key: "pitches", label: "Pitches", tip: "Pitches of this type thrown this season.", format: count },
    RUNS,
    PER_100,
  ],
};

export function PitchValueLeaderboard({
  pitchers,
  types,
  season,
  minimums,
}: {
  pitchers: PitchValueRow[];
  types: PitchTypeValueRow[];
  season: number;
  // The smallest sample published for each view.
  minimums: Record<View, number>;
}) {
  // A pitch type's value over a few hundred pitches is mostly sampling noise, so that view opens on a larger sample.
  const choices = useMemo<Record<View, number[]>>(
    () => ({
      pitchers: [minimums.pitchers, 2 * minimums.pitchers, 4 * minimums.pitchers],
      types: [minimums.types, 2 * minimums.types, 4 * minimums.types],
    }),
    [minimums],
  );
  const openingMinimum = (view: View) => choices[view][view === "types" ? 2 : 1];

  const [view, setView] = useState<View>("pitchers");
  const [sortKey, setSortKey] = useState<SortKey>("runs");
  const [ascending, setAscending] = useState(true);
  const [query, setQuery] = useState("");
  const [minimum, setMinimum] = useState(() => openingMinimum("pitchers"));
  const [page, setPage] = useState(0);
  const search = useDeferredValue(foldSearch(query.trim()));

  const all = useMemo<Record<View, Row[]>>(() => {
    const who = new Map(pitchers.map((p) => [p.player_id, p]));
    return {
      pitchers: pitchers.map((p) => ({
        key: String(p.player_id), player_id: p.player_id, player_name: p.player_name, team: p.team, pitch_type: null,
        values: { pitches: p.pitches, raw_runs: p.raw_runs, context_runs: p.context_runs, runs: p.runs, per_100: per100(p) },
      })),
      types: types.flatMap((t) => {
        const p = who.get(t.player_id);
        if (!p) return [];
        return [{
          key: `${t.player_id}-${t.pitch_type}`, player_id: t.player_id, player_name: p.player_name, team: p.team, pitch_type: t.pitch_type,
          values: { pitches: t.pitches, usage: t.usage, runs: t.runs, per_100: per100(t) },
        }];
      }),
    };
  }, [pitchers, types]);

  const columns = COLUMNS[view];
  const rows = useMemo(() => {
    const filtered = all[view].filter((r) => (r.values.pitches ?? 0) >= minimum && (!search || foldSearch(r.player_name).includes(search)));
    return filtered.sort((a, b) => {
      const diff = (a.values[sortKey] ?? 0) - (b.values[sortKey] ?? 0);
      return ascending ? diff : -diff;
    });
  }, [all, view, minimum, search, sortKey, ascending]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, totalPages - 1);

  const sortBy = (key: SortKey) => {
    if (key === sortKey) setAscending(!ascending);
    else {
      setSortKey(key);
      setAscending(columns.find((c) => c.key === key)?.lowerIsBetter ?? false);
    }
    setPage(0);
  };
  const show = (next: View) => {
    setView(next);
    setMinimum(openingMinimum(next));
    setSortKey("runs");
    setAscending(true);
    setPage(0);
  };
  // Phones keep runs, the rate and whatever the board is sorted by.
  const onPhone = (c: Column) => c.phone || c.key === sortKey;

  return (
    <div className="space-y-3">
      <div role="group" aria-label="Leaderboard view" className={TAB_LIST}>
        {([["pitchers", "Pitchers"], ["types", "Pitch types"]] as const).map(([key, label]) => (
          <button key={key} type="button" aria-pressed={view === key} onClick={() => show(key)} className={cn(TAB_ITEM, view === key ? TAB_ON : TAB_OFF)}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">Search</span>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Tarik Skubal"
            className="w-44 rounded-md border border-border bg-background px-2 py-1.5 text-sm sm:w-56"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">Minimum pitches</span>
          <select
            value={minimum}
            onChange={(e) => {
              setMinimum(Number(e.target.value));
              setPage(0);
            }}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            {choices[view].map((n) => <option key={n} value={n}>{count(n)}</option>)}
          </select>
        </label>
        <span className="text-xs text-muted-foreground">
          {rows.length} {view === "pitchers" ? "pitchers" : "pitch types"}, {season}
        </span>
        <Pager page={current} totalPages={totalPages} onPage={setPage} />
      </div>
      <Table density="compact">
        <TableHeader>
          <TableRow>
            <TableHead className="type-eyebrow text-muted-foreground">Pitcher</TableHead>
            {columns.map((c) => (
              <TableHead key={c.key} className={cn("whitespace-nowrap text-right", !onPhone(c) && "hidden sm:table-cell")} aria-sort={c.key === sortKey ? (ascending ? "ascending" : "descending") : undefined}>
                <button
                  type="button"
                  onClick={() => sortBy(c.key)}
                  className={cn("type-eyebrow inline-flex items-center gap-1", c.key === sortKey ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                >
                  {c.label}
                  {c.key === sortKey && <span aria-hidden="true">{ascending ? "▲" : "▼"}</span>}
                </button>
                <InfoTip text={c.tip} label={`What is ${c.label}?`} className="ml-1 hidden sm:inline-flex" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map((r) => (
            <TableRow key={r.key}>
              <TableCell className="max-w-0 w-full">
                <PlayerCell athleteId={String(r.player_id)} headshotUrl={mlbPlayerHeadshotUrl(r.player_id)} name={r.player_name}
                  team={r.team} position={r.pitch_type ? pitchName(r.pitch_type) : null} logo={mlbTeamIdentity(r.team)} />
              </TableCell>
              {columns.map((c) => {
                const v = r.values[c.key];
                return (
                  <TableCell key={c.key} className={cn("whitespace-nowrap text-right font-mono tabular-nums", !onPhone(c) && "hidden sm:table-cell")}>
                    {v == null ? "–" : c.format(v)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end">
        <Pager page={current} totalPages={totalPages} onPage={setPage} />
      </div>
    </div>
  );
}
