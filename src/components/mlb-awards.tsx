import { PlayerHeadshot } from "@/components/player-headshot";
import { ProbabilityBar } from "@/components/probability-bar";
import { TeamLogo } from "@/components/team-logo";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AwardModel, AwardRow } from "@/lib/mlb-awards.server";
import { mlbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { mlbTeamCodeByName, mlbTeamIdentity } from "@/lib/mlb-teams";
import { cn } from "@/lib/utils";

const SHOWN = 5;
// Fixed strings, so Tailwind sees every class. Past these a candidate joins "the rest".
const SERIES = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

// The backtest's most confident calls hit about nine times in ten, so a board
// never prints more certainty than that supports.
export function chance(probability: number | null): string {
  if (probability == null) return "–";
  if (probability >= 0.95) return "95%+";
  if (probability < 0.01) return "<1%";
  return `${Math.round(probability * 100)}%`;
}

function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  const suffix = /^(jr\.?|sr\.?|ii|iii)$/i.test(parts.at(-1) ?? "");
  return parts.slice(suffix ? -2 : -1).join(" ");
}

function Won() {
  return <span className="ml-2 rounded-sm bg-primary/15 px-1.5 py-0.5 type-meta font-medium text-primary">Won</span>;
}

function Headshot({ row, className }: { row: AwardRow; className?: string }) {
  return <PlayerHeadshot name={row.player_name} src={mlbPlayerHeadshotUrl(row.player_id)} className={className} />;
}

function Candidate({ row }: { row: AwardRow }) {
  const team = row.team ?? "";
  return (
    <div className="flex items-center gap-2.5">
      <Headshot row={row} className="h-10 w-10" />
      <div className="min-w-0">
        <div className="font-medium">{row.player_name}{row.won === true && <Won />}</div>
        <div className="type-meta whitespace-normal text-muted-foreground">
          {team && <TeamLogo team={mlbTeamIdentity(mlbTeamCodeByName(team))} name={team} className="mr-1 h-3.5 w-3.5" />}
          {row.stat_line || "Off the frozen board"}
        </div>
      </div>
    </div>
  );
}

// The eight favorites, each linking down to its race.
export function AwardFavorites({ races }: { races: { id: string; title: string; rows: AwardRow[] }[] }) {
  return (
    <div className="grid gap-x-6 gap-y-6 border-y border-rule-strong py-5 sm:grid-cols-2 lg:grid-cols-4">
      {races.map(({ id, title, rows }) => (
        <a key={id} href={`#${id}`} className="group min-w-0 space-y-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <p className="type-eyebrow text-muted-foreground group-hover:text-foreground">{title}</p>
          {rows.map((row) => (
            <div key={row.player_id} className="flex items-center gap-3">
              <Headshot row={row} className="h-16 w-16" />
              <div className="min-w-0">
                <div className="type-meta text-muted-foreground">{row.league}</div>
                <div className="font-medium leading-tight">{row.player_name}</div>
                <div className="type-subsection tabular-nums">{chance(row.win_probability)}</div>
              </div>
            </div>
          ))}
        </a>
      ))}
    </div>
  );
}

// Each model against the one number a reader would otherwise pick the winner by.
export function AwardTrackRecord({ rows }: { rows: { label: string; model: AwardModel }[] }) {
  const stat = (name: string) => (name === "war" ? "fWAR" : name === "oaa" ? "OAA" : name);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 type-meta text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-chart-primary" />Model</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-chart-comparison" />Single-stat leader</span>
      </div>
      <ul className="space-y-2.5">
        {rows.map(({ label, model: { backtest: fit } }) => (
          <li key={label} className="grid grid-cols-[7.5rem_1fr_6rem] items-center gap-x-3 sm:grid-cols-[11rem_1fr_11rem]">
            <span className="type-label">{label}</span>
            <span aria-hidden="true" className="space-y-1">
              <span className="block h-2.5 rounded-sm bg-chart-primary" style={{ width: `${(fit.hits / fit.races) * 100}%` }} />
              <span className="block h-2.5 rounded-sm bg-chart-comparison" style={{ width: `${(fit.baseline_hits / fit.races) * 100}%` }} />
            </span>
            <span className="type-meta tabular-nums text-muted-foreground">
              <span className="block text-foreground">{fit.hits} of {fit.races}</span>
              <span className="block">{stat(fit.baseline)} {fit.baseline_hits}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VoteStrip({ rows, label, value }: { rows: AwardRow[]; label: string; value: (row: AwardRow) => number }) {
  const named = rows.slice(0, SERIES.length);
  const total = rows.reduce((sum, row) => sum + value(row), 0);
  return (
    <div className="space-y-1">
      <div className="type-meta text-muted-foreground">{label}</div>
      <div aria-hidden="true" className="flex h-3 gap-px overflow-hidden rounded-sm bg-muted">
        {named.map((row, index) => (
          <span key={row.player_id} className={SERIES[index]} style={{ width: `${(value(row) / Math.max(total, 1)) * 100}%` }} />
        ))}
      </div>
    </div>
  );
}

function RaceRows({ rows, offset, withVote, withChance, keyed }: { rows: AwardRow[]; offset: number; withVote: boolean; withChance: boolean; keyed: boolean }) {
  return rows.map((row, index) => (
    <TableRow key={row.player_id}>
      <TableCell className="w-8 align-middle font-mono tabular-nums text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          {keyed && SERIES[index + offset] && <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", SERIES[index + offset])} />}
          {row.rank ?? "–"}
        </span>
      </TableCell>
      <TableCell className="whitespace-normal"><Candidate row={row} /></TableCell>
      {withVote && <TableCell className="hidden text-right align-middle font-mono tabular-nums sm:table-cell text-muted-foreground">{row.vote_share == null ? "–" : `${Math.round(row.vote_share * 100)}%`}</TableCell>}
      {withChance && <TableCell className="text-right align-middle"><ProbabilityBar value={row.win_probability} label={chance(row.win_probability)} /></TableCell>}
    </TableRow>
  ));
}

export function AwardRace({ title, rows, strip = false }: { title: string; rows: AwardRow[]; strip?: boolean }) {
  const withVote = rows.some((row) => row.vote_share != null);
  const withChance = rows.some((row) => row.win_probability != null);
  const ranked = rows.filter((row) => row.rank != null);
  const first = [...ranked.slice(0, SHOWN), ...rows.filter((row) => row.rank == null)];
  const rest = ranked.slice(SHOWN);
  const head = (
    <TableHeader><TableRow>
      <TableHead className="w-8">#</TableHead>
      <TableHead>{title}</TableHead>
      {withVote && <TableHead className="hidden text-right sm:table-cell">Vote</TableHead>}
      {withChance && <TableHead className="text-right">Win</TableHead>}
    </TableRow></TableHeader>
  );
  return (
    <div className="min-w-0 space-y-3">
      {strip && (withVote
        ? <VoteStrip rows={ranked} label="Forecast share of ballot points" value={(row) => row.vote_share ?? 0} />
        : <VoteStrip rows={ranked} label="Chance of winning" value={(row) => row.win_probability ?? 0} />)}
      <Table>{head}<TableBody><RaceRows rows={first} offset={0} withVote={withVote} withChance={withChance} keyed={strip} /></TableBody></Table>
      {rest.length > 0 && (
        <details>
          <summary className="cursor-pointer type-meta text-muted-foreground">Next {rest.length} candidates</summary>
          <Table className="mt-2">{head}<TableBody><RaceRows rows={rest} offset={SHOWN} withVote={withVote} withChance={withChance} keyed={false} /></TableBody></Table>
        </details>
      )}
    </div>
  );
}

// Where each fielder stands, as a percentage of the square field below. Utility has no spot, so it waits in foul ground.
const FIELD_SPOTS: Record<string, { x: number; y: number }> = {
  CF: { x: 50, y: 9 }, LF: { x: 15, y: 24 }, RF: { x: 85, y: 24 }, SS: { x: 32, y: 42 }, "2B": { x: 68, y: 42 },
  "3B": { x: 13, y: 63 }, P: { x: 50, y: 60 }, "1B": { x: 87, y: 63 }, C: { x: 50, y: 89 }, UT: { x: 87, y: 89 },
};

function Field() {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
      <path d="M50 92 L3 45 Q50 -14 97 45 Z" className="fill-muted/60" />
      <path d="M50 92 L24 66 L50 40 L76 66 Z" className="fill-background stroke-rule-strong" strokeWidth="0.4" />
      <path d="M50 92 L3 45 M50 92 L97 45" className="stroke-rule-strong" strokeWidth="0.4" />
      {[[24, 66], [50, 40], [76, 66]].map(([x, y]) => <rect key={x} x={x - 1} y={y - 1} width="2" height="2" className="fill-rule-strong" transform={`rotate(45 ${x} ${y})`} />)}
    </svg>
  );
}

// Each league's forecast Gold Glove team, standing at its positions.
export function GoldGloveField({ league, rows }: { league: string; rows: AwardRow[] }) {
  return (
    <figure className="min-w-0">
      <figcaption className="type-subsection mb-2">{league}</figcaption>
      <div className="relative mx-auto aspect-square w-full max-w-xl">
        <Field />
        <ul className="absolute inset-0">
        {rows.map((row) => {
          const spot = FIELD_SPOTS[row.position];
          return (
            <li key={row.position} className="absolute flex w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center" style={{ left: `${spot.x}%`, top: `${spot.y}%` }}>
              <span className="relative">
                <Headshot row={row} className="h-11 w-11 bg-background sm:h-14 sm:w-14" />
                <span className="absolute -right-1.5 -bottom-1 rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground">{row.position}</span>
              </span>
              <span className="mt-1 text-xs leading-tight font-medium">{surname(row.player_name)}{row.won === true && <span className="sr-only"> won</span>}</span>
              <span className="type-meta tabular-nums text-muted-foreground">{row.win_probability == null ? "Ranked first" : chance(row.win_probability)}</span>
            </li>
          );
        })}
        </ul>
      </div>
    </figure>
  );
}
