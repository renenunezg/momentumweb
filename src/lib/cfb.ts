import { supabaseCfb } from "@/lib/supabase";
import type {
  CfbBacktestPrediction,
  CfbGradedGame,
  CfbPerformanceMetric,
  CfbTeamIdentity,
  CfbTeamRating,
  CfbTeamUnitRating,
} from "@/lib/types";

// College football schedules are anchored to Eastern time. Day and time are
// formatted separately because the schedule table gives each its own column.
export function formatKickoffDay(startDate: string | null): string {
  if (!startDate) return "TBD";
  const d = new Date(startDate);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatKickoffTime(startDate: string | null): string {
  if (!startDate) return "TBD";
  const d = new Date(startDate);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  });
}

// A home line like -7.5 means the home team is favored by 7.5.
export function formatHomeLine(homeSpread: number | null): string {
  if (homeSpread == null) return "–";
  const s = homeSpread.toFixed(1);
  return homeSpread > 0 ? `+${s}` : s;
}

// The best offer prices one side of the spread market; convert the priced
// selection back to a home line so model and market read on the same axis.
export function marketHomeLine(
  market: string | null,
  selection: string | null,
  point: number | null,
  homeTeam: string | null
): number | null {
  if (market !== "spreads" || selection == null || point == null) return null;
  if (homeTeam != null && selection === homeTeam) return point;
  return -point;
}

// Team identity is keyed by team_id alone, so one fetch serves every table on
// a page. A failure here must not take the page down: the tables degrade to
// plain text without logos or team colors.
export async function fetchTeams(): Promise<Map<number, CfbTeamIdentity>> {
  const { data, error } = await supabaseCfb.from("teams").select("*");
  if (error) {
    console.error("cfb teams fetch failed:", error.message);
    return new Map();
  }
  return new Map(
    ((data ?? []) as CfbTeamIdentity[]).map((t) => [t.team_id, t])
  );
}

// The published ratings artifact for the latest (season, week).
export async function fetchLatestRatings(): Promise<{
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
  const latest = latestRes.data?.[0];
  if (!latest) return { ratings: [], season: null, week: null };

  const ratingsRes = await supabaseCfb
    .from("team_ratings")
    .select("*")
    .eq("season", latest.season)
    .eq("week", latest.week)
    .order("power_rating", { ascending: false });
  return {
    ratings: (ratingsRes.data ?? []) as CfbTeamRating[],
    season: latest.season,
    week: latest.week,
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
  if (error) {
    console.error("cfb unit ratings fetch failed:", error.message);
    return [];
  }
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
  gradedGames: number;
  lastGradedAt: string | null;
  latestKickoff: string | null;
}

// Live-season grading for the most recent graded season. Every number here
// comes from frozen records graded by the backend; the page only formats
// them. A failure degrades to the empty state rather than failing the build.
export async function fetchLivePerformance(): Promise<CfbLivePerformance> {
  const empty: CfbLivePerformance = {
    season: null,
    metrics: [],
    gradedGames: 0,
    lastGradedAt: null,
    latestKickoff: null,
  };
  const latestRes = await supabaseCfb
    .from("graded_games")
    .select("season, graded_at, start_date")
    .order("season", { ascending: false })
    .order("graded_at", { ascending: false })
    .limit(1);
  const latest = latestRes.data?.[0];
  if (latestRes.error || !latest) return empty;

  const [metricsRes, countRes, kickoffRes] = await Promise.all([
    supabaseCfb
      .from("performance_metrics")
      .select("*")
      .eq("season", latest.season)
      .order("segment_order", { ascending: true }),
    supabaseCfb
      .from("graded_games")
      .select("game_id", { count: "exact", head: true })
      .eq("season", latest.season),
    supabaseCfb
      .from("graded_games")
      .select("start_date")
      .eq("season", latest.season)
      .order("start_date", { ascending: false })
      .limit(1),
  ]);
  if (metricsRes.error) {
    console.error("cfb performance metrics fetch failed:", metricsRes.error.message);
    return empty;
  }
  return {
    season: latest.season,
    metrics: (metricsRes.data ?? []) as CfbPerformanceMetric[],
    gradedGames: countRes.count ?? 0,
    lastGradedAt: latest.graded_at,
    latestKickoff: kickoffRes.data?.[0]?.start_date ?? null,
  };
}

// The most recent season with graded live games, used by the history page to
// decide which tab is live and which are backtest.
export async function fetchLiveGradedSeason(): Promise<number | null> {
  const { data } = await supabaseCfb
    .from("graded_games")
    .select("season")
    .order("season", { ascending: false })
    .limit(1);
  return data?.[0]?.season ?? null;
}

export type { CfbGradedGame };
