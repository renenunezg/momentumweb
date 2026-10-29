import { cache } from "react";
import { supabaseNfl } from "@/lib/supabase";
import type { FootballLivePerformance } from "@/lib/football-performance";
import {
  EMPTY_GRADES,
  ID_CHUNK,
  INDEX_COLUMNS,
  PAGE,
  buildGradedPlayers,
  chunk,
  rankIndex,
  toIndexRow,
  type IndexRow,
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
// on a page. A failure here must not take the page down: the tables degrade
// to plain text without logos or team colors.
export async function fetchTeams(): Promise<Map<string, NflTeamIdentity>> {
  const { data, error } = await supabaseNfl.from("teams").select("*");
  if (error) {
    console.error("nfl teams fetch failed:", error.message);
    return new Map();
  }
  return new Map(
    ((data ?? []) as NflTeamIdentity[]).map((t) => [t.team_abbr, t]),
  );
}

// The published ratings artifact for the latest (season, week).
// Cached per request: generateMetadata and the page both read it.
export const fetchLatestRatings = cache(
  async (): Promise<{
    ratings: NflTeamRating[];
    season: number | null;
    week: number | null;
  }> => {
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
  },
);

// Model ratings from the most recent earlier week of the same season, keyed by
// team_abbr, for the weekly change column. Week 1 has nothing to compare
// against and a failed read only hides the column.
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
  const prior = priorRes.data?.[0];
  if (priorRes.error || !prior) {
    if (priorRes.error) console.error("nfl prior ratings fetch failed:", priorRes.error.message);
    return { week: null, ratings: {} };
  }

  const { data, error } = await supabaseNfl
    .from("team_ratings")
    .select("team_abbr, power_rating")
    .eq("season", season)
    .eq("week", prior.week);
  if (error) {
    console.error("nfl prior ratings fetch failed:", error.message);
    return { week: null, ratings: {} };
  }
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
  if (error) {
    console.error("nfl unit ratings fetch failed:", error.message);
    return [];
  }
  return (data ?? []) as NflTeamUnitRating[];
}

export async function fetchForecastAccuracy(source: "live" | "backtest") {
  const { data, error } = await supabaseNfl.rpc(
    "forecast_accuracy",
    { p_source: source },
    { get: true },
  );
  if (error) throw error;
  return data as unknown as {
    overall:
      | (import("@/lib/backtest-metrics").SliceMetrics & { pureMae: number })
      | null;
    bySeason: (import("@/lib/backtest-metrics").SliceMetrics & { pureMae: number })[];
    completed: number;
    missingForecast: number;
    missingClose: number;
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

  const [metricsRes, kickoffRes] = await Promise.all([
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

export async function fetchNflPlayerTraitRows(season: number, ids: string[]): Promise<NflPositionTrait[]> {
  const parts = await Promise.all(
    chunk(ids, ID_CHUNK).map((part) =>
      supabaseNfl
        .from("position_traits")
        .select("*")
        .eq("season", season)
        .in("athlete_id", part)
        .limit(PAGE),
    ),
  );
  return parts.flatMap((res) => {
    if (res.error) throw res.error;
    return (res.data ?? []) as NflPositionTrait[];
  });
}

export const fetchNflPositionGrades = cache(async (): Promise<PositionGrades> => {
  const latestRes = await supabaseNfl
    .from("position_traits")
    .select("season, week, as_of, model_version")
    .eq("trait", "grade")
    .order("season", { ascending: false })
    .order("week", { ascending: false })
    .limit(1);
  const latest = latestRes.data?.[0];
  if (latestRes.error || !latest) return EMPTY_GRADES;

  const [gradeRows, { ratings }] = await Promise.all([fetchGradeIndex(latest.season), fetchLatestRatings()]);
  const divisionOf = new Map(ratings.map((r) => [r.team_abbr, r.division] as const));
  const { index, topIds, gradedCounts } = rankIndex(
    gradeRows.map((row) => toIndexRow(row, divisionOf.get(row.team ?? "") ?? null)),
  );
  const details = buildGradedPlayers(await fetchNflPlayerTraitRows(latest.season, topIds));
  return {
    season: latest.season,
    week: latest.week,
    asOf: latest.as_of,
    modelVersion: latest.model_version,
    index,
    details,
    gradedCounts,
  };
});
