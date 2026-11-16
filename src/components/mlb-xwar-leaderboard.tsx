"use client";

import { Fragment, useDeferredValue, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { InfoTip } from "@/components/info-tip";
import { Pager } from "@/components/pager";
import { PlayerCell } from "@/components/player-cell";
import { ToggleGroup } from "@/components/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { luck, type XwarRow } from "@/lib/mlb-xwar";
import { mlbTeamIdentity } from "@/lib/mlb-teams";
import { mlbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { EMPTY, cn, foldSearch, formatSigned } from "@/lib/utils";

type View = "hitters" | "pitchers";
type Sample = "regulars" | "everyone";
type SortKey = "war" | "xwar" | "luck" | "projected" | "woba" | "expected_woba" | "kept" | "home_runs" | "expected_home_runs";
const PAGE_SIZE = 25;
const FROM = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell" };
const VIEWS: { key: View; label: string }[] = [
  { key: "hitters", label: "Hitters" },
  { key: "pitchers", label: "Pitchers" },
];
const SAMPLES: { key: Sample; label: string }[] = [
  { key: "regulars", label: "Regulars" },
  { key: "everyone", label: "Everyone" },
];

interface Row {
  player: XwarRow;
  // Tracked balls in play on this view's side: hit for a hitter, allowed for a pitcher.
  balls: number;
  values: Partial<Record<SortKey, number>>;
}

interface Column {
  key: SortKey;
  label: string;
  tip: string;
  format: (v: number) => string;
  phone?: boolean;
  // The breakpoint a column first shows at when the board is not sorted by it: sm unless named.
  from?: "md" | "lg";
}

// A season's WAR is good to about a tenth of a win, a gap in runs to about a run.
const wins = (v: number) => v.toFixed(1);
const signedWins = (v: number) => formatSigned(v, 1);
const signedRuns = (v: number) => formatSigned(v, 0);
// wOBA the way it is quoted: .365
const rate = (v: number) => v.toFixed(3).replace(/^0/, "");
const counted = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

const WAR: Column = { key: "war", label: "fWAR", format: wins, tip: "FanGraphs WAR for the season, hitting and pitching together: what happened." };
const XWAR: Column = { key: "xwar", label: "xWAR", format: wins, phone: true, tip: "The same season with the luck on contact taken out. It looks back; it is not a forecast." };
const LUCK: Column = {
  key: "luck", label: "Luck", format: signedWins, phone: true,
  tip: "fWAR minus xWAR, in wins. Positive means his results ran ahead of his contact; negative means they ran behind it.",
};
const projection = (season: number): Column => ({
  key: "projected", label: `${season} proj`, format: wins,
  tip: `Projected WAR for ${season} from the grade model, which reads several seasons, age and playing time. This is the forecast.`,
});
const sideColumns: Record<View, Column[]> = {
  hitters: [
    { key: "woba", label: "wOBAcon", format: rate, from: "md", tip: "wOBA on his tracked balls in play, as they turned out." },
    {
      key: "expected_woba", label: "xwOBAcon", format: rate, from: "md",
      tip: "wOBA those balls called for, from their exit velocity, their launch angle and his sprint speed.",
    },
    {
      key: "kept", label: "Kept", format: signedRuns, from: "lg",
      tip: "Runs of the gap between the two that his own record supports. He keeps them; the rest is treated as luck.",
    },
  ],
  pitchers: [
    { key: "home_runs", label: "HR", format: (v) => v.toFixed(0), from: "md", tip: "Home runs allowed on tracked balls in play." },
    {
      key: "expected_home_runs", label: "xHR", format: (v) => v.toFixed(1), from: "md",
      tip: "Home runs those balls called for, from their exit velocity and launch angle.",
    },
  ],
};

interface Stat {
  label: string;
  // A shorter label for a phone.
  short?: string;
  tip: string;
  value: string;
  // The number the side is about.
  strong?: boolean;
}

// One side of a player's season: a title with its sample, then a tile per step from his results to the change in his WAR.
function Side({ title, note, stats }: { title: string; note: string; stats: Stat[] }) {
  return (
    <section className="space-y-2">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="type-eyebrow font-bold">{title}</h3>
        <span className="type-meta text-muted-foreground">{note}</span>
      </header>
      <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label} className={cn("min-w-0 rounded-sm border px-3 py-2", stat.strong ? "border-primary/60" : "border-border")}>
            <dt className="type-meta flex items-center gap-1 text-muted-foreground">
              <span className={cn("truncate", stat.short && "hidden sm:inline")}>{stat.label}</span>
              {stat.short && <span className="sm:hidden">{stat.short}</span>}
              <InfoTip text={stat.tip} label={`What is ${stat.label}?`} />
            </dt>
            <dd className={cn("font-mono text-base tabular-nums", stat.strong && "font-semibold text-primary")}>{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// How one player's fWAR becomes his xWAR: this season's contact on each side (what happened, what it called for,
// the gap, what he keeps, the luck that is left, the change to his WAR).
function Breakdown({
  player,
  firstSeason,
  runsPerWin,
  homeRunRuns,
}: {
  player: XwarRow;
  firstSeason: number;
  runsPerWin: number;
  homeRunRuns: number;
}) {
  const { balls, realized_gap_runs: gap, earned_gap_runs: kept, woba_contact: woba, expected_woba_contact: expectedWoba,
    balls_allowed: allowed, home_runs_allowed: homeRuns, expected_home_runs: expected, home_run_gap: homeRunGap,
    earned_home_runs: keptHomeRuns } = player;
  const batted = balls != null && balls > 0 && gap != null && kept != null;
  const pitched = allowed != null && allowed > 0 && homeRuns != null && expected != null && homeRunGap != null && keptHomeRuns != null;
  // Luck in runs, positive when it helped him. A home run above expected is bad luck for a pitcher.
  const plateLuck = batted ? gap - kept : 0;
  const moundLuck = pitched ? -homeRunRuns * (homeRunGap - keptHomeRuns) : 0;
  // The two sides' moves in wins add up to the published xWAR exactly: the mound takes whatever the plate leaves.
  const move = player.xwar - player.war;
  const plateMove = batted ? (pitched ? -plateLuck / runsPerWin : move) : 0;
  const moundMove = pitched ? move - plateMove : 0;
  const sample = (n: number) => counted(n, "tracked ball in play", "tracked balls in play");
  const change = (v: number): Stat => ({
    label: "Change to his WAR", short: "WAR", strong: true, value: formatSigned(v, 2),
    tip: `The luck in wins, at ${runsPerWin.toFixed(2)} runs a win.`,
  });
  return (
    <div className="space-y-4 font-sans">
      {batted && (
        <Side
          title="At the plate"
          note={sample(balls)}
          stats={[
            { label: "wOBA on contact", short: "wOBA", value: woba == null ? EMPTY : rate(woba), tip: "What his balls in play did." },
            {
              label: "xwOBA on contact", short: "xwOBA", value: expectedWoba == null ? EMPTY : rate(expectedWoba),
              tip: "What their exit velocity, their launch angle and his speed called for.",
            },
            { label: "Gap, in runs", short: "Gap", value: formatSigned(gap, 1), tip: "The difference between the two in runs, with the park removed." },
            { label: "Kept", value: formatSigned(kept, 1), tip: `The part of the gap his record since ${firstSeason} supports.` },
            { label: "Luck, in runs", short: "Luck", value: formatSigned(plateLuck, 1), tip: "The gap minus what he kept." },
            change(plateMove),
          ]}
        />
      )}
      {pitched && (
        <Side
          title="On the mound"
          note={sample(allowed)}
          stats={[
            { label: "Home runs allowed", short: "HR", value: homeRuns.toFixed(0), tip: "Home runs allowed on tracked balls in play." },
            { label: "xHR", value: expected.toFixed(1), tip: "Home runs the exit velocity and launch angle he allowed called for." },
            { label: "Gap, in home runs", short: "Gap", value: formatSigned(homeRunGap, 1), tip: "The difference between the two, with the park removed." },
            {
              label: "Kept", value: formatSigned(keptHomeRuns, 1),
              tip: keptHomeRuns === 0 ? "A pitcher's gap does not repeat, so he keeps none of it." : "The part of the gap his record supports.",
            },
            {
              label: "Luck, in runs", short: "Luck", value: formatSigned(moundLuck, 1),
              tip: `The gap he did not keep, at ${homeRunRuns.toFixed(2)} runs a home run.`,
            },
            change(moundMove),
          ]}
        />
      )}
    </div>
  );
}

export function XwarLeaderboard({
  players,
  season,
  firstSeason,
  regular,
  runsPerWin,
  homeRunRuns,
  projectionSeason,
}: {
  players: XwarRow[];
  season: number;
  // The first season a player's record is read from.
  firstSeason: number;
  // Tracked balls in play that make a regular on each view: the sample the study measured the gap on.
  regular: Record<View, number>;
  runsPerWin: number;
  // Runs fWAR's pitching formula charges for a home run.
  homeRunRuns: number;
  // The season the grade model's projections are for, or null when there are none to show.
  projectionSeason: number | null;
}) {
  const [view, setView] = useState<View>("hitters");
  const [sample, setSample] = useState<Sample>("regulars");
  const [sortKey, setSortKey] = useState<SortKey>("xwar");
  const [ascending, setAscending] = useState(false);
  const [typed, setTyped] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const search = useDeferredValue(foldSearch(typed.trim()));

  // A two-way player is on both views with the same xWAR: it is one number for his whole season.
  const all = useMemo<Record<View, Row[]>>(() => {
    const shared = (p: XwarRow) => ({ war: p.war, xwar: p.xwar, luck: luck(p), projected: p.projected_war ?? undefined });
    return {
      hitters: players.flatMap((p) =>
        p.balls == null ? [] : [{ player: p, balls: p.balls, values: { ...shared(p), woba: p.woba_contact ?? undefined, expected_woba: p.expected_woba_contact ?? undefined, kept: p.earned_gap_runs ?? 0 } }]),
      pitchers: players.flatMap((p) =>
        p.balls_allowed == null ? [] : [{
          player: p, balls: p.balls_allowed,
          values: { ...shared(p), home_runs: p.home_runs_allowed ?? 0, expected_home_runs: p.expected_home_runs ?? 0 },
        }]),
    };
  }, [players]);

  const columns = useMemo(
    () => [WAR, XWAR, LUCK, ...(projectionSeason == null ? [] : [projection(projectionSeason)]), ...sideColumns[view]],
    [view, projectionSeason],
  );
  const rows = useMemo(() => {
    const floor = sample === "regulars" ? regular[view] : 0;
    const filtered = all[view].filter((r) => r.balls >= floor && (!search || foldSearch(r.player.player_name).includes(search)));
    return filtered.sort((a, b) => {
      const x = a.values[sortKey];
      const y = b.values[sortKey];
      // A player without the number goes last whichever way the board is sorted.
      if (x == null || y == null) return Number(x == null) - Number(y == null);
      return ascending ? x - y : y - x;
    });
  }, [all, view, sample, regular, search, sortKey, ascending]);

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
    setSortKey("xwar");
    setAscending(false);
    setPage(0);
  };
  // Phones keep xWAR, the luck and whatever the board is sorted by.
  const hidden = (c: Column) => (c.phone || c.key === sortKey ? "" : FROM[c.from ?? "sm"]);
  const span = columns.length + 3;
  const noun = view === "hitters" ? "hitters" : "pitchers";

  return (
    <div className="space-y-3">
      <ToggleGroup label="Leaderboard view" options={VIEWS} value={view} onChange={show} />
      <div className="flex flex-wrap items-end gap-4">
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">Search</span>
          <input
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              setPage(0);
            }}
            placeholder="Player name"
            className="w-44 rounded-md border border-border bg-background px-2 py-1.5 text-sm sm:w-56"
          />
        </label>
        <ToggleGroup
          label="Sample"
          variant="pill"
          options={SAMPLES}
          value={sample}
          onChange={(next) => {
            setSample(next);
            setPage(0);
          }}
        />
        <span className="text-xs text-muted-foreground">
          {view === "hitters" ? counted(rows.length, "hitter", "hitters") : counted(rows.length, "pitcher", "pitchers")}, {season}
          {sample === "regulars" && `, ${regular[view]}+ tracked balls in play`}
        </span>
        <Pager page={current} totalPages={totalPages} onPage={setPage} />
      </div>
      <Table density="compact">
        <TableHeader>
          <TableRow>
            <TableHead className="hidden w-8 text-muted-foreground sm:table-cell">#</TableHead>
            <TableHead className="type-eyebrow text-muted-foreground">Player</TableHead>
            {columns.map((c) => (
              <TableHead key={c.key} className={cn("whitespace-nowrap text-right", hidden(c))} aria-sort={c.key === sortKey ? (ascending ? "ascending" : "descending") : undefined}>
                <button
                  type="button"
                  onClick={() => sortBy(c.key)}
                  className={cn("type-eyebrow inline-flex items-center gap-1", c.key === sortKey ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                >
                  {c.label}
                  {c.key === sortKey && <span aria-hidden="true">{ascending ? "▲" : "▼"}</span>}
                </button>
                <InfoTip text={c.tip} label={`What is ${c.label}?`} className="ml-1 hidden lg:inline-flex" />
              </TableHead>
            ))}
            <TableHead className="w-6"><span className="sr-only">Details</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={span} className="py-6 text-center font-sans text-muted-foreground">No {noun} match.</TableCell>
            </TableRow>
          )}
          {rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map((r, i) => {
            const { player } = r;
            const expanded = open === player.player_id;
            const panelId = `xwar-${player.player_id}`;
            return (
              <Fragment key={player.player_id}>
                <TableRow onClick={() => setOpen(expanded ? null : player.player_id)} className={cn("cursor-pointer", expanded && "bg-muted/40")}>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{current * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="w-full max-w-0 min-w-36 sm:min-w-48">
                    <PlayerCell athleteId={String(player.player_id)} headshotUrl={mlbPlayerHeadshotUrl(player.player_id)} name={player.player_name}
                      team={player.team} position={null} logo={mlbTeamIdentity(player.team)} wrapName />
                  </TableCell>
                  {columns.map((c) => {
                    const v = r.values[c.key];
                    return (
                      <TableCell key={c.key} className={cn("whitespace-nowrap text-right font-mono tabular-nums", hidden(c), c.key === "xwar" && "font-semibold")}>
                        {v == null ? EMPTY : c.format(v)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="pl-0 text-right">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      aria-label={`${expanded ? "Hide" : "Show"} xWAR breakdown for ${player.player_name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(expanded ? null : player.player_id);
                      }}
                      className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform", expanded && "rotate-180")} />
                    </button>
                  </TableCell>
                </TableRow>
                {expanded && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell id={panelId} colSpan={span} className="whitespace-normal bg-muted/20 px-3 py-4 sm:px-5">
                      <Breakdown player={player} firstSeason={firstSeason} runsPerWin={runsPerWin} homeRunRuns={homeRunRuns} />
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
