import { cache } from "react";
import {
  EMPTY_GRADES,
  ID_CHUNK,
  STATS_COLUMNS,
  buildGradedPlayers,
  chunk,
  rankIndex,
  readAllPages,
  toIndexRow,
  type GradedPlayer,
  type GradeTeam,
  type IndexRow,
  type PlayerIndexRow,
  type PlayerSeasonStatsRow,
  type PositionGrades,
} from "@/lib/position-grades";
import { supabaseCfb } from "@/lib/supabase";
import type {
  CfbBacktestPrediction,
  CfbGradedGame,
  CfbHeismanBoardRow,
  CfbHeismanHistory,
  CfbPerformanceMetric,
  CfbPlayerModelMeta,
  CfbPlayerValue,
  CfbPositionTrait,
  CfbTeamIdentity,
  CfbTeamRating,
  CfbTeamUnitRating,
} from "@/lib/types";

// Team identity is keyed by team_id alone, so one fetch serves every table on
// a page. A failed read throws so ISR keeps the last good page rather than
// caching tables without logos or team colors.
export async function fetchTeams(): Promise<Map<number, CfbTeamIdentity>> {
  const { data, error } = await supabaseCfb.from("teams").select("*");
  if (error) throw error;
  return new Map(
    ((data ?? []) as CfbTeamIdentity[]).map((t) => [t.team_id, t])
  );
}

// The published ratings artifact for the latest (season, week).
// Cached per request: generateMetadata and the page both read it. A failed
// read throws so ISR keeps the last good page.
export const fetchLatestRatings = cache(readLatestRatings);

async function readLatestRatings(): Promise<{
  ratings: CfbTeamRating[];
  season: number | null;
  week: number | null;
}> {
  const latestRes = await supabaseCfb
    .from("team_ratings")
    .select("season, week")
    .order("season", { ascending: false })
    .order("week", { ascending: false })
    .limit(1);
  if (latestRes.error) throw latestRes.error;
  const latest = latestRes.data?.[0];
  if (!latest) return { ratings: [], season: null, week: null };

  const ratingsRes = await supabaseCfb
    .from("team_ratings")
    .select("*")
    .eq("season", latest.season)
    .eq("week", latest.week)
    .order("power_rating", { ascending: false });
  if (ratingsRes.error) throw ratingsRes.error;
  return {
    ratings: (ratingsRes.data ?? []) as CfbTeamRating[],
    season: latest.season,
    week: latest.week,
  };
}

// Model ratings from the most recent earlier week of the same season, keyed by
// team_id, for the weekly change column. Week 1 has nothing to compare against.
export async function fetchPriorWeekRatings(
  season: number,
  week: number
): Promise<{ week: number | null; ratings: Record<number, number> }> {
  const priorRes = await supabaseCfb
    .from("team_ratings")
    .select("week")
    .eq("season", season)
    .lt("week", week)
    .order("week", { ascending: false })
    .limit(1);
  if (priorRes.error) throw priorRes.error;
  const prior = priorRes.data?.[0];
  if (!prior) return { week: null, ratings: {} };

  const { data, error } = await supabaseCfb
    .from("team_ratings")
    .select("team_id, power_rating")
    .eq("season", season)
    .eq("week", prior.week);
  if (error) throw error;
  return {
    week: prior.week,
    ratings: Object.fromEntries((data ?? []).map((r) => [r.team_id, r.power_rating])),
  };
}

// Descriptive unit companions for the same published ratings snapshot.
// Missing historical unit data is represented on the row itself rather than
// making the whole request fail.
export async function fetchUnitRatings(
  season: number,
  week: number
): Promise<CfbTeamUnitRating[]> {
  const { data, error } = await supabaseCfb
    .from("team_unit_ratings")
    .select("*")
    .eq("season", season)
    .eq("week", week);
  if (error) throw error;
  return (data ?? []) as CfbTeamUnitRating[];
}

// Supabase caps a response at 1000 rows; page the full backtest through
// sequential ranges (about 4 requests for 2021-2025).
export async function fetchFullBacktest(): Promise<CfbBacktestPrediction[]> {
  const pageSize = 1000;
  const all: CfbBacktestPrediction[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabaseCfb
      .from("backtest_predictions")
      .select("*")
      .order("season", { ascending: true })
      .order("week", { ascending: true })
      .order("game_id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as CfbBacktestPrediction[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

export interface CfbLivePerformance {
  season: number | null;
  metrics: CfbPerformanceMetric[];
  lastGradedAt: string | null;
  latestKickoff: string | null;
  unavailable: boolean;
  closingSources: Record<string, number> | null;
}

// Live-season grading for the most recent graded season. Every number here
// comes from frozen records graded by the backend; the page only formats
// them. A failure degrades to the empty state rather than failing the build.
export async function fetchLivePerformance(): Promise<CfbLivePerformance> {
  const empty: CfbLivePerformance = {
    season: null,
    metrics: [],
    lastGradedAt: null,
    latestKickoff: null,
    unavailable: false,
    closingSources: null,
  };
  const latestRes = await supabaseCfb
    .from("graded_games")
    .select("season, graded_at, start_date")
    .order("season", { ascending: false })
    .order("graded_at", { ascending: false })
    .limit(1);
  if (latestRes.error) {
    console.error("cfb graded games fetch failed:", latestRes.error.message);
    return { ...empty, unavailable: true };
  }
  const latest = latestRes.data?.[0];
  if (!latest) return empty;

  const [metricsRes, kickoffRes] = await Promise.all([
    supabaseCfb
      .from("performance_metrics")
      .select("*")
      .eq("season", latest.season)
      .order("segment_order", { ascending: true }),
    supabaseCfb
      .from("graded_games")
      .select("start_date")
      .eq("season", latest.season)
      .order("start_date", { ascending: false })
      .limit(1),
  ]);
  const readError = metricsRes.error ?? kickoffRes.error;
  if (readError) {
    console.error("cfb performance metrics fetch failed:", readError.message);
    return { ...empty, unavailable: true };
  }
  const metrics = (metricsRes.data ?? []) as CfbPerformanceMetric[];
  // The grading run writes the split on the overall published row.
  const split = metrics.find(
    (m) => m.segment_kind === "overall" && m.prediction_source === "market_informed",
  )?.closing_source_games;
  return {
    season: latest.season,
    metrics,
    lastGradedAt: latest.graded_at,
    latestKickoff: kickoffRes.data?.[0]?.start_date ?? null,
    unavailable: false,
    closingSources:
      split != null && typeof split === "object" && !Array.isArray(split)
        ? (split as Record<string, number>)
        : null,
  };
}

// The most recent season with graded live games, used by the history page to
// decide which tab is live and which are backtest.
export async function fetchLiveGradedSeason(): Promise<number | null> {
  const { data, error } = await supabaseCfb
    .from("graded_games")
    .select("season")
    .order("season", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0]?.season ?? null;
}

export type { CfbGradedGame };

export interface CfbHeismanTracker {
  season: number | null;
  week: number | null;
  asOf: string | null;
  values: CfbPlayerValue[];
  trajectories: CfbPlayerValue[];
  board: CfbHeismanBoardRow[];
  boardWeek: number | null;
  history: CfbHeismanHistory[];
  meta: CfbPlayerModelMeta | null;
}

const EMPTY_TRACKER: CfbHeismanTracker = {
  season: null,
  week: null,
  asOf: null,
  values: [],
  trajectories: [],
  board: [],
  boardWeek: null,
  history: [],
  meta: null,
};

const VALUE_ROWS = 400;
const TRAJECTORY_PLAYERS = 8;
const BOARD_ROWS = 25;

// The latest weekly snapshot of player value with the Heisman board built on
// it. Every number is a frozen backend artifact; the page only formats them. A
// failed read throws so ISR keeps the last good page.
export const fetchHeismanTracker = cache(readHeismanTracker);

async function readHeismanTracker(): Promise<CfbHeismanTracker> {
  const latestRes = await supabaseCfb
    .from("player_values")
    .select("season, week, as_of")
    .order("season", { ascending: false })
    .order("week", { ascending: false })
    .limit(1);
  if (latestRes.error) throw latestRes.error;
  const latest = latestRes.data?.[0];
  if (!latest) return EMPTY_TRACKER;

  const [valuesRes, boardWeekRes, historyRes, metaRes] = await Promise.all([
    supabaseCfb
      .from("player_values")
      .select("*")
      .eq("season", latest.season)
      .eq("week", latest.week)
      .order("overall_rank", { ascending: true })
      .range(0, VALUE_ROWS - 1),
    supabaseCfb
      .from("heisman_board")
      .select("week")
      .eq("season", latest.season)
      .order("week", { ascending: false })
      .limit(1),
    supabaseCfb
      .from("heisman_history")
      .select("*")
      .order("season", { ascending: false }),
    supabaseCfb
      .from("player_model_meta")
      .select("*")
      .eq("season", latest.season)
      .limit(1),
  ]);
  const firstError = valuesRes.error ?? boardWeekRes.error ?? historyRes.error ?? metaRes.error;
  if (firstError) throw firstError;
  const values = (valuesRes.data ?? []) as CfbPlayerValue[];
  const boardWeek = boardWeekRes.data?.[0]?.week ?? null;

  const leaders = values.slice(0, TRAJECTORY_PLAYERS).map((v) => v.athlete_id);
  const [trajectoryRes, boardRes] = await Promise.all([
    supabaseCfb
      .from("player_values")
      .select("*")
      .eq("season", latest.season)
      .in("athlete_id", leaders)
      .order("week", { ascending: true }),
    boardWeek == null
      ? Promise.resolve({ data: [] as CfbHeismanBoardRow[], error: null })
      : supabaseCfb
          .from("heisman_board")
          .select("*")
          .eq("season", latest.season)
          .eq("week", boardWeek)
          .order("predicted_rank", { ascending: true })
          .limit(BOARD_ROWS),
  ]);

  const secondError = trajectoryRes.error ?? boardRes.error;
  if (secondError) throw secondError;
  return {
    season: latest.season,
    week: latest.week,
    asOf: latest.as_of,
    values,
    trajectories: (trajectoryRes.data ?? []) as CfbPlayerValue[],
    board: (boardRes.data ?? []) as CfbHeismanBoardRow[],
    boardWeek,
    history: (historyRes.data ?? []) as CfbHeismanHistory[],
    meta: ((metaRes.data ?? [])[0] as CfbPlayerModelMeta | undefined) ?? null,
  };
}

// Player grades: the latest published week of cfb.position_traits. The page
// reads a compact index of every graded player (for search and filters), the
// full rows of the top of each position, and fetches other players' rows on
// demand through /cfb/api/player-traits, so a revalidation moves a few hundred
// kilobytes rather than the whole table. The model is shared with the NFL in
// lib/position-grades.
export type CfbGradedPlayer = GradedPlayer;
export type CfbPlayerIndexRow = PlayerIndexRow;
export type CfbPositionGrades = PositionGrades;

// The CFB table has no headshot column; portraits come from the athlete id.
const CFB_INDEX_COLUMNS = "athlete_id, athlete_name, team, position_group, games, value, percentile";

async function fetchGradeIndex(season: number): Promise<IndexRow[]> {
  const rows = await readAllPages((from, to) =>
    supabaseCfb
      .from("position_traits")
      .select(CFB_INDEX_COLUMNS)
      .eq("season", season)
      .eq("trait", "grade")
      .order("athlete_id", { ascending: true })
      .range(from, to)
  );
  return rows as IndexRow[];
}

// Each chunk reads its trait rows and its stat lines together; a player
// without a stats row simply has no stat block.
export async function fetchPlayerTraitRows(
  season: number,
  ids: string[]
): Promise<{ traits: CfbPositionTrait[]; stats: PlayerSeasonStatsRow[] }> {
  const parts = await Promise.all(
    chunk(ids, ID_CHUNK).map((part) =>
      Promise.all([
        readAllPages((from, to) =>
          supabaseCfb
            .from("position_traits")
            .select("*")
            .eq("season", season)
            .in("athlete_id", part)
            .order("athlete_id")
            .order("trait")
            .range(from, to)
        ),
        supabaseCfb.from("player_season_stats").select(STATS_COLUMNS).eq("season", season).in("athlete_id", part).limit(ID_CHUNK),
      ])
    )
  );
  const traits: CfbPositionTrait[] = [];
  const stats: PlayerSeasonStatsRow[] = [];
  for (const [traitRows, statsRes] of parts) {
    if (statsRes.error) throw statsRes.error;
    traits.push(...traitRows);
    stats.push(...(statsRes.data ?? []));
  }
  return { traits, stats };
}

// Each team's conference in the season's latest ratings week, for the grade
// filters.
async function fetchGradeConferences(season: number): Promise<Map<string, string | null>> {
  const weekRes = await supabaseCfb
    .from("team_ratings")
    .select("week")
    .eq("season", season)
    .order("week", { ascending: false })
    .limit(1);
  if (weekRes.error) throw weekRes.error;
  const week = weekRes.data?.[0]?.week;
  if (week == null) return new Map();
  const res = await supabaseCfb.from("team_ratings").select("team, conference").eq("season", season).eq("week", week);
  if (res.error) throw res.error;
  return new Map((res.data ?? []).map((r) => [r.team, r.conference] as const));
}

// Team logos for the grade cards.
export async function fetchGradeTeams(): Promise<GradeTeam[]> {
  const { data, error } = await supabaseCfb.from("teams").select("team, logo_light, logo_dark");
  if (error) throw error;
  return data ?? [];
}

// The grade index and trait rows throw on a failed read so ISR keeps the last
// good page.
export const fetchPositionGrades = cache(readPositionGrades);

async function readPositionGrades(): Promise<CfbPositionGrades> {
  const latestRes = await supabaseCfb
    .from("position_traits")
    .select("season, week, as_of, model_version")
    .eq("trait", "grade")
    .order("season", { ascending: false })
    .order("week", { ascending: false })
    .limit(1);
  if (latestRes.error) throw latestRes.error;
  const latest = latestRes.data?.[0];
  if (!latest) return EMPTY_GRADES;

  const [gradeRows, conferenceOf] = await Promise.all([fetchGradeIndex(latest.season), fetchGradeConferences(latest.season)]);
  const { index, topIds, gradedCounts } = rankIndex(
    gradeRows.map((row) => toIndexRow(row, conferenceOf.get(row.team ?? "") ?? null))
  );
  const { traits, stats } = await fetchPlayerTraitRows(latest.season, topIds);
  const details = buildGradedPlayers(traits, stats);
  return {
    season: latest.season,
    week: latest.week,
    asOf: latest.as_of,
    modelVersion: latest.model_version,
    index,
    details,
    gradedCounts,
  };
}
