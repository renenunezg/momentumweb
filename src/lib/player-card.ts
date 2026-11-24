// The rules of the opened player card, shared by the player grades page and
// the downloadable card image (share-poster): which headline numbers a player
// shows and how each reads, the order of his trait rows, and how a bar is drawn.

import { formatGrade, type GradedPlayer, type GradedPlayerTrait, type PlayerIndexRow } from "./position-grades.ts";
import {
  CFB_EFFICIENCY_TIP,
  CFB_FORM_TIP,
  CFB_SCOUTS_TIP,
  NFL_POSITION_RANK_TIP,
  NFL_SURPLUS_TIP,
  NFL_VALUE_TIP,
  RATING_LABELS,
  SECTION_ORDER,
  SPORT_COPY,
  isMeasureKind,
  traitRank,
  traitSection,
  type GradeSport,
  type TraitSection,
} from "./position-traits.ts";
import { EMPTY, formatNumber, formatSigned } from "./utils.ts";

// How a trait's bar is drawn. The card rows and their legend share it so the
// legend never describes a style the bars do not use.
export function barLook(trait: GradedPlayerTrait | undefined) {
  const kind = isMeasureKind(trait?.kind) ? trait.kind : null;
  return {
    kind,
    inferred: trait?.kind === "inferred",
    style: kind === "style" || kind === "role",
    dimmed: kind != null ? kind === "noise" : !(trait?.in_grade ?? false),
  };
}

// One trait line: the rows of a position's cards, in display order, with the
// kind each belongs to so the card can head each section once.
export interface TraitLine {
  name: string;
  kind: TraitSection | null;
}

// Point spread rating: the points his team's line gives up if he is ruled
// out of the next game, so a player above replacement reads positive.
export function formatPsr(spreadValue: number | null): string {
  return spreadValue == null ? EMPTY : formatSigned(spreadValue, 1);
}

// Whole millions of cap dollars, "$46M", or signed for a surplus: the ranges
// run to tens of millions, so a decimal would claim precision they lack.
export function formatMillions(value: number | null, signed = false): string {
  if (value == null) return EMPTY;
  const text = `$${Math.abs(value).toFixed(0)}M`;
  if (value < 0) return `−${text}`;
  return signed ? `+${text}` : text;
}

// Millions of revenue-share dollars at a readable grain: "$180K" under a
// million, "$2.4M" above it, signed for a surplus.
export function formatPay(value: number | null, signed = false): string {
  if (value == null) return EMPTY;
  const size = Math.abs(value);
  const text = size < 1 ? `$${Math.round(size * 1000)}K` : `$${size.toFixed(1)}M`;
  if (size < 0.0005) return "$0";
  if (value < 0) return `−${text}`;
  return signed ? `+${text}` : text;
}

// A surplus reads green when the player is worth more than he costs and red
// when he costs more than he is worth, and stays neutral when its range
// reaches across zero and so leaves the sign unsettled.
export function surplusTone(value: number | null | undefined, range?: number | null): string | undefined {
  if (value == null || value === 0) return undefined;
  if (range != null && Math.abs(value) <= Math.abs(range)) return undefined;
  return value > 0 ? "text-positive" : "text-destructive";
}

// The price card's sub line: its range and what set it.
export function paySub(player: GradedPlayer): string {
  const source = player.nilPriceSource === "portal" ? "portal rating" : "est. from production";
  return player.nilPriceRange == null ? source : `±${formatPay(player.nilPriceRange)} · ${source}`;
}

export function rangeSub(range: number | null): string {
  return range == null ? "rest of contract" : `±${formatMillions(Math.abs(range))} · rest of contract`;
}

// The grade's sub line: uncertainty and percentile.
export function gradeSub(player: GradedPlayer | undefined, percentile: number | null): string {
  return [
    player?.uncertainty == null ? null : `±${formatNumber(player.uncertainty, 1)}`,
    percentile == null ? null : `pct ${Math.round(percentile)}`,
  ].filter(Boolean).join(" · ");
}

export function signTone(value: number | null | undefined): string | undefined {
  if (value == null || value === 0) return undefined;
  return value > 0 ? "text-positive" : "text-destructive";
}

// The NIL figures are estimates, so the card shows them as one muted line
// below the headlines rather than as headlines.
export function nilLine(player: GradedPlayer): string {
  const range = player.nilPriceRange == null ? "" : ` ±${formatPay(player.nilPriceRange)}`;
  const source = player.nilPriceSource === "portal" ? " portal" : " est.";
  return [
    `NIL ${formatPay(player.nilPrice)}${range}${source}`,
    player.nilWorth == null ? null : `worth ${formatPay(player.nilWorth)}`,
    player.nilSurplus == null ? null : `surplus ${formatPay(player.nilSurplus, true)}`,
  ].filter(Boolean).join(" · ");
}

export type PositionRank = { rank: number; of: number };

// Each graded player's place by grade at his position across the whole index,
// so a filter or search does not move it; tied grades share a place.
export function rankByPosition(index: PlayerIndexRow[]): Map<string, PositionRank> {
  const groups = new Map<string, PlayerIndexRow[]>();
  for (const row of index) {
    if (row.grade == null) continue;
    groups.set(row.positionGroup, [...(groups.get(row.positionGroup) ?? []), row]);
  }
  const ranks = new Map<string, PositionRank>();
  for (const rows of groups.values()) {
    rows.sort((a, b) => b.grade! - a.grade!);
    rows.forEach((row, i) => {
      const rank = i > 0 && row.grade === rows[i - 1].grade ? ranks.get(rows[i - 1].athleteId)!.rank : i + 1;
      ranks.set(row.athleteId, { rank, of: rows.length });
    });
  }
  return ranks;
}

// The same rows on every card at a position, taken from every player passed
// in, in the sport's sections (traitSection): within one, weighted measures
// first, then a fixed place where the sport gives one, then the most reliable.
export function traitLines(sport: GradeSport, players: GradedPlayer[]): TraitLine[] {
  const names = new Map<string, { inGrade: boolean; kind: string | null; reliability: number }>();
  for (const player of players) {
    for (const t of player.traits) {
      const seen = names.get(t.trait);
      names.set(t.trait, {
        inGrade: (seen?.inGrade ?? false) || t.in_grade,
        kind: t.kind,
        reliability: Math.max(seen?.reliability ?? -1, t.reliability ?? -1),
      });
    }
  }
  const order = SECTION_ORDER[sport];
  const kindRank = (k: TraitSection | null) => (k == null ? -1 : order.indexOf(k));
  return [...names.entries()]
    .map(([name, meta]): [string, { inGrade: boolean; kind: TraitSection | null; reliability: number }] => [
      name,
      { ...meta, kind: traitSection(sport, name, meta.inGrade, meta.kind) },
    ])
    .sort(
      ([a, x], [b, y]) =>
        kindRank(x.kind) - kindRank(y.kind) ||
        Number(y.inGrade) - Number(x.inGrade) ||
        traitRank(a) - traitRank(b) ||
        y.reliability - x.reliability ||
        a.localeCompare(b),
    )
    .map(([name, meta]) => ({ name, kind: meta.kind }));
}

// Consecutive lines of one kind, so a card heads each section once.
export function traitSections(lines: TraitLine[]): { kind: TraitSection | null; names: string[] }[] {
  const sections: { kind: TraitSection | null; names: string[] }[] = [];
  for (const line of lines) {
    const last = sections[sections.length - 1];
    if (last && last.kind === line.kind) last.names.push(line.name);
    else sections.push({ kind: line.kind, names: [line.name] });
  }
  return sections;
}

export interface CardHeadline {
  key: "grade" | "rating" | "war" | "rank" | "scouts" | "efficiency" | "form" | "psr" | "value" | "surplus";
  label: string;
  tip: string;
  tipLabel: string;
  value: string;
  sub: string;
  // A text color token of the site, where the sign carries meaning.
  tone?: string;
}

// The headline numbers of a player's card, in card order. `failed` words the
// WAR line of a player whose full rows could not be loaded.
export function cardHeadlines({
  sport,
  row,
  player,
  positionRank,
  failed = false,
}: {
  sport: GradeSport;
  row: PlayerIndexRow;
  player: GradedPlayer | undefined;
  positionRank: PositionRank | undefined;
  failed?: boolean;
}): CardHeadline[] {
  const copy = SPORT_COPY[sport];
  const rating = RATING_LABELS[row.positionGroup];
  const cfb = sport === "cfb";
  const out: CardHeadline[] = [
    {
      key: "grade",
      label: "Grade",
      tip: copy.gradeTip,
      tipLabel: "What is the grade?",
      value: formatGrade(player?.grade ?? row.grade),
      sub: gradeSub(player, row.percentile),
    },
  ];
  if (rating != null && player?.rating != null) {
    out.push({
      key: "rating",
      label: rating.label,
      tip: rating.tip,
      tipLabel: `What is the ${rating.label.toLowerCase()}?`,
      value: formatSigned(player.rating, rating.digits ?? 2),
      sub: `${rating.unit}${player.ratingRange != null ? ` · range ±${formatNumber(player.ratingRange, 2)}` : ""}`,
      tone: player.rating > 0 ? "text-positive" : undefined,
    });
  }
  if (copy.warTip != null) {
    out.push({
      key: "war",
      label: "WAR",
      tip: copy.warTip,
      tipLabel: "What is wins above replacement?",
      value: player?.war == null ? EMPTY : formatSigned(player.war, 2),
      sub:
        player == null
          ? failed ? "unavailable" : "loading"
          : player.pointsAboveReplacement == null
            ? "no credited plays"
            : [
                `${formatSigned(player.pointsAboveReplacement, 0)} pts`,
                player.warPercentile == null ? null : `pct ${Math.round(player.warPercentile)}`,
              ].filter(Boolean).join(" · "),
      tone: player?.war != null && player.war > 0 ? "text-positive" : undefined,
    });
  }
  if (sport === "nfl" && positionRank != null) {
    out.push({
      key: "rank",
      label: "Position rank",
      tip: NFL_POSITION_RANK_TIP,
      tipLabel: "What is the position rank?",
      value: `${row.positionGroup} #${positionRank.rank}`,
      sub: `of ${positionRank.of} graded`,
    });
  }
  if (cfb && player?.scoutRank != null) {
    out.push({
      key: "scouts",
      label: "Scouts",
      tip: CFB_SCOUTS_TIP,
      tipLabel: "What is the scouts' rank?",
      value: `${player.scoutPosition} #${player.scoutRank}`,
      sub: "draft board",
    });
  }
  if (cfb && player?.efficiency != null) {
    out.push({
      key: "efficiency",
      label: "Efficiency",
      tip: CFB_EFFICIENCY_TIP,
      tipLabel: "What is efficiency?",
      value: formatSigned(player.efficiency, 2),
      sub: [
        "EPA per play",
        player.efficiencyPercentile == null ? null : `pct ${Math.round(player.efficiencyPercentile)}`,
      ].filter(Boolean).join(" · "),
    });
  }
  if (cfb && player?.form != null) {
    out.push({
      key: "form",
      label: "Form",
      tip: CFB_FORM_TIP,
      tipLabel: "What is form?",
      value: formatSigned(player.form, 1),
      sub: "last 3 vs season",
      tone: signTone(player.form),
    });
  }
  if (copy.spreadTip != null && player?.spreadValue != null) {
    out.push({
      key: "psr",
      label: "PSR",
      tip: copy.spreadTip,
      tipLabel: "What is PSR?",
      value: formatPsr(player.spreadValue),
      sub: "pts if ruled out",
    });
  }
  if (sport === "nfl" && player?.playerValue != null) {
    out.push(
      {
        key: "value",
        label: "Contract value",
        tip: NFL_VALUE_TIP,
        tipLabel: "What is contract value?",
        value: formatMillions(player.playerValue),
        sub: rangeSub(player.playerValueRange),
      },
      {
        key: "surplus",
        label: "Surplus",
        tip: NFL_SURPLUS_TIP,
        tipLabel: "What is contract surplus?",
        value: formatMillions(player.contractSurplus, true),
        sub: rangeSub(player.contractSurplusRange),
        tone: surplusTone(player.contractSurplus, player.contractSurplusRange),
      },
    );
  }
  return out;
}
