"use client";

import { Fragment, useDeferredValue, useMemo, useState } from "react";
import { InfoTip } from "@/components/info-tip";
import { BATTING_PART_FILL, BattingPartsBar, BattingPartsLegend, battingPartsExtent } from "@/components/mlb-batting-parts-bar";
import { BattingZoneMini, BattingZonePicker, type BattingZone } from "@/components/mlb-batting-zone-map";
import { Pager } from "@/components/pager";
import { PlayerCell } from "@/components/player-cell";
import { ToggleGroup } from "@/components/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BATTING_OPENING_PA, COUNT_SPLITS, PITCH_GROUP_SPLITS, ZONE_SPLITS, battingSplitLabel, battingTotal, formatCorrelation,
  type BattingHitter, type BattingPart, type BattingParts, type BattingSplit, type BattingSplitRepeat, type Interval,
} from "@/lib/mlb-batting-value";
import { mlbTeamIdentity } from "@/lib/mlb-teams";
import { mlbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { cn, foldSearch, formatSigned } from "@/lib/utils";

type View = "hitters" | "counts" | "pitches" | "zones";
type SplitView = Exclude<View, "hitters">;
type SortKey = "pa" | "pitches" | "runs" | "rate" | "rest" | "decision" | "contact" | "quality" | "calls";
// Below the large breakpoint the table shows three numeric columns: the totals or the three parts.
type ColumnSet = "totals" | "parts";
const PAGE_SIZE = 25;
const MINIMUMS = [200, 350, 500];

interface Row extends BattingParts {
  key: string;
  player_id: number;
  player_name: string;
  team: string;
  pa: number;
  values: Partial<Record<SortKey, number>>;
}

interface Column {
  key: SortKey;
  label: string;
  tip: string;
  format: (v: number) => string;
  // Digits a signed figure is colored at, so a value that rounds to zero stays neutral.
  signed?: number;
  set: ColumnSet;
  // Shown only from this width up, whichever set a phone is on.
  from?: "sm" | "lg";
  // A part's header carries its bar color, and a shorter label on a phone.
  part?: BattingPart;
  short?: string;
}

const count = (v: number) => v.toLocaleString("en-US");
// A season total carries several runs of sampling noise and a rate per 100 pitches several tenths, so neither shows more.
const runs = (v: number) => formatSigned(v, 0);
const rate = (v: number) => formatSigned(v, 1);

const PARTS: Column[] = [
  {
    key: "decision", label: "Decision", part: "decision", short: "Dec", set: "parts", signed: 0, format: runs,
    tip: "Swing or take: the value of his choice against the league's mix of swings and takes at the same pitch. Chasing costs runs here and laying off earns them.",
  },
  {
    key: "contact", label: "Contact", part: "contact", short: "Cont", set: "parts", signed: 0, format: runs,
    tip: "On swings: a miss, a foul or a ball in play against an average swing at the same pitch. Making more contact than the pitch calls for has no positive link to next season's runs, because contact hitters tend to hit the ball less hard. Read it as a style, not an edge on its own.",
  },
  {
    key: "quality", label: "Quality", part: "quality", short: "Qual", set: "parts", signed: 0, format: runs,
    tip: "On balls in play: what the exit velocity and launch angle were worth against the league's ball in play from the same pitch.",
  },
];
const RUNS: Column = {
  key: "runs", label: "Runs", set: "totals", signed: 0, format: runs,
  tip: "Decision plus Contact plus Quality: runs against the league average with the difficulty of every pitch taken out. Positive is better for the hitter. Each figure is rounded on its own, so the parts can miss the total by a run.",
};
const PER_100: Column = { key: "rate", label: "Per 100", set: "totals", signed: 1, format: rate, tip: "Runs per 100 pitches." };
const SPLIT_COLUMNS: Column[] = [
  { key: "pitches", label: "Pitches", set: "totals", format: count, tip: "Pitches he saw in this split this season." },
  RUNS,
  PER_100,
  ...PARTS,
];
const COLUMNS: Record<View, Column[]> = {
  hitters: [
    { key: "pa", label: "PA", set: "totals", format: count, tip: "Plate appearances this season." },
    RUNS,
    { key: "rate", label: "Per 600", set: "totals", signed: 0, format: runs, tip: "Runs per 600 plate appearances, about a full season." },
    ...PARTS,
    {
      key: "calls", label: "Calls", set: "totals", from: "lg", signed: 0, format: runs,
      tip: "Not credited: called strikes and hit batters on his takes against what the league model expected.",
    },
  ],
  counts: [
    { ...SPLIT_COLUMNS[0], from: "sm" },
    RUNS,
    PER_100,
    {
      key: "rest", label: "Vs rest", set: "totals", signed: 1, format: rate,
      tip: "Runs per 100 pitches in this count minus his runs per 100 on all his other pitches.",
    },
    ...PARTS,
  ],
  pitches: SPLIT_COLUMNS,
  zones: SPLIT_COLUMNS,
};

const VIEWS: { key: View; label: string }[] = [
  { key: "hitters", label: "Hitters" },
  { key: "counts", label: "Counts" },
  { key: "pitches", label: "Pitches" },
  { key: "zones", label: "Zones" },
];
const COLUMN_SETS: { key: ColumnSet; label: string }[] = [
  { key: "totals", label: "Totals" },
  { key: "parts", label: "Parts" },
];
const SPLIT_NOTES: Record<string, string> = {
  two_strikes: "Counts 0-2, 1-2, 2-2 and 3-2.",
  ahead: "Counts 1-0, 2-0, 3-0, 2-1 and 3-1.",
  first_pitch: "The 0-0 pitch.",
  heart: "The middle of the strike zone.",
  shadow: "The edges of the zone, just inside and just outside its border.",
  chase: "Off the plate, close enough to tempt a swing.",
  waste: "Far from the zone.",
};

const interval = ([value, low, high]: Interval) => `${formatCorrelation(value)} (${formatCorrelation(low)} to ${formatCorrelation(high)})`;

// What the study found about one split: how well it repeats, and whether it is more than the hitter's general level.
function repeatNote(found: BattingSplitRepeat) {
  const repeats = `A hitter's runs per 100 here repeat the next season at r = ${interval(found.repeat)}`;
  return found.vs_rest[1] > 0
    ? `${repeats}, and his gap to his other pitches at ${interval(found.vs_rest)}.`
    : `${repeats}. His gap to his other pitches is not shown to repeat, at ${interval(found.vs_rest)}, so read this as his general level.`;
}

function tone(value: number, digits: number) {
  const rounded = Number(value.toFixed(digits));
  return rounded > 0 ? "text-positive" : rounded < 0 ? "text-negative" : undefined;
}

export function BattingValueLeaderboard({
  hitters,
  splits,
  pitchTypes,
  repeats,
  season,
  minimumPa,
}: {
  hitters: BattingHitter[];
  splits: Record<string, BattingSplit[]>;
  // The pitch types the study lists, most seen first.
  pitchTypes: string[];
  repeats: Record<string, BattingSplitRepeat>;
  season: number;
  // The fewest plate appearances published.
  minimumPa: number;
}) {
  const minimums = useMemo(() => [minimumPa, ...MINIMUMS.filter((n) => n > minimumPa)], [minimumPa]);
  // Each view's splits in the sets they are chosen from: pitches have their groups, then their types.
  const options = useMemo<Record<SplitView, { label: string; options: { key: string; label: string }[] }[]>>(() => {
    const set = (label: string, codes: readonly string[]) => ({
      label,
      options: codes.filter((code) => splits[code]).map((code) => ({ key: code, label: battingSplitLabel(code) })),
    });
    return {
      counts: [set("Count", COUNT_SPLITS)],
      pitches: [set("Pitch group", PITCH_GROUP_SPLITS), set("Pitch type", pitchTypes)],
      zones: [set("Zone", ZONE_SPLITS)],
    };
  }, [splits, pitchTypes]);

  const [view, setView] = useState<View>("hitters");
  const [chosen, setChosen] = useState<Partial<Record<SplitView, string>>>({});
  const [sortKey, setSortKey] = useState<SortKey>("runs");
  const [ascending, setAscending] = useState(false);
  const [query, setQuery] = useState("");
  const [minimum, setMinimum] = useState(() => (minimums.includes(BATTING_OPENING_PA) ? BATTING_OPENING_PA : minimums[0]));
  const [page, setPage] = useState(0);
  const [phoneSet, setPhoneSet] = useState<ColumnSet>("totals");
  const search = useDeferredValue(foldSearch(query.trim()));

  const split = view === "hitters" ? null : (chosen[view] ?? options[view][0].options[0]?.key ?? null);
  const columns = COLUMNS[view];
  const zone = view === "zones" && split ? (split as BattingZone) : null;

  // Each hitter's runs per 100 pitches in every zone, and each zone's share of all the listed hitters' pitches.
  const zoneData = useMemo(() => {
    const rates = new Map<number, Partial<Record<BattingZone, number>>>();
    const shares: Partial<Record<BattingZone, number>> = {};
    const allPitches = hitters.reduce((sum, h) => sum + h.pitches, 0);
    for (const z of ZONE_SPLITS) {
      let pitchesHere = 0;
      for (const [playerId, pitches, decision, contact, quality] of splits[z] ?? []) {
        pitchesHere += pitches;
        if (pitches > 0) rates.set(playerId, { ...rates.get(playerId), [z]: (100 * (decision + contact + quality)) / pitches });
      }
      if (allPitches > 0 && splits[z]) shares[z] = pitchesHere / allPitches;
    }
    return { rates, shares };
  }, [hitters, splits]);

  const all = useMemo<Row[]>(() => {
    if (split == null) {
      return hitters.map((h) => {
        const total = battingTotal(h);
        return {
          key: String(h.player_id), player_id: h.player_id, player_name: h.player_name, team: h.team, pa: h.pa,
          decision: h.decision, contact: h.contact, quality: h.quality,
          values: { pa: h.pa, runs: total, rate: (600 * total) / h.pa, decision: h.decision, contact: h.contact, quality: h.quality, calls: h.calls },
        };
      });
    }
    const who = new Map(hitters.map((h) => [h.player_id, h]));
    return (splits[split] ?? []).flatMap(([playerId, pitches, decision, contact, quality]) => {
      const h = who.get(playerId);
      if (!h) return [];
      const total = decision + contact + quality;
      const per100 = (100 * total) / pitches;
      const otherPitches = h.pitches - pitches;
      return [{
        key: String(playerId), player_id: playerId, player_name: h.player_name, team: h.team, pa: h.pa, decision, contact, quality,
        values: {
          pitches, runs: total, rate: per100, decision, contact, quality,
          rest: otherPitches > 0 ? per100 - (100 * (battingTotal(h) - total)) / otherPitches : undefined,
        },
      }];
    });
  }, [hitters, splits, split]);

  // The bars share one scale across pages, sorts and searches, so it is set by everyone who clears the minimum.
  const qualified = useMemo(() => all.filter((r) => r.pa >= minimum), [all, minimum]);
  const extent = useMemo(() => battingPartsExtent(qualified), [qualified]);
  // Full shade at the 90th percentile of the qualified hitters' rates in each zone, so a few extremes do not wash out the rest.
  const zoneScale = useMemo(() => {
    const scale = {} as Record<BattingZone, number>;
    for (const z of ZONE_SPLITS) {
      const sizes = qualified.flatMap((r) => {
        const v = zoneData.rates.get(r.player_id)?.[z];
        return v == null ? [] : [Math.abs(v)];
      }).sort((a, b) => a - b);
      scale[z] = Math.max(0.1, sizes[Math.floor(0.9 * (sizes.length - 1))] ?? 1);
    }
    return scale;
  }, [qualified, zoneData]);
  const rows = useMemo(() => {
    const filtered = search ? qualified.filter((r) => foldSearch(r.player_name).includes(search)) : [...qualified];
    return filtered.sort((a, b) => {
      const diff = (a.values[sortKey] ?? 0) - (b.values[sortKey] ?? 0);
      return ascending ? diff : -diff;
    });
  }, [qualified, search, sortKey, ascending]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, totalPages - 1);
  const found = split ? repeats[split] : undefined;
  const note = split ? [SPLIT_NOTES[split], found && repeatNote(found)].filter(Boolean).join(" ") : "";

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
    setSortKey("runs");
    setAscending(false);
    setPage(0);
  };
  const hiddenBelow = (c: Column) =>
    c.from === "lg" ? "hidden lg:table-cell" : c.from === "sm" ? "hidden sm:table-cell" : c.set !== phoneSet ? "hidden lg:table-cell" : undefined;

  return (
    <div className="space-y-3">
      <ToggleGroup label="Leaderboard view" options={VIEWS} value={view} onChange={show} />
      {view !== "hitters" && split && (
        <div className="space-y-2">
          {zone ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
              <BattingZonePicker
                value={zone}
                shares={zoneData.shares}
                onChange={(key) => {
                  setChosen({ ...chosen, zones: key });
                  setPage(0);
                }}
                className="max-w-56 max-sm:mx-auto max-sm:max-w-52"
              />
              <div className="max-w-md space-y-2 text-xs leading-relaxed text-muted-foreground">
                <p className="type-subsection text-foreground">{battingSplitLabel(zone)}</p>
                {note && <p>{note}</p>}
                <p>The small map on each row is that hitter&apos;s runs per 100 pitches in all four zones: green above the league and red below, shaded against other hitters in the same zone, with the zone chosen here outlined.</p>
              </div>
            </div>
          ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {options[view].map((set, i) => (
              <Fragment key={set.label}>
                {i > 0 && <span aria-hidden="true" className="h-5 w-px bg-rule-strong" />}
                <ToggleGroup
                  variant="chip"
                  label={set.label}
                  options={set.options}
                  value={split}
                  onChange={(key) => {
                    setChosen({ ...chosen, [view]: key });
                    setPage(0);
                  }}
                />
              </Fragment>
            ))}
          </div>
          )}
          {note && !zone && <p className="max-w-4xl text-xs leading-relaxed text-muted-foreground">{note}</p>}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">Search</span>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Juan Soto"
            className="w-40 rounded-md border border-border bg-background px-2 py-1.5 text-sm sm:w-56"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">Minimum PA</span>
          <select
            value={minimum}
            onChange={(e) => {
              setMinimum(Number(e.target.value));
              setPage(0);
            }}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            {minimums.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <ToggleGroup
          variant="pill"
          label="Columns"
          options={COLUMN_SETS}
          value={phoneSet}
          onChange={setPhoneSet}
          className="lg:hidden"
        />
        <span className="text-xs text-muted-foreground">
          {rows.length} hitters, {season}
        </span>
        <Pager page={current} totalPages={totalPages} onPage={setPage} />
      </div>
      <BattingPartsLegend className="md:hidden" />
      <Table density="compact">
        <TableHeader>
          <TableRow>
            <TableHead className="hidden w-8 text-muted-foreground sm:table-cell">#</TableHead>
            <TableHead className="text-muted-foreground">Hitter</TableHead>
            {columns.map((c) => (
              <TableHead key={c.key} className={cn("whitespace-nowrap text-right", hiddenBelow(c))} aria-sort={c.key === sortKey ? (ascending ? "ascending" : "descending") : undefined}>
                <button
                  type="button"
                  onClick={() => sortBy(c.key)}
                  aria-label={`Sort by ${c.label}`}
                  className={cn("type-eyebrow inline-flex items-center gap-1", c.key === sortKey ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                >
                  {c.part && <span aria-hidden="true" className={cn("size-2 rounded-[2px]", BATTING_PART_FILL[c.part])} />}
                  {c.short && <span className="sm:hidden">{c.short}</span>}
                  <span className={cn(c.short && "max-sm:hidden")}>{c.label}</span>
                  {c.key === sortKey && <span aria-hidden="true">{ascending ? "▲" : "▼"}</span>}
                </button>
                <InfoTip text={c.tip} label={`What is ${c.label}?`} className="ml-1 hidden sm:inline-flex" />
              </TableHead>
            ))}
            {zone && <TableHead className="text-center text-muted-foreground md:hidden"><span className="type-eyebrow">Zones</span></TableHead>}
            <TableHead className="hidden pl-4 md:table-cell">
              <BattingPartsLegend className="flex-nowrap tracking-normal normal-case" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length + 4} className="py-6 text-center font-sans text-muted-foreground">
                No hitters match.
              </TableCell>
            </TableRow>
          )}
          {rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map((r, i) => (
            <Fragment key={r.key}>
              <TableRow className="max-md:hover:bg-transparent">
                <TableCell className="hidden text-muted-foreground sm:table-cell">{current * PAGE_SIZE + i + 1}</TableCell>
                <TableCell className="w-full max-w-0">
                  <PlayerCell athleteId={String(r.player_id)} headshotUrl={mlbPlayerHeadshotUrl(r.player_id)} name={r.player_name}
                    team={r.team} position={null} logo={mlbTeamIdentity(r.team)} wrapName />
                </TableCell>
                {columns.map((c) => {
                  const v = r.values[c.key];
                  return (
                    <TableCell key={c.key} className={cn("text-right tabular-nums", hiddenBelow(c), v != null && c.signed != null && tone(v, c.signed))}>
                      {v == null ? "–" : c.format(v)}
                    </TableCell>
                  );
                })}
                {zone && (
                  <TableCell className="md:hidden">
                    <BattingZoneMini rates={zoneData.rates.get(r.player_id) ?? {}} selected={zone} scale={zoneScale} className="ml-auto" />
                  </TableCell>
                )}
                <TableCell className="hidden pl-4 md:table-cell">
                  <div className="flex items-center gap-3">
                    {zone && <BattingZoneMini rates={zoneData.rates.get(r.player_id) ?? {}} selected={zone} scale={zoneScale} />}
                    <BattingPartsBar parts={r} negative={extent.negative} positive={extent.positive} className="w-52 lg:w-64" />
                  </div>
                </TableCell>
              </TableRow>
              {/* Below the bar column's width the bar takes its own line, the full width of the table. */}
              <TableRow className="hover:bg-transparent md:hidden">
                <TableCell colSpan={columns.length + 4} className="pt-0.5 pb-3">
                  <BattingPartsBar parts={r} negative={extent.negative} positive={extent.positive} />
                </TableCell>
              </TableRow>
            </Fragment>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end">
        <Pager page={current} totalPages={totalPages} onPage={setPage} />
      </div>
    </div>
  );
}
