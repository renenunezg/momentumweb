import { cache } from "react";
import { supabaseNfl } from "@/lib/supabase";
import type { FootballLivePerformance } from "@/lib/football-performance";
import {
  EMPTY_GRADES,
  ID_CHUNK,
  INDEX_COLUMNS,
  PAGE,
  STATS_COLUMNS,
  buildGradedPlayers,
  chunk,
  rankIndex,
  toIndexRow,
  type GradeTeam,
  type IndexRow,
  type PlayerSeasonStatsRow,
  type PositionGrades,
} from "@/lib/position-grades";
import type {
  NflPerformanceMetric,
  NflPositionTrait,
  NflSeasonWinTotal,
  NflTeamIdentity,
  NflTeamRating,
  NflTeamUnitRating,
} from "@/lib/types";

// Team identity is keyed by team_abbr alone, so one fetch serves every table
// on a page. A failed read throws so ISR keeps the last good page rather than
// caching tables without logos or team colors.
export async function fetchTeams(): Promise<Map<string, NflTeamIdentity>> {
  const { data, error } = await supabaseNfl.from("teams").select("*");
  if (error) throw error;
  return new Map(
    ((data ?? []) as NflTeamIdentity[]).map((t) => [t.team_abbr, t]),
  );
}

// The published ratings artifact for the latest (season, week).
// Cached per request: generateMetadata and the page both read it. A failed
// read throws so ISR keeps the last good page.
export const fetchLatestRatings = cache(readLatestRatings);

async function readLatestRatings(): Promise<{
  ratings: NflTeamRating[];
  season: number | null;
  week: number | null;
}> {
  const latestRes = await supabaseNfl
    .from("team_ratings")
    .select("season, week")
    .order("season", { ascending: false })
    .order("week", { ascending: false })
    .limit(1);
  if (latestRes.error) throw latestRes.error;
  const latest = latestRes.data?.[0];
  if (!latest) return { ratings: [], season: null, week: null };

  const ratingsRes = await supabaseNfl
    .from("team_ratings")
    .select("*")
    .eq("season", latest.season)
    .eq("week", latest.week)
    .order("power_rating", { ascending: false });
  if (ratingsRes.error) throw ratingsRes.error;
  return {
    ratings: (ratingsRes.data ?? []) as NflTeamRating[],
    season: latest.season,
    week: latest.week,
  };
}

// Model ratings from the most recent earlier week of the same season, keyed by
// team_abbr, for the weekly change column. Week 1 has nothing to compare
// against.
export async function fetchPriorWeekRatings(
  season: number,
  week: number,
): Promise<{ week: number | null; ratings: Record<string, number> }> {
  const priorRes = await supabaseNfl
    .from("team_ratings")
    .select("week")
    .eq("season", season)
    .lt("week", week)
    .order("week", { ascending: false })
    .limit(1);
  if (priorRes.error) throw priorRes.error;
  const prior = priorRes.data?.[0];
  if (!prior) return { week: null, ratings: {} };

  const { data, error } = await supabaseNfl
    .from("team_ratings")
    .select("team_abbr, power_rating")
    .eq("season", season)
    .eq("week", prior.week);
  if (error) throw error;
  return {
    week: prior.week,
    ratings: Object.fromEntries((data ?? []).map((r) => [r.team_abbr, r.power_rating])),
  };
}

// Unit ratings for the same (season, week) as the headline ratings. Week-1
// preseason publishes carry no unit ratings (they need played games), so an
// empty result is a normal state, not an error.
export async function fetchUnitRatings(
  season: number,
  week: number,
): Promise<NflTeamUnitRating[]> {
  const { data, error } = await supabaseNfl
    .from("team_unit_ratings")
    .select("*")
    .eq("season", season)
    .eq("week", week);
  if (error) throw error;
  return (data ?? []) as NflTeamUnitRating[];
}

export async function fetchForecastAccuracy(source: "live" | "backtest") {
  const { data, error } = await supabaseNfl.rpc(
    "forecast_accuracy",
    { p_source: source },
    { get: true },
  );
  if (error) throw error;
  // For the backtest, modelMae, modelBeatsMarket and bias describe the pure
  // model and closingBlendMae the old half-closing-line line; live rows carry
  // the published line as modelMae and no blend.
  return data as unknown as {
    overall:
      | (import("@/lib/backtest-metrics").SliceMetrics & { pureMae: number; closingBlendMae: number | null })
      | null;
    bySeason: (import("@/lib/backtest-metrics").SliceMetrics & { pureMae: number; closingBlendMae: number | null })[];
    completed: number;
    missingForecast: number;
    missingClose: number;
    // Benchmarked games per closing_source: a close captured before kickoff
    // or the nflverse value recorded after the game.
    closingSources: Record<string, number>;
    primarySource: "pure_model" | "published";
    modelVersion: string | null;
    generatedAt: string | null;
  };
}

// A complete snapshot arrives in one request. Fail closed on partial or mixed
// seasons so the page never presents a truncated league as a valid forecast.
export async function fetchSeasonWinTotals(): Promise<{
  rows: NflSeasonWinTotal[];
  unavailable: boolean;
}> {
  const { data, error } = await supabaseNfl
    .from("season_win_totals")
    .select("*")
    .order("season", { ascending: false })
    .order("projected_wins", { ascending: false })
    .order("team_abbr")
    .limit(32);
  if (error) {
    console.error("nfl season wins fetch failed:", error.message);
    return { rows: [], unavailable: true };
  }
  const rows = data ?? [];
  if (rows.length === 0) return { rows: [], unavailable: false };
  const first = rows[0];
  const complete =
    rows.length === 32 &&
    new Set(rows.map((r) => r.team_abbr)).size === 32 &&
    rows.every(
      (r) =>
        r.season === first.season &&
        r.as_of === first.as_of &&
        Number.isFinite(r.projected_wins) &&
        r.games_played + r.games_remaining === 17,
    );
  return { rows: complete ? rows : [], unavailable: !complete };
}

// Live-season grading for the most recent graded season. Every number here
// comes from frozen records graded by the backend; the page only formats
// them. A failure degrades to the empty state rather than failing the build.
export async function fetchNflLivePerformance(): Promise<FootballLivePerformance> {
  const empty: FootballLivePerformance = {
    season: null,
    metrics: [],
    lastGradedAt: null,
    latestKickoff: null,
    unavailable: false,
  };
  const latestRes = await supabaseNfl
    .from("graded_games")
    .select("season, graded_at")
    .order("season", { ascending: false })
    .order("graded_at", { ascending: false })
    .limit(1);
  if (latestRes.error) {
    console.error("nfl graded games fetch failed:", latestRes.error.message);
    return { ...empty, unavailable: true };
  }
  const latest = latestRes.data?.[0];
  if (!latest) return empty;

  const [metricsRes, kickoffRes, closingSources] = await Promise.all([
    supabaseNfl
      .from("performance_metrics")
      .select("*")
      .eq("season", latest.season)
      .order("segment_order", { ascending: true }),
    supabaseNfl
      .from("graded_games")
      .select("start_date")
      .eq("season", latest.season)
      .order("start_date", { ascending: false })
      .limit(1),
    // The split lives on the accuracy function, not the metrics table; a
    // failed read leaves it unpublished rather than taking the page down.
    fetchForecastAccuracy("live")
      .then((accuracy) => accuracy.closingSources ?? null)
      .catch((error: unknown) => {
        console.error("nfl forecast accuracy fetch failed:", error instanceof Error ? error.message : "read failed");
        return null;
      }),
  ]);
  const readError = metricsRes.error ?? kickoffRes.error;
  if (readError) {
    console.error("nfl performance metrics fetch failed:", readError.message);
    return { ...empty, unavailable: true };
  }
  return {
    season: latest.season,
    metrics: (metricsRes.data ?? []) as NflPerformanceMetric[],
    lastGradedAt: latest.graded_at,
    latestKickoff: kickoffRes.data?.[0]?.start_date ?? null,
    unavailable: false,
    closingSources,
  };
}

// Player grades: the latest published week of nfl.position_traits, in the same
// shape as the college page (lib/position-grades). The index carries every
// graded player; the full rows of the top of each position come with it and
// the rest load on demand through /nfl/api/player-traits.
async function fetchGradeIndex(season: number): Promise<IndexRow[]> {
  const rows: IndexRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const res = await supabaseNfl
      .from("position_traits")
      .select(INDEX_COLUMNS)
      .eq("season", season)
      .eq("trait", "grade")
      .order("athlete_id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (res.error) throw res.error;
    rows.push(...((res.data ?? []) as IndexRow[]));
    if ((res.data?.length ?? 0) < PAGE) return rows;
  }
}

// Each chunk reads its trait rows and its stat lines together; a player
// without a stats row simply has no stat block.
export async function fetchNflPlayerTraitRows(
  season: number,
  ids: string[],
): Promise<{ traits: NflPositionTrait[]; stats: PlayerSeasonStatsRow[] }> {
  const parts = await Promise.all(
    chunk(ids, ID_CHUNK).map((part) =>
      Promise.all([
        supabaseNfl.from("position_traits").select("*").eq("season", season).in("athlete_id", part).limit(PAGE),
        supabaseNfl.from("player_season_stats").select(STATS_COLUMNS).eq("season", season).in("athlete_id", part).limit(ID_CHUNK),
      ]),
    ),
  );
  const traits: NflPositionTrait[] = [];
  const stats: PlayerSeasonStatsRow[] = [];
  for (const [traitRes, statsRes] of parts) {
    if (traitRes.error) throw traitRes.error;
    if (statsRes.error) throw statsRes.error;
    traits.push(...((traitRes.data ?? []) as NflPositionTrait[]));
    stats.push(...(statsRes.data ?? []));
  }
  return { traits, stats };
}

// Each team's division in the season's latest ratings week, for the grade
// filters.
async function fetchGradeDivisions(season: number): Promise<Map<string, string | null>> {
  const weekRes = await supabaseNfl
    .from("team_ratings")
    .select("week")
    .eq("season", season)
    .order("week", { ascending: false })
    .limit(1);
  if (weekRes.error) throw weekRes.error;
  const week = weekRes.data?.[0]?.week;
  if (week == null) return new Map();
  const res = await supabaseNfl.from("team_ratings").select("team_abbr, division").eq("season", season).eq("week", week);
  if (res.error) throw res.error;
  return new Map((res.data ?? []).map((r) => [r.team_abbr, r.division] as const));
}

// Team logos for the grade cards, keyed by abbreviation like the trait rows.
export async function fetchGradeTeams(): Promise<GradeTeam[]> {
  const { data, error } = await supabaseNfl.from("teams").select("team_abbr, logo_light, logo_dark");
  if (error) throw error;
  return (data ?? []).map((t) => ({ team: t.team_abbr, logo_light: t.logo_light, logo_dark: t.logo_dark }));
}

// The grade index and trait rows throw on a failed read so ISR keeps the last
// good page.
export const fetchNflPositionGrades = cache(readNflPositionGrades);

async function readNflPositionGrades(): Promise<PositionGrades> {
  const latestRes = await supabaseNfl
    .from("position_traits")
    .select("season, week, as_of, model_version")
    .eq("trait", "grade")
    .order("season", { ascending: false })
    .order("week", { ascending: false })
    .limit(1);
  if (latestRes.error) throw latestRes.error;
  const latest = latestRes.data?.[0];
  if (!latest) return EMPTY_GRADES;

  const [gradeRows, divisionOf] = await Promise.all([fetchGradeIndex(latest.season), fetchGradeDivisions(latest.season)]);
  const { index, topIds, gradedCounts } = rankIndex(
    gradeRows.map((row) => toIndexRow(row, divisionOf.get(row.team ?? "") ?? null)),
  );
  const { traits, stats } = await fetchNflPlayerTraitRows(latest.season, topIds);
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
