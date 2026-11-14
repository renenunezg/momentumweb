"use client";

import { Fragment, useDeferredValue, useMemo, useState } from "react";
import { InfoTip } from "@/components/info-tip";
import { Pager } from "@/components/pager";
import { PositionLeaderTabs, surname, type PositionLeader } from "@/components/position-leader-tabs";
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
const ARSENAL_TIP =
  "His pitch types, each as wide as its share of his pitches and shaded by its runs per 100: green saved runs, red cost them. Gray is the pitches thrown too rarely to list.";

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
// A season total carries several runs of sampling noise and a rate several tenths, so neither shows more.
const runs = (v: number) => formatSigned(v, 0);
const rate = (v: number) => formatSigned(v, 1);
const RUNS: Column = {
  key: "runs", label: "Runs", lowerIsBetter: true, phone: true, format: runs,
  tip: "Runs against the league average, with each pitch valued at its average over bases and outs, contact valued by how it was hit, and park, hitter and season removed. Negative is better for the pitcher.",
};
const PER_100: Column = {
  key: "per_100", label: "Per 100", lowerIsBetter: true, phone: true, format: rate,
  tip: "Runs per 100 pitches.",
};
const COLUMNS: Record<View, Column[]> = {
  pitchers: [
    { key: "pitches", label: "Pitches", tip: "Pitches thrown this season.", format: count },
    { key: "raw_runs", label: "Raw", lowerIsBetter: true, format: runs, tip: "Runs as they happened: actual results on contact, in the bases and outs each pitch was thrown in, with no adjustments." },
    { key: "context_runs", label: "In context", lowerIsBetter: true, format: runs, tip: "Adjusted runs with each pitch valued in the bases and outs it was actually thrown in." },
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

// Red for a pitch that cost runs and green for one that saved them, at a strength where `scale` runs per 100 is full.
function runShade(v: number, scale: number) {
  const strength = Math.min(1, Math.abs(v) / scale);
  return `color-mix(in oklch, ${v > 0 ? "var(--negative)" : "var(--positive)"} ${Math.round(12 + 78 * strength)}%, var(--background))`;
}

// A pitcher's mix: each listed pitch type as wide as its usage and shaded by its runs per 100. Types below the listing
// minimum are the gray remainder.
function ArsenalBar({ arsenal, scale, className }: { arsenal: PitchTypeValueRow[]; scale: number; className?: string }) {
  const label = arsenal.map((t) => `${pitchName(t.pitch_type)} ${Math.round(100 * t.usage)}%, ${formatSigned(per100(t), 1)} per 100`).join("; ");
  return (
    <span role="img" aria-label={label || "No pitch type listed"} title={label} className={cn("flex h-5 overflow-hidden rounded-[3px] bg-muted", className)}>
      {arsenal.map((t) => (
        <span
          key={t.pitch_type}
          style={{ width: `${100 * t.usage}%`, backgroundColor: runShade(per100(t), scale) }}
          className="flex min-w-0 items-center justify-center border-r border-background font-mono text-[10px] font-semibold text-foreground last:border-r-0"
        >
          {t.usage >= 0.12 && t.pitch_type}
        </span>
      ))}
    </span>
  );
}

function tone(v: number) {
  const rounded = Math.round(v);
  return rounded < 0 ? "text-positive" : rounded > 0 ? "text-negative" : undefined;
}

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
  const [pitchType, setPitchType] = useState<string | null>(null);
  const search = useDeferredValue(foldSearch(query.trim()));

  // Each pitcher's listed pitch types, most used first, and the shade scale: the 90th percentile of every listed
  // pitch type's runs per 100, so a few extremes do not wash out the rest.
  const { arsenals, scale } = useMemo(() => {
    const arsenals = new Map<number, PitchTypeValueRow[]>();
    for (const t of types) arsenals.set(t.player_id, [...(arsenals.get(t.player_id) ?? []), t]);
    for (const list of arsenals.values()) list.sort((a, b) => b.usage - a.usage);
    const sizes = types.map((t) => Math.abs(per100(t))).sort((a, b) => a - b);
    return { arsenals, scale: Math.max(0.5, sizes[Math.floor(0.9 * (sizes.length - 1))] ?? 1) };
  }, [types]);

  // The pitcher whose pitch of each type saved the most runs, over the sample the pitch-type view opens on, for the
  // types thrown most across the league.
  const leaderFloor = openingMinimum("types");
  const pitchLeaders = useMemo(() => {
    const thrown = new Map<string, number>();
    const best = new Map<string, PitchTypeValueRow>();
    for (const t of types) {
      thrown.set(t.pitch_type, (thrown.get(t.pitch_type) ?? 0) + t.pitches);
      if (t.pitches >= leaderFloor && t.runs < (best.get(t.pitch_type)?.runs ?? Infinity)) best.set(t.pitch_type, t);
    }
    const who = new Map(pitchers.map((p) => [p.player_id, p]));
    const codes = [...best.keys()].sort((a, b) => (thrown.get(b) ?? 0) - (thrown.get(a) ?? 0)).slice(0, 10);
    const most = Math.max(0, ...codes.map((code) => -(best.get(code)?.runs ?? 0)));
    return codes.map((code) => {
      const t = best.get(code)!;
      const p = who.get(t.player_id);
      const name = p?.player_name ?? String(t.player_id);
      const leader: PositionLeader = {
        name,
        short: surname(name),
        headshotUrl: mlbPlayerHeadshotUrl(t.player_id),
        stat: runs(t.runs),
        fill: most > 0 ? Math.max(0, (-t.runs / most) * 100) : null,
        tone: t.runs <= 0 ? "positive" : "destructive",
      };
      return { key: code, label: pitchName(code), leader };
    });
  }, [types, pitchers, leaderFloor]);

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
    const filtered = all[view].filter(
      (r) =>
        (r.values.pitches ?? 0) >= minimum &&
        (!search || foldSearch(r.player_name).includes(search)) &&
        (view !== "types" || pitchType == null || r.pitch_type === pitchType),
    );
    return filtered.sort((a, b) => {
      const diff = (a.values[sortKey] ?? 0) - (b.values[sortKey] ?? 0);
      return ascending ? diff : -diff;
    });
  }, [all, view, minimum, search, sortKey, ascending, pitchType]);

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
    setPitchType(null);
    setMinimum(openingMinimum(next));
    setSortKey("runs");
    setAscending(true);
    setPage(0);
  };
  // A pitch tile opens the pitch-type view on that pitch; choosing it again shows every pitch type.
  const choosePitch = (code: string) => {
    if (view !== "types") show("types");
    setPitchType(view === "types" && pitchType === code ? null : code);
    setPage(0);
  };
  // Phones keep runs, the rate and whatever the board is sorted by.
  const onPhone = (c: Column) => c.phone || c.key === sortKey;

  return (
    <div className="space-y-section">
    <div className="space-y-2">
      <p className="type-eyebrow text-muted-foreground">Best of each pitch, {count(leaderFloor)}+ thrown</p>
      <PositionLeaderTabs label="Pitch type" options={pitchLeaders} value={view === "types" ? pitchType : null} onChange={choosePitch} />
    </div>
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
          {rows.length} {view === "pitchers" ? "pitchers" : pitchType ? `${pitchName(pitchType).toLowerCase()}s` : "pitch types"}, {season}
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
            {view === "pitchers" && (
              <TableHead className="hidden pl-4 md:table-cell">
                <span className="type-eyebrow inline-flex items-center gap-1 text-muted-foreground">
                  Arsenal <InfoTip text={ARSENAL_TIP} label="What is the arsenal bar?" />
                </span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map((r) => (
            <Fragment key={r.key}>
            <TableRow className={cn(view === "pitchers" && "max-md:border-b-0")}>
              <TableCell className="max-w-0 w-full">
                <PlayerCell athleteId={String(r.player_id)} headshotUrl={mlbPlayerHeadshotUrl(r.player_id)} name={r.player_name}
                  team={r.team} position={r.pitch_type ? pitchName(r.pitch_type) : null} logo={mlbTeamIdentity(r.team)} />
              </TableCell>
              {columns.map((c) => {
                const v = r.values[c.key];
                return (
                  <TableCell key={c.key} className={cn("whitespace-nowrap text-right font-mono tabular-nums", !onPhone(c) && "hidden sm:table-cell", v != null && c.lowerIsBetter && tone(v))}>
                    {v == null ? "–" : c.format(v)}
                  </TableCell>
                );
              })}
              {view === "pitchers" && (
                <TableCell className="hidden pl-4 md:table-cell">
                  <ArsenalBar arsenal={arsenals.get(r.player_id) ?? []} scale={scale} className="w-56 lg:w-72" />
                </TableCell>
              )}
            </TableRow>
            {/* Below the arsenal column's width the bar takes its own line under the pitcher. */}
            {view === "pitchers" && (
              <TableRow className="hover:bg-transparent md:hidden">
                <TableCell colSpan={columns.length + 2} className="pt-0 pb-3">
                  <ArsenalBar arsenal={arsenals.get(r.player_id) ?? []} scale={scale} />
                </TableCell>
              </TableRow>
            )}
            </Fragment>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end">
        <Pager page={current} totalPages={totalPages} onPage={setPage} />
      </div>
    </div>
    </div>
  );
}
