"use client";

import { Fragment, useDeferredValue, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { InfoTip } from "@/components/info-tip";
import { BattingZoneMini, BattingZonePicker, type BattingZone } from "@/components/mlb-batting-zone-map";
import { Pager } from "@/components/pager";
import { ComparisonMetrics, type ComparisonMetric } from "@/components/player-comparison";
import { PlayerComparisonPicker } from "@/components/player-comparison-picker";
import { PlayerCell } from "@/components/player-cell";
import { RankBadge } from "@/components/rank-badge";
import { ToggleGroup } from "@/components/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BATTING_PARTS, BATTING_PART_LABELS, COUNT_SPLITS, DIRECTION_SPLITS, PITCH_GROUP_SPLITS, ZONE_SPLITS,
  battingSplitLabel, battingTotal, formatCorrelation,
  type BattingHitter, type BattingPart, type BattingSplit, type BattingSplitRepeat, type Interval,
} from "@/lib/mlb-batting-value";
import { mlbTeamIdentity } from "@/lib/mlb-teams";
import { mlbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { EMPTY, cn, foldSearch, formatSigned } from "@/lib/utils";

type View = "hitters" | "counts" | "pitches" | "zones";
type SplitView = Exclude<View, "hitters">;
type SortKey = "pa" | "pitches" | "runs" | "rate" | "rest" | BattingPart;
const PAGE_SIZE = 25;
const MINIMUMS = [200, 350, 500];

interface Row {
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
  // Shown on a phone; the rest appear from `from` (the small breakpoint by default), and the breakdown under a row has
  // them all.
  phone?: boolean;
  from?: "sm" | "lg";
  // One of the three parts: its cell draws the figure as a small bar from zero as well.
  part?: boolean;
}

const count = (v: number) => v.toLocaleString("en-US");
// A season total carries several runs of sampling noise and a rate per 100 pitches several tenths, so neither shows more.
const runs = (v: number) => formatSigned(v, 0);
const rate = (v: number) => formatSigned(v, 1);

// What each part asks, in a phrase: the legend above the table and the breakdown under a row both use it.
const PART_PLAIN: Record<BattingPart, string> = {
  decision: "swinging at the right pitches",
  contact: "connecting when he swings",
  quality: "how well he hits the ball",
};
const PARTS: Column[] = [
  {
    key: "decision", label: BATTING_PART_LABELS.decision, part: true, signed: 0, format: runs,
    tip: "Swing or take: the value of his choice against the league's mix of swings and takes at the same pitch. Chasing costs runs here and laying off earns them.",
  },
  {
    key: "contact", label: BATTING_PART_LABELS.contact, part: true, signed: 0, format: runs,
    tip: "On swings: a miss, a foul or a ball in play against an average swing at the same pitch. Making more contact than the pitch calls for has no positive link to next season's runs, because contact hitters tend to hit the ball less hard. Read it as a hitting style.",
  },
  {
    key: "quality", label: BATTING_PART_LABELS.quality, part: true, signed: 0, format: runs,
    tip: "On balls in play: what the exit velocity and launch angle were worth against the league's ball in play from the same pitch.",
  },
];
const RUNS: Column = {
  key: "runs", label: "Runs", phone: true, signed: 0, format: runs,
  tip: "Decision plus Contact plus Quality: runs against the league average with the difficulty of every pitch taken out. Positive is better for the hitter. Each figure is rounded on its own, so the parts can miss the total by a run.",
};
const PER_100: Column = { key: "rate", label: "Per 100", phone: true, signed: 1, format: rate, tip: "Runs per 100 pitches." };
const PITCHES: Column = { key: "pitches", label: "Pitches", format: count, tip: "Pitches he saw in this split this season." };
// A split view carries more columns than the hitters view, so its parts wait for the wide layout.
const SPLIT_PARTS: Column[] = PARTS.map((c) => ({ ...c, from: "lg" }));
const COLUMNS: Record<View, Column[]> = {
  hitters: [
    { key: "pa", label: "PA", format: count, tip: "Plate appearances this season." },
    RUNS,
    { key: "rate", label: "Per 600", phone: true, signed: 0, format: runs, tip: "Runs per 600 plate appearances, about a full season." },
    ...PARTS,
  ],
  counts: [
    PITCHES,
    RUNS,
    PER_100,
    {
      key: "rest", label: "Vs usual", signed: 1, format: rate,
      tip: "Runs per 100 pitches in this count minus his runs per 100 on all his other pitches: above zero, he is better here than usual.",
    },
    ...SPLIT_PARTS,
  ],
  pitches: [PITCHES, RUNS, PER_100, ...SPLIT_PARTS],
  zones: [PITCHES, RUNS, PER_100, ...SPLIT_PARTS],
};

const VIEWS: { key: View; label: string }[] = [
  { key: "hitters", label: "All pitches" },
  { key: "counts", label: "By count" },
  { key: "pitches", label: "By pitch" },
  { key: "zones", label: "By zone" },
];
const SPLIT_NOTES: Record<string, string> = {
  two_strikes: "Counts 0-2, 1-2, 2-2 and 3-2.",
  ahead: "Counts 1-0, 2-0, 3-0, 2-1 and 3-1.",
  first_pitch: "The 0-0 pitch.",
  heart: "The middle of the strike zone.",
  shadow: "The edges of the zone, just inside and just outside its border.",
  chase: "Off the plate, close enough to tempt a swing.",
  waste: "Far from the zone.",
  inside: "The third of the plate nearest the hitter, and everything off the plate on that side.",
  away: "The third of the plate farthest from the hitter, and everything off the plate on that side.",
  up: "The top third of his strike zone, and everything above it.",
  down: "The bottom third of his strike zone, and everything below it.",
};

const interval = ([value, low, high]: Interval) => `${formatCorrelation(value)} (${formatCorrelation(low)} to ${formatCorrelation(high)})`;

// What the study found about one split, in words, with the numbers behind the words in the tip. The steadiness bands
// are a reading aid: a year-to-year r under .3 leaves most of a season's split to chance.
function repeatNote(found: BattingSplitRepeat) {
  const [r] = found.repeat;
  const steady = r >= 0.5 ? "holds up well" : r >= 0.3 ? "partly holds up" : "mostly does not hold up";
  const own = found.vs_rest[1] > 0
    ? "and how he does here against his other pitches carries over too, so it marks a real strength or weakness"
    : "but mostly reflects how good he is overall";
  return {
    text: `From one season to the next this split ${steady}, ${own}.`,
    tip: `A hitter's runs per 100 here repeat the next season at r = ${interval(found.repeat)}, and his gap to his other pitches at ${interval(found.vs_rest)}, over ${count(found.pairs)} season pairs.`,
  };
}

function tone(value: number, digits: number) {
  const rounded = Number(value.toFixed(digits));
  return rounded > 0 ? "text-positive" : rounded < 0 ? "text-negative" : undefined;
}

// One value as a bar from a zero line: right of it when positive, left of it and in the losing color when negative.
// No track behind it, so it reads as a bar from zero rather than a half-filled meter. `reach` is the value that spans
// half the width, shared by every bar it is compared with so a length means the same runs.
// The same size in the table and the breakdown, smaller where the table has less room. A phone's table shows no part
// bars, so there the breakdown's bars take the room the line has.
const BAR = "h-2 w-16 lg:h-2.5 lg:w-24";
const PANEL_BAR = "h-2.5 w-28 sm:h-2 sm:w-16 lg:h-2.5 lg:w-24";
function ValueBar({ value, reach, className }: { value: number | undefined; reach: number; className?: string }) {
  const width = value == null ? 0 : Math.min(50, (50 * Math.abs(value)) / reach);
  return (
    <span aria-hidden="true" className={cn("relative block", className)}>
      {value != null && (
        <span
          className={cn("absolute inset-y-0", value < 0 ? "rounded-l-[2px] bg-worse" : "rounded-r-[2px] bg-primary")}
          style={{ left: `${value < 0 ? 50 - width : 50}%`, width: `${width}%` }}
        />
      )}
      <span className="absolute inset-y-[-1px] left-1/2 w-px bg-muted-foreground/60" />
    </span>
  );
}

// Where each listed hitter stands in one split, best runs per 100 first, and how many are ranked.
interface SplitRanks {
  rank: Map<number, number>;
  of: number;
}
// Fixed widths, because each line is its own grid and the columns must still line up down the list.
const SPLIT_LINE = "grid grid-cols-[minmax(0,1fr)_3.25rem_3.25rem_2.25rem] items-baseline gap-x-2 whitespace-nowrap";
const PANEL_TITLE = "text-sm font-semibold text-foreground";

// Every split of one hitter at once, so finding him once shows where his runs came from without visiting each view.
function HitterBreakdown({
  hitter,
  bySplit,
  ranks,
  minimum,
  pitchTypes,
  reach,
}: {
  hitter: BattingHitter;
  bySplit: Record<string, Map<number, BattingSplit>>;
  ranks: Record<string, SplitRanks>;
  minimum: number;
  pitchTypes: string[];
  reach: number;
}) {
  const overall = (100 * battingTotal(hitter)) / hitter.pitches;
  const header = "text-[10px] uppercase tracking-wide text-muted-foreground text-right";
  const group = (title: string, sets: readonly (readonly string[])[]) => (
    <section key={title} className="min-w-0 space-y-2 border-t border-rule-strong pt-3">
      <div className={SPLIT_LINE}>
        <h3 className={PANEL_TITLE}>{title}</h3>
        <span className={header}>Pitches</span>
        <span className={header}>Per 100</span>
        <span className={header}>Rank</span>
      </div>
      {sets.map((codes, i) => {
        const seen = codes.flatMap((code) => {
          const split = bySplit[code]?.get(hitter.player_id);
          return split && split[1] > 0 ? [{ code, split }] : [];
        });
        if (seen.length === 0) return null;
        return (
          <ul key={i} className={cn("space-y-1 text-sm", i > 0 && "border-t border-border/60 pt-1.5")}>
            {seen.map(({ code, split: [, pitches, decision, contact, quality] }) => {
              const v = (100 * (decision + contact + quality)) / pitches;
              const place = ranks[code]?.rank.get(hitter.player_id);
              const of = ranks[code]?.of ?? 0;
              return (
                <li key={code} className={SPLIT_LINE}>
                  <span className="min-w-0 truncate">{battingSplitLabel(code)}</span>
                  <span className="text-right text-xs text-muted-foreground tabular-nums">{count(pitches)}</span>
                  <span className={cn("text-right font-mono tabular-nums", tone(v, 1))}>{rate(v)}</span>
                  {place == null ? <span /> : <RankBadge place={place} of={of} />}
                </li>
              );
            })}
          </ul>
        );
      })}
    </section>
  );
  return (
    <div className="space-y-5 py-2">
      <section className="space-y-3">
        <h3 className={PANEL_TITLE}>Where his {runs(battingTotal(hitter))} runs came from</h3>
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-3">
          {BATTING_PARTS.map((part) => (
            <li key={part} className="min-w-0 space-y-0.5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{BATTING_PART_LABELS[part]}</span>
                <span className="flex items-center gap-2.5">
                  <ValueBar value={hitter[part]} reach={reach} className={PANEL_BAR} />
                  <span className={cn("w-8 text-right font-mono tabular-nums", tone(hitter[part], 0))}>{runs(hitter[part])}</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{PART_PLAIN[part]}</p>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Umpire calls on his takes (left out of his runs): <span className="font-mono tabular-nums">{runs(hitter.calls)}</span>
          <InfoTip
            text="Called strikes and hit batters on his takes against what the league model expected. They are shown and left out of his runs, for the reason given in How this works."
            label="Why are calls not counted?"
            className="ml-1 align-middle"
          />
        </p>
      </section>
      {/* Two columns put count over pitch beside zone, with the note filling the shorter zone column, so the two end
          close together; three columns set the groups side by side, and the wrappers dissolve into that grid. */}
      <div className="grid items-start gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-5 lg:contents">
          {group("By count", [COUNT_SPLITS])}
          {group("By pitch", [PITCH_GROUP_SPLITS, pitchTypes])}
        </div>
        <div className="flex min-w-0 flex-col gap-5 lg:contents">
          {group("By zone", [ZONE_SPLITS, DIRECTION_SPLITS])}
          <p className="text-xs leading-relaxed text-muted-foreground lg:col-span-3">
            Runs per 100 pitches against the league average. His overall rate is {rate(overall)}; small samples swing widely.
            Rank is by runs per 100 among hitters with {minimum}+ PA listed for that split; a pitch type lists a hitter once
            he has seen enough of it.
          </p>
        </div>
      </div>
    </div>
  );
}

// Two hitters side by side on the figures the table and the breakdown use, splits with their ranks.
function HitterComparison({
  hitters,
  bySplit,
  ranks,
  seasonRanks,
  minimum,
  pitchTypes,
}: {
  hitters: [BattingHitter, BattingHitter];
  bySplit: Record<string, Map<number, BattingSplit>>;
  ranks: Record<string, SplitRanks>;
  seasonRanks: Record<"runs" | "per600" | BattingPart, Map<number, number>>;
  minimum: number;
  pitchTypes: string[];
}) {
  const unranked = hitters.filter((h) => h.pa < minimum).map((h) => h.player_name);
  const pair = <T,>(value: (h: BattingHitter) => T): [T, T] => [value(hitters[0]), value(hitters[1])];
  const ranked = (label: string, key: keyof typeof seasonRanks, value: (h: BattingHitter) => string): ComparisonMetric => ({
    label,
    values: pair(value),
    ranks: pair((h) => seasonRanks[key].get(h.player_id)),
  });
  const rateIn = (h: BattingHitter, code: string) => {
    const s = bySplit[code]?.get(h.player_id);
    return !s || s[1] === 0 ? EMPTY : rate((100 * (s[2] + s[3] + s[4])) / s[1]);
  };
  const splitRows = (codes: readonly string[]): ComparisonMetric[] =>
    codes
      .map((code) => ({
        label: battingSplitLabel(code),
        values: pair((h) => rateIn(h, code)),
        ranks: pair((h) => ranks[code]?.rank.get(h.player_id)),
      }))
      .filter((m) => m.values.some((v) => v !== EMPTY));
  const groups: [string, ComparisonMetric[]][] = [
    ["Season", [
      ranked("Runs", "runs", (h) => runs(battingTotal(h))),
      ranked("Per 600 PA", "per600", (h) => runs((600 * battingTotal(h)) / h.pa)),
      ...BATTING_PARTS.map((part) => ranked(BATTING_PART_LABELS[part], part, (h) => runs(h[part]))),
      { label: "PA", values: pair((h) => count(h.pa)) },
    ]],
    ["By count", splitRows(COUNT_SPLITS)],
    ["By pitch", splitRows([...PITCH_GROUP_SPLITS, ...pitchTypes])],
    ["By zone", splitRows([...ZONE_SPLITS, ...DIRECTION_SPLITS])],
  ];
  return (
    <section aria-label="Hitter comparison" className="space-y-4 rounded-lg border border-rule-strong p-4">
      <div className="grid grid-cols-2 gap-4">
        {hitters.map((h) => (
          <PlayerCell key={h.player_id} athleteId={String(h.player_id)} headshotUrl={mlbPlayerHeadshotUrl(h.player_id)} name={h.player_name}
            team={h.team} position={null} logo={mlbTeamIdentity(h.team)} wrapName />
        ))}
      </div>
      {unranked.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {unranked.join(" and ")} {unranked.length > 1 ? "are" : "is"} under the {minimum} PA minimum, so{" "}
          {unranked.length > 1 ? "their" : "his"} figures are shown without a rank. Lower the minimum to rank them.
        </p>
      )}
      {groups.map(([title, metrics]) => metrics.length > 0 && (
        <div key={title} className="space-y-1.5">
          <h3 className={PANEL_TITLE}>{title}</h3>
          <ComparisonMetrics metrics={metrics} />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Season figures are runs against the league average; splits are runs per 100 pitches. Each rank is among hitters at
        the chosen minimum PA.
      </p>
    </section>
  );
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
      zones: [set("Zone", ZONE_SPLITS), set("Direction", DIRECTION_SPLITS)],
    };
  }, [splits, pitchTypes]);
  const bySplit = useMemo(
    () => Object.fromEntries(Object.entries(splits).map(([code, list]) => [code, new Map(list.map((s) => [s[0], s]))])),
    [splits],
  );

  const [view, setView] = useState<View>("hitters");
  const [chosen, setChosen] = useState<Partial<Record<SplitView, string>>>({});
  const [sortKey, setSortKey] = useState<SortKey>("runs");
  const [ascending, setAscending] = useState(false);
  const [query, setQuery] = useState("");
  // Opens on every listed hitter, so a rank covers everyone the study publishes and the table order matches it.
  const [minimum, setMinimum] = useState(minimumPa);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const search = useDeferredValue(foldSearch(query.trim()));

  const split = view === "hitters" ? null : (chosen[view] ?? options[view][0].options[0]?.key ?? null);
  const columns = COLUMNS[view];
  const zone = view === "zones" && (ZONE_SPLITS as readonly string[]).includes(split ?? "") ? (split as BattingZone) : null;
  const choose = (key: string) => {
    if (view !== "hitters") setChosen({ ...chosen, [view]: key });
    setPage(0);
  };

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

  const who = useMemo(() => new Map(hitters.map((h) => [h.player_id, h])), [hitters]);
  const comparisonPlayers = useMemo(
    () => hitters.map((h) => ({ id: String(h.player_id), label: `${h.player_name} · ${h.team}`, group: "hitter" })),
    [hitters],
  );
  const compared = compare.flatMap((id) => who.get(Number(id)) ?? []);
  const all = useMemo<Row[]>(() => {
    if (split == null) {
      return hitters.map((h) => {
        const total = battingTotal(h);
        return {
          key: String(h.player_id), player_id: h.player_id, player_name: h.player_name, team: h.team, pa: h.pa,
          values: { pa: h.pa, runs: total, rate: (600 * total) / h.pa, decision: h.decision, contact: h.contact, quality: h.quality },
        };
      });
    }
    return (splits[split] ?? []).flatMap(([playerId, pitches, decision, contact, quality]) => {
      const h = who.get(playerId);
      if (!h) return [];
      const total = decision + contact + quality;
      const per100 = (100 * total) / pitches;
      const otherPitches = h.pitches - pitches;
      return [{
        key: String(playerId), player_id: playerId, player_name: h.player_name, team: h.team, pa: h.pa,
        values: {
          pitches, runs: total, rate: per100, decision, contact, quality,
          rest: otherPitches > 0 ? per100 - (100 * (battingTotal(h) - total)) / otherPitches : undefined,
        },
      }];
    });
  }, [hitters, splits, split, who]);

  const qualified = useMemo(() => all.filter((r) => r.pa >= minimum), [all, minimum]);
  // Every split's ranking over the hitters who clear the minimum, for the breakdown under a row.
  const ranks = useMemo(() => {
    const out: Record<string, SplitRanks> = {};
    for (const [code, list] of Object.entries(splits)) {
      const order = list
        .filter(([playerId, pitches]) => pitches > 0 && (who.get(playerId)?.pa ?? 0) >= minimum)
        .map(([playerId, pitches, decision, contact, quality]) => [playerId, (decision + contact + quality) / pitches] as const)
        .sort((a, b) => b[1] - a[1]);
      out[code] = { rank: new Map(order.map(([playerId], i) => [playerId, i + 1])), of: order.length };
    }
    return out;
  }, [splits, who, minimum]);
  // Each qualified hitter's place on the season figures, for the comparison.
  const seasonRanks = useMemo(() => {
    const pool = hitters.filter((h) => h.pa >= minimum);
    const place = (value: (h: BattingHitter) => number) =>
      new Map([...pool].sort((a, b) => value(b) - value(a)).map((h, i) => [h.player_id, i + 1]));
    return {
      runs: place(battingTotal),
      per600: place((h) => battingTotal(h) / h.pa),
      decision: place((h) => h.decision),
      contact: place((h) => h.contact),
      quality: place((h) => h.quality),
    };
  }, [hitters, minimum]);
  // The three parts share one scale, set by the largest part of anyone who clears the minimum, so a bar means the
  // same number of runs in every column and on every page.
  const reach = useMemo(() => {
    let most = 1;
    for (const r of qualified) {
      for (const c of PARTS) most = Math.max(most, Math.abs(r.values[c.key] ?? 0));
    }
    return most;
  }, [qualified]);
  // The breakdown draws season totals, so its bars share one scale over every qualified hitter's whole season.
  const seasonReach = useMemo(() => {
    let most = 1;
    for (const h of hitters) if (h.pa >= minimum) for (const p of BATTING_PARTS) most = Math.max(most, Math.abs(h[p]));
    return most;
  }, [hitters, minimum]);
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
  const repeat = found && repeatNote(found);

  const sortBy = (key: SortKey) => {
    if (key === sortKey) setAscending(!ascending);
    else {
      setSortKey(key);
      setAscending(false);
    }
    setPage(0);
  };
  // A split opens on runs per 100, the hitter's rate there: the study validates that rate's repeat, and a split total
  // mostly tracks playing time. The whole season opens on its total, the figure checked against next season's runs.
  const show = (next: View) => {
    setView(next);
    setSortKey(next === "hitters" ? "runs" : "rate");
    setAscending(false);
    setPage(0);
  };
  // Phones keep the total, the rate and whatever the board is sorted by; the parts are a tap away in the breakdown.
  const hiddenBelow = (c: Column) =>
    c.phone || c.key === sortKey ? undefined : c.from === "lg" ? "hidden lg:table-cell" : "hidden sm:table-cell";
  const span = columns.length + (zone ? 4 : 3);

  const chips = (sets: { label: string; options: { key: string; label: string }[] }[]) => (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {sets.map((set, i) => (
        <Fragment key={set.label}>
          {i > 0 && <span aria-hidden="true" className="h-5 w-px bg-rule-strong" />}
          <ToggleGroup variant="chip" label={set.label} options={set.options} value={split ?? ""} onChange={choose} />
        </Fragment>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <ToggleGroup label="Leaderboard view" options={VIEWS} value={view} onChange={show} />
      {view !== "hitters" && split && (
        <div className="space-y-2">
          {view === "zones" ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
              <BattingZonePicker
                value={zone}
                shares={zoneData.shares}
                onChange={choose}
                className="max-w-56 max-sm:mx-auto max-sm:max-w-52"
              />
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Tap a zone on the plate, or pick a side of it:</p>
                {chips(options.zones.slice(1))}
              </div>
            </div>
          ) : chips(options[view])}
          <p className="max-w-4xl text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">{battingSplitLabel(split)}.</span> {SPLIT_NOTES[split]}{" "}
            {repeat && (
              <>
                {repeat.text}
                <InfoTip text={repeat.tip} label="The numbers behind this" className="ml-1 align-middle" />
              </>
            )}
          </p>
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
        <span className="text-xs text-muted-foreground">
          {rows.length} hitters, {season}
        </span>
        <Pager page={current} totalPages={totalPages} onPage={setPage} />
      </div>
      <PlayerComparisonPicker
        players={comparisonPlayers}
        selected={compare}
        onChange={setCompare}
        noun="hitter"
        description="Pick two hitters to see their runs, parts and every split side by side."
        disclosure={{ open: compareOpen, onOpenChange: setCompareOpen }}
      />
      {compared.length === 2 && <HitterComparison hitters={[compared[0], compared[1]]} bySplit={bySplit} ranks={ranks} seasonRanks={seasonRanks} minimum={minimum} pitchTypes={pitchTypes} />}
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {BATTING_PARTS.map((part) => (
          <span key={part}>
            <span className="font-medium text-foreground">{BATTING_PART_LABELS[part]}</span>: {PART_PLAIN[part]}
          </span>
        ))}
        {zone && <span>Map: his runs per 100 in each zone, green above the league and red below.</span>}
        <span>Tap a hitter for every split.</span>
      </p>
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
                  {c.label}
                  {c.key === sortKey && <span aria-hidden="true">{ascending ? "▲" : "▼"}</span>}
                </button>
                <InfoTip text={c.tip} label={`What is ${c.label}?`} className="ml-1 hidden sm:inline-flex" />
              </TableHead>
            ))}
            {zone && <TableHead className="text-center text-muted-foreground"><span className="type-eyebrow">Zones</span></TableHead>}
            <TableHead className="w-6"><span className="sr-only">Details</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={span} className="py-6 text-center font-sans text-muted-foreground">
                No hitters match.
              </TableCell>
            </TableRow>
          )}
          {rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map((r, i) => {
            const expanded = open === r.player_id;
            const panelId = `batting-value-${r.player_id}`;
            const hitter = who.get(r.player_id);
            const toggle = () => setOpen(expanded ? null : r.player_id);
            return (
              <Fragment key={r.key}>
                <TableRow onClick={toggle} className={cn("cursor-pointer", expanded && "bg-muted/40")}>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{current * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="w-full max-w-0">
                    <PlayerCell athleteId={String(r.player_id)} headshotUrl={mlbPlayerHeadshotUrl(r.player_id)} name={r.player_name}
                      team={r.team} position={null} logo={mlbTeamIdentity(r.team)} wrapName />
                  </TableCell>
                  {columns.map((c) => {
                    const v = r.values[c.key];
                    const figure = v == null ? "–" : c.format(v);
                    return (
                      <TableCell key={c.key} className={cn("text-right tabular-nums", hiddenBelow(c), v != null && c.signed != null && tone(v, c.signed))}>
                        {c.part ? (
                          // Beside the figure where the table has room, under it below that.
                          <span className="inline-flex flex-col items-end gap-1 lg:flex-row lg:items-center lg:gap-2.5 lg:pl-3">
                            <span className="lg:w-7">{figure}</span>
                            <ValueBar value={v} reach={reach} className={BAR} />
                          </span>
                        ) : figure}
                      </TableCell>
                    );
                  })}
                  {zone && (
                    <TableCell>
                      <BattingZoneMini rates={zoneData.rates.get(r.player_id) ?? {}} selected={zone} scale={zoneScale} className="ml-auto" />
                    </TableCell>
                  )}
                  <TableCell className="pl-0 text-right">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      aria-label={`${expanded ? "Hide" : "Show"} every split for ${r.player_name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle();
                      }}
                      className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform", expanded && "rotate-180")} />
                    </button>
                  </TableCell>
                </TableRow>
                {expanded && hitter && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell id={panelId} colSpan={span} className="whitespace-normal bg-muted/20">
                      <HitterBreakdown hitter={hitter} bySplit={bySplit} ranks={ranks} minimum={minimum} pitchTypes={pitchTypes} reach={seasonReach} />
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
  );
}
