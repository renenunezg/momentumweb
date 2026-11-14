"use client";

import { Fragment, useDeferredValue, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { InfoTip } from "@/components/info-tip";
import { Pager } from "@/components/pager";
import { PositionLeaderTabs, surname, type PositionLeader } from "@/components/position-leader-tabs";
import { PlayerCell } from "@/components/player-cell";
import { RankBadge } from "@/components/rank-badge";
import { ToggleGroup } from "@/components/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pitchName, runsSaved as saved, savedPer100, type PitchTypeValueRow, type PitchValueRow } from "@/lib/mlb-pitch-value";
import { mlbTeamIdentity } from "@/lib/mlb-teams";
import { mlbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { cn, foldSearch, formatSigned } from "@/lib/utils";

type View = "pitchers" | "types";
type SortKey = "pitches" | "usage" | "saved" | "per_100";
const PAGE_SIZE = 25;
const VIEWS: { key: View; label: string }[] = [
  { key: "pitchers", label: "Pitchers" },
  { key: "types", label: "Pitch types" },
];

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
  // Colored green when it saved runs and red when it cost them.
  signed?: boolean;
  phone?: boolean;
}

const count = (v: number) => v.toLocaleString("en-US");
// A season total carries several runs of sampling noise and a rate several tenths, so neither shows more.
const runs = (v: number) => formatSigned(v, 0);
const rate = (v: number) => formatSigned(v, 1);

const SAVED: Column = {
  key: "saved", label: "Runs saved", signed: true, phone: true, format: runs,
  tip: "Runs saved against an average pitcher. Positive is better. Contact is valued by how it was hit, and the park, the hitter faced, the season's scoring level and the bases and outs are taken out.",
};
const PER_100: Column = { key: "per_100", label: "Per 100", signed: true, phone: true, format: rate, tip: "Runs saved per 100 pitches." };
const COLUMNS: Record<View, Column[]> = {
  pitchers: [{ key: "pitches", label: "Pitches", tip: "Pitches thrown this season.", format: count }, SAVED, PER_100],
  types: [
    { key: "usage", label: "Usage", tip: "Share of his pitches this season.", format: (v) => `${Math.round(100 * v)}%` },
    { key: "pitches", label: "Pitches", tip: "Pitches of this type thrown this season.", format: count },
    SAVED,
    PER_100,
  ],
};

function tone(v: number, digits: number) {
  const rounded = Number(v.toFixed(digits));
  return rounded > 0 ? "text-positive" : rounded < 0 ? "text-negative" : undefined;
}

// Green for a pitch that saved runs and red for one that cost them, at a strength where `scale` runs per 100 is full.
function runShade(v: number, scale: number) {
  const strength = Math.min(1, Math.abs(v) / scale);
  return `color-mix(in oklch, ${v >= 0 ? "var(--positive)" : "var(--negative)"} ${Math.round(12 + 78 * strength)}%, var(--background))`;
}

// A pitcher's mix: each listed pitch type as wide as its usage and shaded by its runs saved per 100. Types below the
// listing minimum are the gray remainder.
function ArsenalBar({ arsenal, scale, className }: { arsenal: PitchTypeValueRow[]; scale: number; className?: string }) {
  const label = arsenal.map((t) => `${pitchName(t.pitch_type)} ${Math.round(100 * t.usage)}%, ${rate(savedPer100(t))} per 100`).join("; ");
  return (
    <span role="img" aria-label={label || "No pitch type listed"} title={label} className={cn("flex h-5 overflow-hidden rounded-[3px] bg-muted", className)}>
      {arsenal.map((t) => (
        <span
          key={t.pitch_type}
          style={{ width: `${100 * t.usage}%`, backgroundColor: runShade(savedPer100(t), scale) }}
          className="flex min-w-0 items-center justify-center border-r border-background font-mono text-[10px] font-semibold text-foreground last:border-r-0"
        >
          {t.usage >= 0.12 && t.pitch_type}
        </span>
      ))}
    </span>
  );
}

function Swatch({ color }: { color: string }) {
  return <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: color }} />;
}

// Everything the page knows about one pitcher: each pitch he throws, and how the adjustments move his total.
function PitcherBreakdown({
  pitcher,
  arsenal,
  scale,
  ranks,
  floor,
}: {
  pitcher: PitchValueRow;
  arsenal: PitchTypeValueRow[];
  scale: number;
  ranks: Map<string, { place: number; of: number }>;
  // The fewest pitches of a type that are listed, and so ranked.
  floor: number;
}) {
  const listed = arsenal.reduce((sum, t) => sum + t.usage, 0);
  const steps: [string, string, number][] = [
    ["As it happened", "Actual results, in the bases and outs each pitch was thrown in.", saved({ runs: pitcher.raw_runs })],
    ["Contact by how it was hit", "Balls in play valued by exit velocity and launch angle, not by the fielders; park, hitter and season taken out.", saved({ runs: pitcher.context_runs })],
    ["Bases and outs taken out", "Each pitch valued at its average over bases and outs. This is his Runs saved.", saved(pitcher)],
  ];
  return (
    <div className="grid gap-6 py-2 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section className="min-w-0 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">His pitches</h3>
        <ArsenalBar arsenal={arsenal} scale={scale} className="h-6" />
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="py-1 text-left font-normal">Pitch</th>
              <th className="py-1 text-right font-normal">Usage</th>
              <th className="hidden py-1 text-right font-normal sm:table-cell">Pitches</th>
              <th className="py-1 text-right font-normal">Saved</th>
              <th className="py-1 text-right font-normal">Per 100</th>
              <th className="py-1 pl-3 text-right font-normal">Rank</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {arsenal.map((t) => {
              const rank = ranks.get(`${t.player_id}-${t.pitch_type}`);
              return (
              <tr key={t.pitch_type} className="border-t border-border/60">
                <td className="py-1">
                  <span className="inline-flex items-center gap-2">
                    <Swatch color={runShade(savedPer100(t), scale)} />
                    {pitchName(t.pitch_type)}
                  </span>
                </td>
                <td className="py-1 text-right">{Math.round(100 * t.usage)}%</td>
                <td className="hidden py-1 text-right text-muted-foreground sm:table-cell">{count(t.pitches)}</td>
                <td className={cn("py-1 text-right", tone(saved(t), 0))}>{runs(saved(t))}</td>
                <td className={cn("py-1 text-right", tone(savedPer100(t), 1))}>{rate(savedPer100(t))}</td>
                <td className="py-1 pl-3 text-right">
                  {rank ? <RankBadge place={rank.place} of={rank.of} /> : <span className="text-xs text-muted-foreground">–</span>}
                </td>
              </tr>
              );
            })}
            {listed < 0.995 && (
              <tr className="border-t border-border/60 text-muted-foreground">
                <td className="py-1">
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-[2px] bg-muted" />
                    Others, too few to list
                  </span>
                </td>
                <td className="py-1 text-right">{Math.round(100 * (1 - listed))}%</td>
                <td className="hidden sm:table-cell" />
                <td />
                <td />
                <td />
              </tr>
            )}
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground">
          Rank is by runs saved among every pitcher&apos;s pitch of the same type thrown {count(floor)}+ times.
        </p>
      </section>
      <section className="min-w-0 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">From what happened to Runs saved</h3>
        <ol className="space-y-2 text-sm">
          {steps.map(([label, help, value]) => (
            <li key={label} className="flex items-start justify-between gap-4 border-t border-border/60 pt-2 first:border-t-0 first:pt-0">
              <span className="min-w-0">
                <span className="block font-medium">{label}</span>
                <span className="block text-xs leading-snug text-muted-foreground">{help}</span>
              </span>
              <span className={cn("shrink-0 font-mono tabular-nums", tone(value, 0))}>{runs(value)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
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
  const [sortKey, setSortKey] = useState<SortKey>("saved");
  const [ascending, setAscending] = useState(false);
  const [query, setQuery] = useState("");
  const [minimum, setMinimum] = useState(() => openingMinimum("pitchers"));
  const [page, setPage] = useState(0);
  const [pitchType, setPitchType] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const search = useDeferredValue(foldSearch(query.trim()));

  const who = useMemo(() => new Map(pitchers.map((p) => [p.player_id, p])), [pitchers]);
  // Each pitcher's listed pitch types, most used first, and the shade scale: the 90th percentile of every listed
  // pitch type's runs per 100, so a few extremes do not wash out the rest.
  const { arsenals, scale } = useMemo(() => {
    const arsenals = new Map<number, PitchTypeValueRow[]>();
    for (const t of types) arsenals.set(t.player_id, [...(arsenals.get(t.player_id) ?? []), t]);
    for (const list of arsenals.values()) list.sort((a, b) => b.usage - a.usage);
    const sizes = types.map((t) => Math.abs(savedPer100(t))).sort((a, b) => a - b);
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
      if (t.pitches >= leaderFloor && saved(t) > (best.has(t.pitch_type) ? saved(best.get(t.pitch_type)!) : -Infinity)) best.set(t.pitch_type, t);
    }
    const codes = [...best.keys()].sort((a, b) => (thrown.get(b) ?? 0) - (thrown.get(a) ?? 0)).slice(0, 10);
    return codes.map((code) => {
      const t = best.get(code)!;
      const name = who.get(t.player_id)?.player_name ?? String(t.player_id);
      const leader: PositionLeader = {
        name,
        short: surname(name),
        headshotUrl: mlbPlayerHeadshotUrl(t.player_id),
        stat: runs(saved(t)),
        tone: saved(t) >= 0 ? "positive" : "destructive",
      };
      return { key: code, label: pitchName(code), leader };
    });
  }, [types, who, leaderFloor]);

  // Where each pitcher's pitch stands among every listed pitch of the same type, by runs saved. A total, not a rate,
  // so a pitch thrown a few hundred times cannot reach the top on noise alone, and every listed pitch is ranked.
  const pitchRanks = useMemo(() => {
    const byType = new Map<string, PitchTypeValueRow[]>();
    for (const t of types) byType.set(t.pitch_type, [...(byType.get(t.pitch_type) ?? []), t]);
    const ranks = new Map<string, { place: number; of: number }>();
    for (const list of byType.values()) {
      list.sort((a, b) => saved(b) - saved(a));
      list.forEach((t, i) => ranks.set(`${t.player_id}-${t.pitch_type}`, { place: i + 1, of: list.length }));
    }
    return ranks;
  }, [types]);

  const all = useMemo<Record<View, Row[]>>(() => ({
    pitchers: pitchers.map((p) => ({
      key: String(p.player_id), player_id: p.player_id, player_name: p.player_name, team: p.team, pitch_type: null,
      values: { pitches: p.pitches, saved: saved(p), per_100: savedPer100(p) },
    })),
    types: types.flatMap((t) => {
      const p = who.get(t.player_id);
      if (!p) return [];
      return [{
        key: `${t.player_id}-${t.pitch_type}`, player_id: t.player_id, player_name: p.player_name, team: p.team, pitch_type: t.pitch_type,
        values: { pitches: t.pitches, usage: t.usage, saved: saved(t), per_100: savedPer100(t) },
      }];
    }),
  }), [pitchers, types, who]);

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
      setAscending(false);
    }
    setPage(0);
  };
  const show = (next: View) => {
    setView(next);
    setPitchType(null);
    setMinimum(openingMinimum(next));
    setSortKey("saved");
    setAscending(false);
    setPage(0);
  };
  // A pitch tile opens the pitch-type view on that pitch; choosing it again shows every pitch type.
  const choosePitch = (code: string) => {
    if (view !== "types") show("types");
    setPitchType(view === "types" && pitchType === code ? null : code);
    setPage(0);
  };
  // Phones keep runs saved, the rate and whatever the board is sorted by.
  const onPhone = (c: Column) => c.phone || c.key === sortKey;
  const span = columns.length + (view === "pitchers" ? 4 : 3);

  return (
    <div className="space-y-section">
    <div className="space-y-2">
      <p className="type-eyebrow text-muted-foreground">Best of each pitch, {count(leaderFloor)}+ thrown. Tap one to rank that pitch.</p>
      <PositionLeaderTabs label="Pitch type" options={pitchLeaders} value={view === "types" ? pitchType : null} onChange={choosePitch} />
    </div>
    <div className="space-y-3">
      <ToggleGroup label="Leaderboard view" options={VIEWS} value={view} onChange={show} />
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
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Swatch color={runShade(1, 1)} /> Saved runs</span>
        <span className="inline-flex items-center gap-1.5"><Swatch color={runShade(-1, 1)} /> Cost runs</span>
        <span>Tap a pitcher for each of his pitches.</span>
      </p>
      <Table density="compact">
        <TableHeader>
          <TableRow>
            <TableHead className="hidden w-8 text-muted-foreground sm:table-cell">#</TableHead>
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
                <span className="type-eyebrow text-muted-foreground">Pitch mix</span>
              </TableHead>
            )}
            <TableHead className="w-6"><span className="sr-only">Details</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={span} className="py-6 text-center font-sans text-muted-foreground">No pitchers match.</TableCell>
            </TableRow>
          )}
          {rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map((r, i) => {
            const expanded = open === r.key;
            const panelId = `pitch-value-${r.key}`;
            const pitcher = who.get(r.player_id);
            return (
              <Fragment key={r.key}>
                <TableRow onClick={() => setOpen(expanded ? null : r.key)} className={cn("cursor-pointer", expanded && "bg-muted/40")}>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{current * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="w-full max-w-0">
                    <PlayerCell athleteId={String(r.player_id)} headshotUrl={mlbPlayerHeadshotUrl(r.player_id)} name={r.player_name}
                      team={r.team} position={r.pitch_type ? pitchName(r.pitch_type) : null} logo={mlbTeamIdentity(r.team)} />
                  </TableCell>
                  {columns.map((c) => {
                    const v = r.values[c.key];
                    return (
                      <TableCell key={c.key} className={cn("whitespace-nowrap text-right font-mono tabular-nums", !onPhone(c) && "hidden sm:table-cell", v != null && c.signed && tone(v, c.key === "per_100" ? 1 : 0))}>
                        {v == null ? "–" : c.format(v)}
                      </TableCell>
                    );
                  })}
                  {view === "pitchers" && (
                    <TableCell className="hidden pl-4 md:table-cell">
                      <ArsenalBar arsenal={arsenals.get(r.player_id) ?? []} scale={scale} className="w-56 lg:w-72" />
                    </TableCell>
                  )}
                  <TableCell className="pl-0 text-right">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      aria-label={`${expanded ? "Hide" : "Show"} pitch breakdown for ${r.player_name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(expanded ? null : r.key);
                      }}
                      className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform", expanded && "rotate-180")} />
                    </button>
                  </TableCell>
                </TableRow>
                {expanded && pitcher && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell id={panelId} colSpan={span} className="whitespace-normal bg-muted/20">
                      <PitcherBreakdown pitcher={pitcher} arsenal={arsenals.get(r.player_id) ?? []} scale={scale} ranks={pitchRanks} floor={minimums.types} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex justify-end">
        <Pager page={current} totalPages={totalPages} onPage={setPage} />
      </div>
    </div>
    </div>
  );
}
