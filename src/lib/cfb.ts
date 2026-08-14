import { supabaseCfb } from "@/lib/supabase";
import type { CfbBacktestPrediction, CfbTeamRating } from "@/lib/types";

// College football schedules are anchored to Eastern time.
export function formatKickoffEt(startDate: string | null): string {
  if (!startDate) return "TBD";
  const d = new Date(startDate);
  if (Number.isNaN(d.getTime())) return "TBD";
  const day = d.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day}, ${time} ET`;
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
