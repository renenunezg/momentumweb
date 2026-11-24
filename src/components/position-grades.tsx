"use client";

import { Accordion } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";
import { Fragment, type ReactNode, useDeferredValue, useEffect, useMemo, useState } from "react";
import { GRADE_ROWS, defaultPosition, formatGrade, type GradedPlayer, type GradedPlayerTrait, type GradeTeam, type PlayerIndexRow } from "@/lib/position-grades";
import {
  TRAIT_SECTION_LABELS,
  POSITION_LABELS,
  POSITION_ORDER,
  RATING_LABELS,
  SPORT_COPY,
  isUnitRow,
  traitLabel,
  type GradeSport,
  type PositionGroup,
  NFL_SURPLUS_TIP,
  NFL_VALUE_TIP,
  CFB_NIL_PRICE_TIP,
  CFB_NIL_SURPLUS_TIP,
} from "@/lib/position-traits";
import { EMPTY, cn, formatNumber, formatSigned, slug } from "@/lib/utils";
import { InfoTip } from "@/components/info-tip";
import { PlayerRowDisclosure, PlayerRowHeader } from "@/components/player-row-disclosure";
import { PlayerCell } from "@/components/player-cell";
import {
  barLook,
  cardHeadlines,
  compareHeadlines,
  formatMillions,
  formatPay,
  formatPsr,
  nilLine,
  rankByPosition,
  surplusTone,
  traitLines,
  traitSections,
  type CardHeadline,
  type PositionRank,
  type TraitLine,
} from "@/lib/player-card";
import { DownloadCardLink } from "@/components/download-card-link";
import { SeasonStatsPanel } from "@/components/season-stats-panel";
import { footballSeasonStats } from "@/lib/football-season-stats";
import { hockeySeasonStats } from "@/lib/hockey-season-stats";
import { TeamLogo, type TeamLogoSource } from "@/components/team-logo";
import { PlayerComparisonPicker } from "@/components/player-comparison-picker";
import { PositionLeaderTabs, surname, type PositionLeader } from "@/components/position-leader-tabs";
import { cfbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ALL = "all";
// The headlines the desktop row has no column for.
const EXTRA_HEADLINES = new Set<CardHeadline["key"]>(["rank", "scouts", "efficiency", "form"]);
// More trait rows than this fold a phone card's sections.
const FOLD_ROWS = 12;

// Diagonal stripes mark a trait inferred from unit outcomes or teammates
// rather than counted from the player's own tagged plays.
const INFERRED_FILL = {
  backgroundImage:
    "repeating-linear-gradient(45deg, transparent 0 3px, color-mix(in oklch, var(--background) 45%, transparent) 3px 6px)",
};

function BarLegend({ traits }: { traits: GradedPlayerTrait[] }) {
  const looks = traits.map(barLook);
  const items = [
    { label: "Measured", swatch: "bg-primary", show: true },
    { label: "Inferred from teammates or unit results", swatch: "bg-accent-blue", fill: INFERRED_FILL, show: looks.some((l) => l.inferred) },
    { label: "Style or role", swatch: "bg-muted-foreground", show: looks.some((l) => l.style) },
    { label: "Not graded", swatch: "bg-primary opacity-40", show: looks.some((l) => l.dimmed) },
  ].filter((item) => item.show);
  return (
    <ul aria-label="Bar key" className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={cn("h-1.5 w-4 rounded-[1px]", item.swatch)} style={item.fill} />
          {item.label}
        </li>
      ))}
    </ul>
  );
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
  const { label, short = label, tip } = traitLabel(name, sport);
  const inGrade = trait?.in_grade ?? false;
  const { kind, inferred, style, dimmed } = barLook(trait);
  const noise = kind === "noise";
  const reliability = trait?.reliability ?? null;
  const pct = trait?.percentile ?? null;
  const detail = trait == null
    ? `${tip} No value for this player yet.`
    : kind != null
      ? `${tip}${inGrade ? " Used in the grade." : style ? " Higher is not necessarily better." : noise ? " Swings from game to game and does not help the forecast, so not graded." : " Not used in the grade."}`
      : inGrade
        ? tip
        : `${tip} Not used in the ${group} grade.`;
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-x-2 gap-y-1 text-xs sm:grid-cols-[minmax(0,16rem)_1fr_2.25rem] sm:gap-x-4",
        dimmed && "text-muted-foreground"
      )}
    >
      <span className="col-span-2 flex min-w-0 items-center justify-between gap-1.5 sm:col-span-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{short}</span>
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
          {/* The CFB card already splits grade inputs from context, so only the NFL's measure sections tag them. */}
          {sport === "nfl" && (
            <span
              className={cn(
                "type-eyebrow whitespace-nowrap rounded-sm px-1 text-center",
                inGrade ? "bg-muted text-positive" : "invisible"
              )}
            >
              grade
            </span>
          )}
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

// One grid for every headline on the card, so the columns line up however
// many there are. NFL cards wrap past three into rows of two on a phone; CFB
// cards show their first three there and the rest from the small breakpoint.
const HEADLINE_GRID: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  // On a phone the fifth headline spans the row rather than sit alone in a half.
  5: "grid-cols-2 sm:grid-cols-5 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1",
  6: "grid-cols-2 sm:grid-cols-3",
  7: "grid-cols-2 sm:grid-cols-4 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1",
};
const PHONE_GRID: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2",
  5: "grid-cols-3",
  6: "grid-cols-3",
};
const WIDE_GRID: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
  6: "sm:grid-cols-3",
  7: "sm:grid-cols-4",
};

function Headline({
  label,
  tip,
  tipLabel,
  value,
  sub,
  tone,
  className,
}: {
  label: string;
  tip: string;
  tipLabel: string;
  value: string;
  sub: ReactNode;
  tone?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col items-center gap-1 text-center", className)}>
      <span className="type-eyebrow inline-flex items-center gap-1 text-muted-foreground">
        {label} <InfoTip text={tip} label={tipLabel} />
      </span>
      <span className={cn("font-mono text-xl font-bold tabular-nums leading-tight", tone)}>{value}</span>
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{sub}</span>
    </div>
  );
}

function GradeCard({
  desktop = false,
  showUncertainty = true,
  showForecast = false,
  showSpread = false,
  showValue = false,
  showNil = false,
  showNilSurplus = false,
  desktopTraits = [],
  forecastInHeader = false,
  failed = false,
  sport,
  rank,
  positionRank,
  row,
  player,
  lines,
  logo,
}: {
  desktop?: boolean;
  showUncertainty?: boolean;
  showForecast?: boolean;
  showSpread?: boolean;
  showValue?: boolean;
  showNil?: boolean;
  showNilSurplus?: boolean;
  desktopTraits?: string[];
  forecastInHeader?: boolean;
  failed?: boolean;
  sport: GradeSport;
  rank: number;
  positionRank: PositionRank | undefined;
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
  const cfb = sport === "cfb";
  const nilPriced = cfb && player?.nilPrice != null;
  const all = cardHeadlines({ sport, row, player, positionRank, failed });
  const has = (key: CardHeadline["key"]) => all.some((h) => h.key === key);
  // Position rank, scouts, efficiency and form: headlines on the phone card and the
  // desktop panel alike, since the desktop row has columns for grade and WAR but not for these.
  const extraHeadlines = all.filter((h) => EXTRA_HEADLINES.has(h.key));
  const extras = extraHeadlines.length;
  // A CFB phone card keeps grade and WAR and adds scouts and form; efficiency
  // stands in only for a player with neither.
  const phoneEfficiency = has("efficiency") && !has("scouts") && !has("form");
  const phoneHeadlines = all.length - Number(has("efficiency") && !phoneEfficiency);
  const headlineGrid = cfb ? cn(PHONE_GRID[phoneHeadlines], WIDE_GRID[all.length]) : HEADLINE_GRID[all.length];
  const headline = (h: CardHeadline) => (
    <Headline
      key={h.key}
      label={h.label}
      tip={h.tip}
      tipLabel={h.tipLabel}
      value={h.value}
      sub={h.sub}
      tone={h.tone}
      className={h.key === "efficiency" && !desktop && !phoneEfficiency ? "hidden sm:flex" : undefined}
    />
  );
  // A long card folds its sections on a phone so the stat lines stay in reach;
  // a short one keeps every row open.
  const folded = !desktop && lines.length > FOLD_ROWS;
  const seasonStats =
    sport === "nhl" ? hockeySeasonStats(player?.seasonStats) : footballSeasonStats(sport, player?.seasonStats);
  const sections = traitSections(lines);
  // On the desktop card the extra headlines fill the space under the shorter
  // second section when there are exactly two; otherwise they lead the card.
  const besideContext = desktop && sections.length === 2 && !folded;
  const desktopHeadlines = (
    <div className={cn("flex flex-wrap gap-x-12 gap-y-4 [&>*]:items-start [&>*]:text-left", besideContext && "col-start-2 border-t border-border pt-4")}>
      {extraHeadlines.map(headline)}
    </div>
  );
  const details = (
      // A card renders only once opened: forty closed cards in both layouts
      // would otherwise be most of the page's HTML.
      <div id={panelId} className={cn("space-y-3 p-3 md:block md:space-y-5 md:px-6 md:py-5", open ? "border-t border-border md:border-t-0" : "hidden")}>
        {open && <>
        {!desktop && (
          <div className={cn("grid gap-x-3 gap-y-5 py-1", headlineGrid)}>{all.map(headline)}</div>
        )}
        {desktop && extras > 0 && !besideContext && desktopHeadlines}
        {!desktop && nilPriced && (
          <p className="flex flex-wrap items-center justify-center gap-1 text-center font-mono text-[11px] text-muted-foreground">
            {nilLine(player)} <InfoTip text={CFB_NIL_PRICE_TIP} label="What is NIL price?" />
          </p>
        )}
        {player == null && failed && (
          <p className="text-xs text-muted-foreground">This player&apos;s card could not be loaded. Reload the page to try again.</p>
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
              if (!folded) {
                // A lone section on the desktop card takes the full width and splits its rows into two columns.
                const lone = desktop && sections.length === 1;
                return (
                  <section
                    key={section.kind ?? "traits"}
                    className={cn("min-w-0 border-t border-border", lone && "col-span-2", besideContext && extras > 0 && section === sections[0] && "row-span-2")}
                  >
                    <div className="flex min-h-11 items-center gap-2">
                      <h3 className="font-mono text-xs">{label}</h3>
                      {info}
                    </div>
                    <div className={cn("pb-3", lone ? "grid grid-cols-2 gap-x-12 gap-y-2" : "space-y-1.5")}>{traits}</div>
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
            {besideContext && extras > 0 && desktopHeadlines}
          </Accordion.Root>
        )}
        {player && <BarLegend traits={player.traits.filter((t) => lines.some((line) => line.name === t.trait))} />}
        {seasonStats && <SeasonStatsPanel stats={seasonStats} />}
        {player && (
          <div className="flex justify-end">
            <DownloadCardLink
              href={`/${sport}/players/card/${row.positionGroup.toLowerCase()}/${encodeURIComponent(row.athleteId)}`}
              filename={`${sport}-${slug(row.name)}-card.png`}
              label="Download card"
            />
          </div>
        )}
        </>}
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
          <TableCell className="text-center font-bold text-primary">{formatGrade(grade)}</TableCell>
          {showUncertainty && <TableCell className="text-center">{player?.uncertainty == null ? EMPTY : `±${formatNumber(player.uncertainty, 1)}`}</TableCell>}
          <TableCell className="text-center">{row.percentile == null ? EMPTY : Math.round(row.percentile)}</TableCell>
          {desktopTraits.map((name) => {
            const trait = player?.traits.find((item) => item.trait === name);
            return <TableCell key={name} className="text-center">{trait?.percentile == null ? EMPTY : Math.round(trait.percentile)}</TableCell>;
          })}
          {showForecast && (
            <TableCell className="text-center">
              {rated ? <><div>{formatSigned(player.rating, rating.digits ?? 2)}</div>{!forecastInHeader && <div className="whitespace-normal text-[11px] leading-tight text-muted-foreground">{rating.unit}</div>}</> : EMPTY}
            </TableCell>
          )}
          {copy.warTip != null && <TableCell className="text-center">{player?.war == null ? EMPTY : formatSigned(player.war, 2)}</TableCell>}
          {showSpread && <TableCell className="text-center">{player?.spreadValue == null ? EMPTY : formatPsr(player.spreadValue)}</TableCell>}
          {showValue && <TableCell className="text-center">{formatMillions(player?.playerValue ?? null)}</TableCell>}
          {showValue && <TableCell className={cn("text-center", surplusTone(player?.contractSurplus, player?.contractSurplusRange))}>{formatMillions(player?.contractSurplus ?? null, true)}</TableCell>}
          {showNil && (
            <TableCell className="text-center">
              <div className={cn(player?.nilPriceSource === "production" && "text-muted-foreground")}>{formatPay(player?.nilPrice ?? null)}</div>
              {player?.nilPriceSource === "portal" && <div className="text-[11px] text-muted-foreground">portal</div>}
            </TableCell>
          )}
          {showNilSurplus && <TableCell className={cn("text-center", surplusTone(player?.nilSurplus))}>{formatPay(player?.nilSurplus ?? null, true)}</TableCell>}
          <TableCell><ChevronDown aria-hidden="true" className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} /></TableCell>
        </TableRow>
        <TableRow hidden={!open} className="hover:bg-transparent">
          <TableCell colSpan={7 + Number(showUncertainty) + Number(showForecast) + Number(copy.warTip != null) + (showSpread ? 1 : 0) + (showValue ? 2 : 0) + (showNil ? 1 : 0) + (showNilSurplus ? 1 : 0) + desktopTraits.length} className="whitespace-normal bg-muted/20">{details}</TableCell>
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
        grade={formatGrade(grade)}
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
  const { label, short = label, tip } = traitLabel(name, sport);
  const sample = left ?? right;
  const { style, dimmed } = barLook(sample);
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
        <span className="text-center">{short}</span>
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
  failed,
}: {
  sport: GradeSport;
  rows: [PlayerIndexRow, PlayerIndexRow];
  players: [GradedPlayer | undefined, GradedPlayer | undefined];
  lines: TraitLine[];
  logoFor: (team: string) => TeamLogoSource | undefined;
  onClear: () => void;
  failed: boolean;
}) {
  const copy = SPORT_COPY[sport];
  const sections = traitSections(lines);
  const headline = (row: PlayerIndexRow, player: GradedPlayer | undefined, align: "left" | "right") => {
    const items = compareHeadlines({ sport, row, player });
    return (
      <div className={cn("grid gap-3 sm:flex sm:flex-wrap", align === "right" ? "justify-end text-right" : "text-left")}>
        {items.map((item) => (
          <div key={item.label} className={cn("flex flex-col", align === "right" ? "items-end" : "items-start")}>
            <span className="type-eyebrow text-muted-foreground">{item.label}</span>
            <span className={cn("font-mono text-lg font-bold tabular-nums leading-tight", item.tone)}>{item.value}</span>
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
          <span className="flex items-center gap-2">
            {players[0] && players[1] && (
              <DownloadCardLink
                compact
                href={`/${sport}/players/card/${rows[0].positionGroup.toLowerCase()}/${encodeURIComponent(rows[0].athleteId)}/vs/${encodeURIComponent(rows[1].athleteId)}`}
                filename={`${sport}-${slug(rows[0].name)}-vs-${slug(rows[1].name)}.png`}
              />
            )}
            <button
              type="button"
              onClick={onClear}
              className="type-eyebrow rounded-sm border border-border px-1.5 py-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              clear
            </button>
          </span>
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
        Each bar is the player&apos;s percentile among {copy.pool} at {rows[0].positionGroup} this week.
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
        <p className="text-xs text-muted-foreground">{failed ? "These players could not be loaded. Reload the page to try again." : "loading"}</p>
      )}
    </section>
  );
}

export default function PositionGrades({
  sport,
  season,
  index,
  details,
  teams,
}: {
  sport: GradeSport;
  season: number;
  index: PlayerIndexRow[];
  details: Record<string, GradedPlayer>;
  teams: GradeTeam[];
}) {
  const copy = SPORT_COPY[sport];
  const positions = useMemo(() => POSITION_ORDER.filter((key) => index.some((row) => row.positionGroup === key)), [index]);
  // The server sent full cards for this position only.
  const [position, setPosition] = useState<PositionGroup>(() => defaultPosition(index));
  const [group, setGroup] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query.trim().toLowerCase());
  const [loaded, setLoaded] = useState<Record<string, GradedPlayer>>(details);
  // Ids whose card request failed: they are not asked for again, so the cards
  // say so instead of loading forever.
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  // Up to two players of one position to set side by side; picking a player at
  // another position starts a new pair.
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const byId = useMemo(() => new Map(index.map((row) => [row.athleteId, row] as const)), [index]);
  const positionRanks = useMemo(() => (sport === "nfl" ? rankByPosition(index) : new Map<string, PositionRank>()), [index, sport]);

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
  const visible = matches.slice(0, GRADE_ROWS);

  // The index is ranked best grade first, so each position's first match is its leader.
  const leaderOptions = useMemo(() => positions.map((key) => {
    const row = index.find((r) => r.positionGroup === key && r.grade != null && (group === ALL || r.group === group));
    const label = POSITION_LABELS[key];
    if (!row) return { key, label, leader: null };
    const unit = isUnitRow(row.athleteId);
    const leader: PositionLeader = {
      name: unit ? `${row.team} offensive line` : row.name,
      short: unit ? `${row.team} line` : surname(row.name),
      image: unit ? <TeamLogo team={logoFor(row.team)} name={row.team} className="h-8 w-8" /> : undefined,
      headshotUrl: row.headshotUrl ?? cfbPlayerHeadshotUrl(row.athleteId),
      stat: formatGrade(row.grade),
    };
    return { key, label, leader };
  }), [positions, index, group, logoFor]);

  useEffect(() => {
    const wanted = [...visible.map((row) => row.athleteId), ...compare];
    const missing = [...new Set(wanted)].filter((id) => !loaded[id] && !failed.has(id));
    if (missing.length === 0) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ season: String(season), ids: missing.join(",") });
    const giveUp = (ids: string[]) => setFailed((prev) => new Set([...prev, ...ids]));
    fetch(`${copy.apiPath}?${params}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`player traits ${res.status}`);
        return res.json() as Promise<{ players?: Record<string, GradedPlayer> }>;
      })
      .then((body) => {
        const players = body.players ?? {};
        setLoaded((prev) => ({ ...prev, ...players }));
        const absent = missing.filter((id) => !players[id]);
        if (absent.length > 0) giveUp(absent);
      })
      .catch(() => {
        if (!controller.signal.aborted) giveUp(missing);
      });
    return () => controller.abort();
  }, [visible, compare, loaded, failed, season, copy.apiPath]);

  // The same rows on every card at a position, taken from every loaded player
  // of that position, in the sport's sections (traitSection): within one,
  // weighted measures first, then a fixed place where the sport gives one,
  // then the most reliable.
  const linesFor = useMemo(() => {
    const byGroup = new Map<string, GradedPlayer[]>();
    for (const row of index) {
      const player = loaded[row.athleteId];
      if (player) byGroup.set(row.positionGroup, [...(byGroup.get(row.positionGroup) ?? []), player]);
    }
    const lines = new Map([...byGroup].map(([group, players]) => [group, traitLines(sport, players)]));
    return (positionGroup: string): TraitLine[] => lines.get(positionGroup) ?? [];
  }, [index, loaded, sport]);
  // A position whose loaded players carry no grade uncertainty has no ± column;
  // it stays while cards load so a table that has one does not shift.
  const showUncertainty = visible.some((row) => {
    const player = loaded[row.athleteId];
    return player == null || player.uncertainty != null;
  });
  const ratedRow = visible.find((row) => RATING_LABELS[row.positionGroup] != null && loaded[row.athleteId]?.rating != null);
  const showForecast = ratedRow != null;
  // One position on screen shares one forecast unit, so the header carries it;
  // a search can mix positions, so each cell keeps its own.
  const headerRating = search ? null : RATING_LABELS[position] ?? null;
  const showSpread = copy.spreadTip != null && visible.some((row) => loaded[row.athleteId]?.spreadValue != null);
  const showValue = visible.some((row) => loaded[row.athleteId]?.playerValue != null);
  const showNil = sport === "cfb" && visible.some((row) => loaded[row.athleteId]?.nilPrice != null);
  const showNilSurplus = sport === "cfb" && visible.some((row) => loaded[row.athleteId]?.nilSurplus != null);
  const desktopTraits = search ? [] : (copy.tableTraits ?? linesFor(position).map(({ name }) => name))
    .filter((name) => visible.some((row) => loaded[row.athleteId]?.traits.some((trait) => trait.trait === name && trait.in_grade)))
    // The NFL value columns and the CFB price column take the second trait column's room.
    .slice(0, showValue || showNil ? 1 : 2);
  const renderPlayers = (desktop: boolean) => visible.map((row, i) => (
    <GradeCard
      key={row.athleteId}
      desktop={desktop}
      showUncertainty={showUncertainty}
      showForecast={showForecast}
      showSpread={showSpread}
      showValue={showValue}
      showNil={showNil}
      showNilSurplus={showNilSurplus}
      desktopTraits={desktopTraits}
      forecastInHeader={headerRating != null}
      failed={failed.has(row.athleteId)}
      sport={sport}
      rank={i + 1}
      positionRank={positionRanks.get(row.athleteId)}
      row={row}
      player={loaded[row.athleteId]}
      lines={linesFor(row.positionGroup)}
      logo={logoFor(row.team)}
    />
  ));

  return (
    <div className="space-y-section">
      <div className="space-y-3">
        <PositionLeaderTabs
          label="Position"
          options={leaderOptions}
          value={search ? null : position}
          onChange={(next) => {
            setPosition(next);
            setQuery("");
            setCompare([]);
          }}
        />
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
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
          <DownloadCardLink
            href={`/${sport}/players/card/${position.toLowerCase()}`}
            filename={`${sport}-${position.toLowerCase()}-grades-${season}.png`}
            label={`${position} top 10 PNG`}
            className="h-10 border border-input bg-background px-3 text-foreground max-sm:col-span-2"
          />
        </div>
      </div>
      <PlayerComparisonPicker players={comparisonPlayers} selected={compare} onChange={setCompare} description="Choose two players at the same position." disclosure={{ open: compareOpen, onOpenChange: setCompareOpen }} />
      <p className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
        {search
          ? `${matches.length} player${matches.length === 1 ? "" : "s"} match "${query.trim()}"${group === ALL ? "" : ` in the ${group}`}, best grade first`
          : `${visible.length === matches.length ? `All ${matches.length}` : `Top ${visible.length} of ${matches.length}`} ${group === ALL ? "" : `${group} `}${position} graded this week`}
        <InfoTip
          text={`Percentiles among ${copy.pool} at the position this week. ${sport === "nhl" ? "Each bar places one part of the player's value among his position: for skaters, goals per 82 games above an average skater there; for goalies, goals saved per 60 minutes above expected. Each player card has a key to its bar colors." : sport === "cfb" ? "Grade inputs contribute to the rating, and More context does not. Each player card has a key to its bar colors." : `Each player card has a key to its bar colors. The r is the stat’s reliability over 8 games: how well odd and even games agree, scaled to 8 games.${headerRating ? " GRADE marks the inputs of the fitted forecast. An input earns its place by improving the forecast, so a low r can still be graded: the forecast reads the stat weighted by volume." : ""}`}`}
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
          failed={compare.some((id) => failed.has(id))}
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
            <p className="pb-2 text-xs text-muted-foreground">{showUncertainty && "± is grade uncertainty. "}Pct and trait columns are position percentiles.</p>
            <Table className="table-fixed min-w-[1080px]">
              <colgroup>
                <col className="w-8" />
                <col />
                <col className="w-12" />
                <col className="w-16" />
                <col className="w-16" />
                {showUncertainty && <col className="w-12" />}
                <col className="w-12" />
                {desktopTraits.map((name) => <col key={name} className="w-34" />)}
                {showForecast && <col className="w-32" />}
                {copy.warTip != null && <col className="w-16" />}
                {showSpread && <col className="w-18" />}
                {showValue && <col className="w-24" />}
                {showValue && <col className="w-20" />}
                {showNil && <col className="w-24" />}
                {showNilSurplus && <col className="w-20" />}
                <col className="w-8" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">Pos</TableHead>
                  <TableHead className="text-center">Games</TableHead>
                  <TableHead className="text-center"><span className="inline-flex items-center gap-1">Grade <InfoTip text={copy.gradeTip} label="What is the grade?" /></span></TableHead>
                  {showUncertainty && <TableHead className="text-center">±</TableHead>}
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
                  {ratedRow && (
                    <TableHead className="text-center">
                      <span className="inline-flex items-center gap-1">
                        {RATING_LABELS[ratedRow.positionGroup].label}
                        {headerRating && <InfoTip text={headerRating.tip} label={`What is the ${headerRating.label.toLowerCase()}?`} />}
                      </span>
                      {headerRating && <div className="whitespace-normal text-[10px] font-normal normal-case leading-tight">{headerRating.unit}</div>}
                    </TableHead>
                  )}
                  {copy.warTip != null && <TableHead className="text-center"><span className="inline-flex items-center gap-1">WAR <InfoTip text={copy.warTip} label="What is wins above replacement?" /></span></TableHead>}
                  {showSpread && <TableHead className="text-center"><span className="inline-flex items-center gap-1">PSR <InfoTip text={copy.spreadTip ?? ""} label="What is PSR?" /></span></TableHead>}
                  {showValue && <TableHead className="whitespace-normal text-center leading-tight"><span className="inline-flex items-center gap-1">Contract value <InfoTip text={NFL_VALUE_TIP} label="What is contract value?" /></span></TableHead>}
                  {showValue && <TableHead className="text-center"><span className="inline-flex items-center gap-1">Surplus <InfoTip text={NFL_SURPLUS_TIP} label="What is contract surplus?" /></span></TableHead>}
                  {showNil && <TableHead className="text-center"><span className="inline-flex items-center gap-1">NIL price <InfoTip text={CFB_NIL_PRICE_TIP} label="What is NIL price?" /></span></TableHead>}
                  {showNilSurplus && <TableHead className="text-center"><span className="inline-flex items-center gap-1">Surplus <InfoTip text={CFB_NIL_SURPLUS_TIP} label="What is surplus?" /></span></TableHead>}
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
