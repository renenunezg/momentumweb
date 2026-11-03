// The player grades page's data model, shared by college football and the
// NFL. Each sport's lib reads its own position_traits table and maps the rows
// through these helpers, so the page and its card component never know which
// schema they are rendering.

import { footballStatsLine, type FootballStatsLine } from "./football-season-stats.ts";

// The columns both position_traits tables carry. The CFB table also has a
// team_id and the NFL table a headshot_url; neither is needed here beyond the
// optional headshot.
export interface PositionTraitRow {
  season: number;
  week: number;
  as_of: string;
  model_version: string;
  athlete_id: string;
  athlete_name: string | null;
  headshot_url?: string | null;
  team: string | null;
  position_group: string;
  games: number | null;
  trait: string;
  value: number | null;
  percentile: number | null;
  kind: string | null;
  in_grade: boolean;
  uncertainty: number | null;
  reliability?: number | null;
  points_above_replacement: number | null;
}

// Identity and publication metadata belong to the player and page, not every
// trait in the cached browser payload. Keep every field the cards and comparison use.
export type GradedPlayerTrait = Pick<PositionTraitRow,
  "trait" | "value" | "percentile" | "kind" | "in_grade" | "reliability"
>;

export interface GradedPlayer {
  athleteId: string;
  name: string;
  team: string;
  headshotUrl: string | null;
  games: number | null;
  grade: number | null;
  gradePercentile: number | null;
  uncertainty: number | null;
  // The fitted forecast behind a rated position's grade, in its own units
  // (EPA per dropback for a passer, EPA per game for a back), with the
  // out-of-sample range of outcomes.
  rating: number | null;
  ratingRange: number | null;
  war: number | null;
  warPercentile: number | null;
  pointsAboveReplacement: number | null;
  // NFL only: points the team model's line gives up if he is ruled out of
  // the next game, as its absence layer prices it.
  spreadValue: number | null;
  traits: GradedPlayerTrait[];
  seasonStats: FootballStatsLine | null;
}

// A row of the sport's player_season_stats, read for the same ids as the traits.
export interface PlayerSeasonStatsRow {
  athlete_id: string;
  season: number;
  week: number;
  position_group: string;
  stats: unknown;
}

export const STATS_COLUMNS = "athlete_id, season, week, position_group, stats";

// A team's logos keyed by the same team string the trait rows carry: the
// school in college football, the franchise abbreviation in the NFL.
export interface GradeTeam {
  team: string;
  logo_light: string | null;
  logo_dark: string | null;
}

// One row per graded player for search and filters. `group` is the filter
// the page offers beside position: the conference in college football, the
// division in the NFL.
export interface PlayerIndexRow {
  athleteId: string;
  name: string;
  team: string;
  headshotUrl: string | null;
  group: string | null;
  positionGroup: string;
  games: number | null;
  grade: number | null;
  percentile: number | null;
}

export interface PositionGrades {
  season: number | null;
  week: number | null;
  asOf: string | null;
  modelVersion: string | null;
  index: PlayerIndexRow[];
  details: Record<string, GradedPlayer>;
  gradedCounts: Record<string, number>;
}

export const EMPTY_GRADES: PositionGrades = {
  season: null,
  week: null,
  asOf: null,
  modelVersion: null,
  index: [],
  details: {},
  gradedCounts: {},
};

// Full rows are fetched for this many players per position on the server;
// the rest load on demand through the sport's player-traits API route.
export const GRADE_ROWS = 40;
export const ID_CHUNK = 50;
export const PAGE = 1000;
export const INDEX_COLUMNS =
  "athlete_id, athlete_name, headshot_url, team, position_group, games, value, percentile";

export type IndexRow = Pick<
  PositionTraitRow,
  "athlete_id" | "athlete_name" | "headshot_url" | "team" | "position_group" | "games" | "value" | "percentile"
>;

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// Rows the card shows as headlines rather than in the trait list.
const HEADLINE_ROWS = new Set(["grade", "war", "rating", "spread_value"]);

// Traits the card never shows. QB receiver independence carries a fitted grade
// weight of 0.00002 and is blank for most passers, so its GRADE tag misled.
const HIDDEN_TRAITS = new Set(["qb.receiver_independence"]);

// Players and the OL unit rows of one position, as the page's card model,
// built from every row of those athletes for the season, with each one's stat
// line. A player without a stats row simply has no stat block.
export function buildGradedPlayers(rows: PositionTraitRow[], statRows: PlayerSeasonStatsRow[]): Record<string, GradedPlayer> {
  const statsOf = new Map(statRows.map((row) => [row.athlete_id, footballStatsLine(row)]));
  const byAthlete = new Map<string, PositionTraitRow[]>();
  for (const row of rows) {
    const list = byAthlete.get(row.athlete_id) ?? [];
    list.push(row);
    byAthlete.set(row.athlete_id, list);
  }
  const out: Record<string, GradedPlayer> = {};
  for (const [athleteId, list] of byAthlete) {
    const grade = list.find((r) => r.trait === "grade") ?? null;
    const rating = list.find((r) => r.trait === "rating") ?? null;
    const war = list.find((r) => r.trait === "war") ?? null;
    const spread = list.find((r) => r.trait === "spread_value") ?? null;
    const first = grade ?? list[0];
    out[athleteId] = {
      athleteId,
      name: first.athlete_name ?? athleteId,
      team: first.team ?? "",
      headshotUrl: first.headshot_url ?? null,
      games: first.games,
      grade: grade?.value ?? null,
      gradePercentile: grade?.percentile ?? null,
      uncertainty: grade?.uncertainty ?? null,
      rating: rating?.value ?? null,
      ratingRange: rating?.uncertainty ?? null,
      war: war?.value ?? null,
      warPercentile: war?.percentile ?? null,
      pointsAboveReplacement: war?.points_above_replacement ?? null,
      spreadValue: spread?.value ?? null,
      traits: list
        .filter((r) => !HEADLINE_ROWS.has(r.trait) && !HIDDEN_TRAITS.has(r.trait))
        .sort((a, b) => Number(b.in_grade) - Number(a.in_grade) || a.trait.localeCompare(b.trait))
        .map(({ trait, value, percentile, kind, in_grade, reliability }) => ({
          trait, value, percentile, kind, in_grade, reliability,
        })),
      seasonStats: statsOf.get(athleteId) ?? null,
    };
  }
  return out;
}

export function toIndexRow(row: IndexRow, group: string | null): PlayerIndexRow {
  return {
    athleteId: row.athlete_id,
    name: row.athlete_name ?? row.athlete_id,
    team: row.team ?? "",
    headshotUrl: row.headshot_url ?? null,
    group,
    positionGroup: row.position_group,
    games: row.games,
    grade: row.value,
    percentile: row.percentile,
  };
}

// Best grade first, ties by percentile; the ids of the top of each position
// are the players whose full rows the page renders on the server.
export function rankIndex(index: PlayerIndexRow[]): { index: PlayerIndexRow[]; topIds: string[]; gradedCounts: Record<string, number> } {
  const sorted = [...index].sort(
    (a, b) => (b.grade ?? -Infinity) - (a.grade ?? -Infinity) || (b.percentile ?? -1) - (a.percentile ?? -1)
  );
  const gradedCounts: Record<string, number> = {};
  const seen: Record<string, number> = {};
  const topIds: string[] = [];
  for (const row of sorted) {
    gradedCounts[row.positionGroup] = (gradedCounts[row.positionGroup] ?? 0) + 1;
    if ((seen[row.positionGroup] ?? 0) >= GRADE_ROWS) continue;
    seen[row.positionGroup] = (seen[row.positionGroup] ?? 0) + 1;
    topIds.push(row.athleteId);
  }
  return { index: sorted, topIds, gradedCounts };
}
