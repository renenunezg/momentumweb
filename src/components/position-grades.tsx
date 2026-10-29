"use client";

import { Accordion } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";
import { Fragment, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { GradedPlayer, GradedPlayerTrait, PlayerIndexRow } from "@/lib/position-grades";
import {
  CFB_SECTION_ORDER,
  TRAIT_SECTION_LABELS,
  KIND_ORDER,
  POSITION_ORDER,
  RATING_LABELS,
  SPORT_COPY,
  isMeasureKind,
  isUnitRow,
  traitLabel,
  type GradeSport,
  type TraitSection,
  type PositionGroup,
} from "@/lib/position-traits";
import { EMPTY, cn, formatNumber, formatSigned } from "@/lib/utils";
import { InfoTip } from "@/components/info-tip";
import { PlayerRowDisclosure, PlayerRowHeader } from "@/components/player-row-disclosure";
import { PlayerCell } from "@/components/player-cell";
import { TeamLogo, type TeamLogoSource } from "@/components/team-logo";
import { PlayerComparisonPicker } from "@/components/player-comparison-picker";
import { ToggleGroup } from "@/components/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAGE_ROWS = 40;
const ALL = "all";

// A team's logos keyed by the same team string the trait rows carry: the
// school in college football, the franchise abbreviation in the NFL.
export interface GradeTeam extends TeamLogoSource {
  team: string;
}

// Diagonal stripes mark a trait inferred from unit outcomes or teammates
// rather than counted from the player's own tagged plays.
const INFERRED_FILL = {
  backgroundImage:
    "repeating-linear-gradient(45deg, transparent 0 3px, color-mix(in oklch, var(--background) 45%, transparent) 3px 6px)",
};

// One trait line: the rows of a position's cards, in display order, with the
// kind each belongs to so the card can head each section once.
interface TraitLine {
  name: string;
  kind: TraitSection | null;
}

function TraitRow({
  sport,
  name,
  group,
  trait,
}: {
  sport: GradeSport;
  name: string;
  group: string;
  trait: GradedPlayerTrait | undefined;
}) {
  const { label, tip } = traitLabel(name, sport);
  const inGrade = trait?.in_grade ?? false;
  const inferred = trait?.kind === "inferred";
  const kind = isMeasureKind(trait?.kind) ? trait.kind : null;
  const style = kind === "style" || kind === "role";
  const noise = kind === "noise";
  const reliability = trait?.reliability ?? null;
  const pct = trait?.percentile ?? null;
  const detail = trait == null
    ? `${tip} No value for this player yet.`
    : kind != null
      ? `${tip}${inGrade ? " Used in the grade." : style ? " Higher is not necessarily better." : noise ? " Unreliable across games; not graded." : " Not used in the grade."}`
      : inGrade
        ? tip
        : `${tip} Not used in the ${group} grade.`;
  const dimmed = kind != null ? noise : !inGrade;
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-x-2 gap-y-1 text-xs sm:grid-cols-[minmax(0,15rem)_1fr_2.25rem] sm:gap-2.5",
        dimmed && "text-muted-foreground"
      )}
    >
      <span className="col-span-2 flex min-w-0 items-center justify-between gap-1.5 sm:col-span-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{label}</span>
          <InfoTip
            text={`${detail}${trait?.value != null ? ` Value: ${formatNumber(trait.value, 3)}.` : ""}`}
            label={`What is ${label}?`}
          />
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {reliability != null && (
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground" title="Game-to-game reliability">
              r {formatNumber(reliability, 2)}
            </span>
          )}
          <span
            className={cn(
              "type-eyebrow whitespace-nowrap rounded-sm px-1 text-center",
              inGrade ? "bg-muted text-positive" : "invisible"
            )}
          >
            grade
          </span>
        </span>
      </span>
      <span className="h-1.5 overflow-hidden rounded-[1px] bg-grid">
        <span
          className={cn(
            "block h-full",
            inferred ? "bg-accent-blue" : style ? "bg-muted-foreground" : "bg-primary",
            dimmed && "opacity-40"
          )}
          style={{ width: `${pct ?? 0}%`, ...(inferred ? INFERRED_FILL : {}) }}
        />
      </span>
      <span className="text-right font-mono tabular-nums">{pct == null ? EMPTY : Math.round(pct)}</span>
    </div>
  );
}

function Identity({ row, logo }: { row: PlayerIndexRow; logo: TeamLogoSource | undefined }) {
  if (isUnitRow(row.athleteId)) {
    return (
      <div className="flex items-center gap-2.5">
        <TeamLogo team={logo} name={row.team} className="h-9 w-9" />
        <div className="min-w-0">
          <div className="truncate font-medium">{row.team} offensive line</div>
          <div className="text-xs text-muted-foreground">unit · {formatNumber(row.games, 0)} games</div>
        </div>
      </div>
    );
  }
  return (
    <PlayerCell
      athleteId={row.athleteId}
      headshotUrl={row.headshotUrl}
      name={row.name}
      team={row.team}
      position={`${formatNumber(row.games, 0)} games`}
      logo={logo}
    />
  );
}

function Headline({
  label,
  tip,
  tipLabel,
  value,
  sub,
  positive,
}: {
  label: string;
  tip: string;
  tipLabel: string;
  value: string;
  sub: string;
  positive?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 text-center">
      <span className="type-eyebrow inline-flex items-center gap-1 text-muted-foreground">
        {label} <InfoTip text={tip} label={tipLabel} />
      </span>
      <span className={cn("font-mono text-xl font-bold tabular-nums leading-tight", positive && "text-positive")}>{value}</span>
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{sub}</span>
    </div>
  );
}

function GradeCard({
  desktop = false,
  showForecast = false,
  desktopTraits = [],
  sport,
  rank,
  row,
  player,
  lines,
  logo,
}: {
  desktop?: boolean;
  showForecast?: boolean;
  desktopTraits?: string[];
  sport: GradeSport;
  rank: number;
  row: PlayerIndexRow;
  player: GradedPlayer | undefined;
  lines: TraitLine[];
  logo: TeamLogoSource | undefined;
}) {
  const [open, setOpen] = useState(false);
  const panelId = `${sport}-player-card-${row.athleteId}${desktop ? "-desktop" : ""}`;
  const copy = SPORT_COPY[sport];
  const grade = player?.grade ?? row.grade;
  const rating = RATING_LABELS[row.positionGroup];
  const rated = rating != null && player?.rating != null;
  const sections: { kind: TraitSection | null; names: string[] }[] = [];
  for (const line of lines) {
    const last = sections[sections.length - 1];
    if (last && last.kind === line.kind) last.names.push(line.name);
    else sections.push({ kind: line.kind, names: [line.name] });
  }
  const details = (
      <div id={panelId} className={cn("space-y-3 p-3 md:block md:p-4", open ? "border-t border-border md:border-t-0" : "hidden")}>
        {!desktop && (
          <div className={cn("grid gap-2 py-1", rated ? "grid-cols-2 divide-x divide-border" : "grid-cols-1")}>
            {rated && (
              <Headline
                label={rating.label}
                tip={rating.tip}
                tipLabel="What is the forecast?"
                value={formatSigned(player.rating, 2)}
                sub={`${rating.unit}${player.ratingRange != null ? ` · range ±${formatNumber(player.ratingRange, 0)}` : ""}`}
                positive={player.rating != null && player.rating > 0}
              />
            )}
            <Headline
              label="WAR"
              tip={copy.warTip}
              tipLabel="What is wins above replacement?"
              value={player?.war == null ? EMPTY : formatSigned(player.war, 2)}
              sub={
                player == null
                  ? "loading"
                  : player.pointsAboveReplacement == null
                    ? "no credited plays"
                    : `${formatSigned(player.pointsAboveReplacement, 0)} pts`
              }
              positive={player?.war != null && player.war > 0}
            />
          </div>
        )}
        {player && (
          <Accordion.Root multiple className={desktop ? "grid grid-cols-2 items-start gap-x-8 gap-y-4" : "space-y-2"}>
            {sections.map((section) => {
              const label = section.kind ? TRAIT_SECTION_LABELS[section.kind].label : "Attributes";
              const traits = section.names.map((name) => (
                <TraitRow
                  key={name}
                  sport={sport}
                  name={name}
                  group={row.positionGroup}
                  trait={player.traits.find((t) => t.trait === name)}
                />
              ));
              const info = section.kind && (
                <InfoTip text={TRAIT_SECTION_LABELS[section.kind].tip} label={`What are ${label} measures?`} />
              );
              if (desktop || sport === "cfb") {
                return (
                  <section key={section.kind ?? "traits"} className="min-w-0 border-t border-border">
                    <div className="flex min-h-11 items-center gap-2">
                      <h3 className="font-mono text-xs">{label}</h3>
                      {info}
                    </div>
                    <div className="space-y-1.5 pb-3">{traits}</div>
                  </section>
                );
              }
              return (
                <Accordion.Item key={section.kind ?? "traits"} value={section.kind ?? "traits"} className="border-t border-border">
                  <div className="flex items-center gap-2">
                    <Accordion.Header className="min-w-0 flex-1">
                      <Accordion.Trigger className="group flex min-h-11 w-full items-center gap-2 rounded-sm text-left font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180" />
                        <span>{label}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">{section.names.length}</span>
                      </Accordion.Trigger>
                    </Accordion.Header>
                    {info}
                  </div>
                  <Accordion.Panel className="space-y-1.5 pb-3">
                    {traits}
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion.Root>
        )}
      </div>
  );
  if (desktop) {
    return (
      <Fragment>
        <TableRow onClick={() => setOpen(!open)} className={cn("cursor-pointer", open && "bg-muted/40")}>
          <TableCell className="text-xs text-muted-foreground">{rank}</TableCell>
          <TableCell className="font-sans">
            <button
              type="button"
              className="w-full text-left focus-visible:outline-2 focus-visible:outline-ring"
              aria-label={`${open ? "Hide" : "Show"} full player card for ${row.name}`}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={(event) => { event.stopPropagation(); setOpen(!open); }}
            >
              <Identity row={row} logo={logo} />
            </button>
          </TableCell>
          <TableCell className="text-center">{row.positionGroup}</TableCell>
          <TableCell className="text-center">{formatNumber(row.games, 0)}</TableCell>
          <TableCell className="text-center font-bold text-primary">{grade == null ? EMPTY : formatNumber(grade, 1)}</TableCell>
          <TableCell className="text-center">{player?.uncertainty == null ? EMPTY : `±${formatNumber(player.uncertainty, 1)}`}</TableCell>
          <TableCell className="text-center">{row.percentile == null ? EMPTY : Math.round(row.percentile)}</TableCell>
          {desktopTraits.map((name) => {
            const trait = player?.traits.find((item) => item.trait === name);
            return <TableCell key={name} className="text-center">{trait?.percentile == null ? EMPTY : Math.round(trait.percentile)}</TableCell>;
          })}
          {showForecast && (
            <TableCell className="text-center">
              {rated ? <><div>{formatSigned(player.rating, 2)}</div><div className="text-[11px] text-muted-foreground">{rating.unit}</div></> : EMPTY}
            </TableCell>
          )}
          <TableCell className="text-center">{player?.war == null ? EMPTY : formatSigned(player.war, 2)}</TableCell>
          <TableCell className="text-center">{player?.pointsAboveReplacement == null ? EMPTY : formatSigned(player.pointsAboveReplacement, 1)}</TableCell>
          <TableCell><ChevronDown aria-hidden="true" className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} /></TableCell>
        </TableRow>
        <TableRow hidden={!open} className="hover:bg-transparent">
          <TableCell colSpan={(showForecast ? 11 : 10) + desktopTraits.length} className="whitespace-normal bg-muted/20">{details}</TableCell>
        </TableRow>
      </Fragment>
    );
  }
  return (
    <article className="min-w-0 self-start border-b border-border md:rounded-lg md:border md:border-rule-strong md:bg-card">
      <PlayerRowDisclosure
        name={row.name}
        rank={rank}
        identity={<Identity row={row} logo={logo} />}
        grade={grade == null ? EMPTY : formatNumber(grade, 1)}
        open={open}
        panelId={panelId}
        onToggle={() => setOpen(!open)}
      />
      {details}
    </article>
  );
}

// Two players of one position side by side: the same measure rows as the
// cards, one bar growing left for the first player and one growing right for
// the second, percentiles at the edges.
function CompareRow({
  sport,
  name,
  left,
  right,
}: {
  sport: GradeSport;
  name: string;
  left: GradedPlayerTrait | undefined;
  right: GradedPlayerTrait | undefined;
}) {
  const { label, tip } = traitLabel(name, sport);
  const sample = left ?? right;
  const kind = isMeasureKind(sample?.kind) ? sample.kind : null;
  const style = kind === "style" || kind === "role";
  const dimmed = kind != null ? kind === "noise" : !(sample?.in_grade ?? false);
  const reliability = sample?.reliability ?? null;
  const pct = (t: GradedPlayerTrait | undefined) => t?.percentile ?? null;
  const bar = (t: GradedPlayerTrait | undefined, color: string, fromRight: boolean) => (
    <span className={cn("flex h-1.5 overflow-hidden rounded-[1px] bg-grid", fromRight && "justify-end")}>
      <span
        className={cn("block h-full", color, dimmed && "opacity-40")}
        style={{ width: `${pct(t) ?? 0}%`, ...(t?.kind === "inferred" ? INFERRED_FILL : {}) }}
      />
    </span>
  );
  const value = (t: GradedPlayerTrait | undefined) => (t?.value == null ? "" : ` (${formatNumber(t.value, 3)})`);
  return (
    <div
      className={cn(
        "grid grid-cols-[1.75rem_1fr_1fr_1.75rem] items-center gap-1.5 text-xs sm:grid-cols-[2.25rem_1fr_minmax(0,13rem)_1fr_2.25rem] sm:gap-2.5",
        dimmed && "text-muted-foreground"
      )}
    >
      <span className="text-left font-mono tabular-nums">{pct(left) == null ? EMPTY : Math.round(pct(left)!)}</span>
      {bar(left, style ? "bg-muted-foreground" : "bg-primary", true)}
      <span className="col-span-4 row-start-1 flex min-w-0 items-center justify-center gap-1.5 sm:col-span-1 sm:col-start-3">
        <span className="text-center">{label}</span>
        <InfoTip
          text={`${tip}${reliability != null ? ` Reliability: ${formatNumber(reliability, 2)}.` : ""}${value(left) || value(right) ? ` Values: left${value(left) || " unavailable"}, right${value(right) || " unavailable"}.` : ""}`}
          label={`What is ${label}?`}
        />
      </span>
      {bar(right, style ? "bg-muted-foreground/70" : "bg-accent-blue", false)}
      <span className="text-right font-mono tabular-nums">{pct(right) == null ? EMPTY : Math.round(pct(right)!)}</span>
    </div>
  );
}

function ComparePanel({
  sport,
  rows,
  players,
  lines,
  logoFor,
  onClear,
}: {
  sport: GradeSport;
  rows: [PlayerIndexRow, PlayerIndexRow];
  players: [GradedPlayer | undefined, GradedPlayer | undefined];
  lines: TraitLine[];
  logoFor: (team: string) => TeamLogoSource | undefined;
  onClear: () => void;
}) {
  const copy = SPORT_COPY[sport];
  const rating = RATING_LABELS[rows[0].positionGroup];
  const sections: { kind: TraitSection | null; names: string[] }[] = [];
  for (const line of lines) {
    const last = sections[sections.length - 1];
    if (last && last.kind === line.kind) last.names.push(line.name);
    else sections.push({ kind: line.kind, names: [line.name] });
  }
  const headline = (row: PlayerIndexRow, player: GradedPlayer | undefined, align: "left" | "right") => {
    const grade = player?.grade ?? row.grade;
    const items = [
      { label: "grade", value: grade == null ? EMPTY : formatNumber(grade, 1), sub: grade == null ? "" : `±${formatNumber(player?.uncertainty, 1)} · pct ${row.percentile == null ? EMPTY : Math.round(row.percentile)}` },
      ...(rating && player?.rating != null
        ? [{ label: rating.label, value: formatSigned(player.rating, 2), sub: rating.unit }]
        : []),
      { label: "WAR", value: player?.war == null ? EMPTY : formatSigned(player.war, 2), sub: player?.pointsAboveReplacement == null ? "" : `${formatSigned(player.pointsAboveReplacement, 0)} pts` },
    ];
    return (
      <div className={cn("grid gap-3 sm:flex sm:flex-wrap", align === "right" ? "justify-end text-right" : "text-left")}>
        {items.map((item) => (
          <div key={item.label} className={cn("flex flex-col", align === "right" ? "items-end" : "items-start")}>
            <span className="type-eyebrow text-muted-foreground">{item.label}</span>
            <span className="font-mono text-lg font-bold tabular-nums leading-tight">{item.value}</span>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{item.sub}</span>
          </div>
        ))}
      </div>
    );
  };
  return (
    <section aria-label="Player comparison" className="space-y-3 border border-rule-strong p-4">
      <div className="grid grid-cols-2 items-start gap-3">
        <Identity row={rows[0]} logo={logoFor(rows[0].team)} />
        <div className="col-span-2 row-start-1 flex items-center justify-between gap-2">
          <span className="type-eyebrow text-muted-foreground">
            {rows[0].positionGroup} comparison
          </span>
          <button
            type="button"
            onClick={onClear}
            className="type-eyebrow rounded-sm border border-border px-1.5 py-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            clear
          </button>
        </div>
        <div className="min-w-0">
          <Identity row={rows[1]} logo={logoFor(rows[1].team)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 border-y border-rule-strong py-3">
        {headline(rows[0], players[0], "left")}
        {headline(rows[1], players[1], "right")}
      </div>
      <p className="text-xs text-muted-foreground">
        Green bars grow left for {rows[0].name}, blue bars grow right for {rows[1].name}; every bar is the
        player&apos;s percentile among {copy.pool} at {rows[0].positionGroup} this week.
      </p>
      {players[0] && players[1] ? (
        <div className="space-y-2">
          {sections.map((section) => (
            <div key={section.kind ?? "traits"} className="space-y-1.5">
              {section.kind && (
                <div className="type-eyebrow flex items-center justify-center gap-1.5 pt-1 text-muted-foreground">
                  {TRAIT_SECTION_LABELS[section.kind].label}
                  <InfoTip text={TRAIT_SECTION_LABELS[section.kind].tip} label={`What are ${TRAIT_SECTION_LABELS[section.kind].label} measures?`} />
                </div>
              )}
              {section.names.map((name) => (
                <CompareRow
                  key={name}
                  sport={sport}
                  name={name}
                  left={players[0]?.traits.find((t) => t.trait === name)}
                  right={players[1]?.traits.find((t) => t.trait === name)}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">loading</p>
      )}
    </section>
  );
}

export default function PositionGrades({
  sport,
  season,
  index,
  details,
  gradedCounts,
  teams,
}: {
  sport: GradeSport;
  season: number;
  index: PlayerIndexRow[];
  details: Record<string, GradedPlayer>;
  gradedCounts: Record<string, number>;
  teams: GradeTeam[];
}) {
  const copy = SPORT_COPY[sport];
  const positions = POSITION_ORDER.filter((key) => index.some((row) => row.positionGroup === key)).map((key) => ({
    key,
    label: key,
  }));
  const [position, setPosition] = useState<PositionGroup>(positions[0]?.key ?? "QB");
  const [group, setGroup] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query.trim().toLowerCase());
  const [loaded, setLoaded] = useState<Record<string, GradedPlayer>>(details);
  // Up to two players of one position to set side by side; picking a player at
  // another position starts a new pair.
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const byId = useMemo(() => new Map(index.map((row) => [row.athleteId, row] as const)), [index]);

  const comparisonPlayers = useMemo(() => index.map((row) => ({ id: row.athleteId, label: `${row.name} · ${row.team} · ${row.positionGroup}`, group: row.positionGroup })), [index]);

  const groups = useMemo(() => {
    const names = new Set<string>();
    for (const row of index) if (row.group) names.add(row.group);
    return [{ key: ALL, label: copy.groupLabel }, ...[...names].sort().map((name) => ({ key: name, label: name }))];
  }, [index, copy.groupLabel]);
  const logoFor = useMemo(() => {
    const byName = new Map(teams.map((t) => [t.team, t] as const));
    return (team: string) => byName.get(team);
  }, [teams]);

  // A search runs across every position; otherwise the list is one position.
  const matches = useMemo(
    () =>
      index.filter(
        (row) =>
          (search ? row.name.toLowerCase().includes(search) || row.team.toLowerCase().includes(search) : row.positionGroup === position) &&
          (group === ALL || row.group === group)
      ),
    [index, search, position, group]
  );
  const visible = matches.slice(0, PAGE_ROWS);

  useEffect(() => {
    const wanted = [...visible.map((row) => row.athleteId), ...compare];
    const missing = [...new Set(wanted)].filter((id) => !loaded[id]);
    if (missing.length === 0) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ season: String(season), ids: missing.join(",") });
    fetch(`${copy.apiPath}?${params}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { players?: Record<string, GradedPlayer> } | null) => {
        if (body?.players) setLoaded((prev) => ({ ...prev, ...body.players }));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [visible, compare, loaded, season, copy.apiPath]);

  // The same rows on every card at a position, taken from every loaded player
  // of that position. A fitted rating's measures sit in sections by kind,
  // weighted measures first, then the most reliable. CFB groups the published
  // grade inputs separately from the remaining descriptive stats.
  const linesFor = useMemo(() => {
    const byGroup = new Map<string, Map<string, { inGrade: boolean; kind: TraitSection | null; reliability: number }>>();
    for (const row of index) {
      const player = loaded[row.athleteId];
      if (!player) continue;
      const names = byGroup.get(row.positionGroup) ?? new Map();
      for (const t of player.traits) {
        const seen = names.get(t.trait);
        names.set(t.trait, {
          inGrade: (seen?.inGrade ?? false) || t.in_grade,
          kind: isMeasureKind(t.kind) ? t.kind : null,
          reliability: Math.max(seen?.reliability ?? -1, t.reliability ?? -1),
        });
      }
      byGroup.set(row.positionGroup, names);
    }
    return (positionGroup: string): TraitLine[] =>
      [...(byGroup.get(positionGroup) ?? new Map()).entries()]
        .map(([name, meta]): [string, { inGrade: boolean; kind: TraitSection | null; reliability: number }] => [
          name,
          { ...meta, kind: sport === "cfb" ? (meta.inGrade ? "grade_inputs" : "context") : meta.kind },
        ])
        .sort(([a, x], [b, y]) => {
          const order: readonly TraitSection[] = sport === "cfb" ? CFB_SECTION_ORDER : KIND_ORDER;
          const kindRank = (k: TraitSection | null) => (k == null ? -1 : order.indexOf(k));
          return (
            kindRank(x.kind) - kindRank(y.kind) ||
            Number(y.inGrade) - Number(x.inGrade) ||
            y.reliability - x.reliability ||
            a.localeCompare(b)
          );
        })
        .map(([name, meta]) => ({ name, kind: meta.kind }));
  }, [index, loaded, sport]);
  const graded = gradedCounts[position] ?? 0;
  const showForecast = visible.some((row) => RATING_LABELS[row.positionGroup] != null && loaded[row.athleteId]?.rating != null);
  const desktopTraits = search ? [] : linesFor(position)
    .filter(({ name }) => visible.some((row) => loaded[row.athleteId]?.traits.some((trait) => trait.trait === name && trait.in_grade)))
    .slice(0, 2)
    .map(({ name }) => name);
  const renderPlayers = (desktop: boolean) => visible.map((row, i) => (
    <GradeCard
      key={row.athleteId}
      desktop={desktop}
      showForecast={showForecast}
      desktopTraits={desktopTraits}
      sport={sport}
      rank={i + 1}
      row={row}
      player={loaded[row.athleteId]}
      lines={linesFor(row.positionGroup)}
      logo={logoFor(row.team)}
    />
  ));

  return (
    <div className="space-y-section">
      <PlayerComparisonPicker players={comparisonPlayers} selected={compare} onChange={setCompare} description="Choose two players at the same position." disclosure={{ open: compareOpen, onOpenChange: setCompareOpen }} />
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
        <div className="col-span-2 min-w-0 overflow-x-auto">
        <ToggleGroup
          label="Position"
          options={positions}
          value={position}
          onChange={(next) => {
            setPosition(next);
            setCompare([]);
          }}
        />
        </div>
        <select
          aria-label={copy.groupLabel}
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="h-10 min-w-0 rounded-md border border-input bg-background px-2 text-sm"
        >
          {groups.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search player or team"
          aria-label="Search player or team"
          className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm sm:w-56"
        />
      </div>
      <p className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
        {search
          ? `${matches.length} player${matches.length === 1 ? "" : "s"} match “${query.trim()}”${group === ALL ? "" : ` in the ${group}`}, best grade first`
          : `Top ${visible.length} of ${matches.length} ${group === ALL ? "" : `${group} `}${position} · ${graded} graded this week`}
        <InfoTip
          text={`Percentiles among ${copy.pool} at the position this week. ${sport === "cfb" ? "Grade inputs contribute to the rating; More context does not. Solid bars use recorded plays or stats; striped bars are inferred from teammates or unit results. Dimmed: not graded." : "Solid: directly measured. Striped: inferred. Grey: style, not quality. Dimmed: not graded. The r is the stat’s reliability over 8 games: how well odd and even games agree, scaled to 8 games."}`}
          label="How to read the bars"
        />
      </p>
      {compare.length === 2 && byId.get(compare[0]) && byId.get(compare[1]) && (
        <ComparePanel
          sport={sport}
          rows={[byId.get(compare[0])!, byId.get(compare[1])!]}
          players={[loaded[compare[0]], loaded[compare[1]]]}
          lines={linesFor(byId.get(compare[0])!.positionGroup)}
          logoFor={logoFor}
          onClear={() => setCompare([])}
        />
      )}
      {compare.length === 1 && (
        <p className="text-xs text-muted-foreground">
          {byId.get(compare[0])?.name} selected. Pick another {byId.get(compare[0])?.positionGroup} to compare, or search for one.
        </p>
      )}
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No players match.</p>
      ) : (
        <div>
          <div className="grid grid-cols-1 md:hidden">
            <PlayerRowHeader />
            {renderPlayers(false)}
          </div>
          <div className="hidden md:block">
            <p className="pb-2 text-xs text-muted-foreground">Select a row for the full player card. ± is grade uncertainty; Pct and trait columns are position percentiles.</p>
            <Table className="table-fixed min-w-[1080px]">
              <colgroup>
                <col className="w-8" />
                <col className="w-[22%]" />
                <col className="w-12" />
                <col /><col /><col /><col />
                {desktopTraits.map((name) => <col key={name} className="w-28" />)}
                {showForecast && <col className="w-28" />}
                <col /><col />
                <col className="w-8" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">Pos</TableHead>
                  <TableHead className="text-center">Games</TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                  <TableHead className="text-center">±</TableHead>
                  <TableHead className="text-center">Pct</TableHead>
                  {desktopTraits.map((name) => {
                    const { label, tip } = traitLabel(name, sport);
                    return (
                      <TableHead key={name} className="text-center">
                        <span className="inline-flex items-center gap-1">
                          <span className="max-w-24 truncate" title={label}>{label}</span>
                          <InfoTip text={`${tip} Shown as a percentile at this position, matching the player card.`} label={`What is ${label}?`} />
                        </span>
                      </TableHead>
                    );
                  })}
                  {showForecast && <TableHead className="text-center">Forecast</TableHead>}
                  <TableHead className="text-center">WAR</TableHead>
                  <TableHead className="text-center"><span className="inline-flex items-center gap-1">Pts <InfoTip text="Points above replacement credited to this player, as shown in the full card." label="What are points above replacement?" /></span></TableHead>
                  <TableHead className="w-8"><span className="sr-only">Expand player</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderPlayers(true)}</TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
