import { supabaseCfb } from "@/lib/supabase";
import type { CfbPicksDatabase } from "@/lib/cfb-picks.database.types";

export type CfbPick =
  CfbPicksDatabase["cfb"]["Tables"]["recommendations"]["Row"];
export type CfbPickMetric =
  CfbPicksDatabase["cfb"]["Views"]["recommendation_performance"]["Row"];
import { fetchTeams } from "@/lib/cfb";
import {
  PICK_PAGE_SIZE,
  pickHistoryMatch,
  teamBadge,
  type PickFiltersValue,
  type WeeklyGame,
  type WeeklyPick,
} from "@/lib/football-picks";
export * from "@/lib/football-picks";

const WEEKLY_COLUMNS =
  "game_id,market,start_date,home_team,away_team,status,selection,point,price,provider,outcome,profit_units,win_probability,push_probability,decision_at";
const PAGE = 1000;

export interface CfbWeeklyPredictions {
  season: number | null;
  week: number | null;
  schedule: Omit<WeeklyGame, "rows">[];
  decisions: (WeeklyPick & { decision_at: string })[];
  unavailable: boolean;
}

// The current week is the latest published projection week, so a new week
// with no recorded decisions reads as unpublished rather than falling back to
// last week's picks. Decisions are paged past the 1000 row response cap: a
// full CFB week carries about 360 market decisions today and could grow.
export async function fetchCfbWeeklyPredictions(): Promise<CfbWeeklyPredictions> {
  const empty: CfbWeeklyPredictions = {
    season: null,
    week: null,
    schedule: [],
    decisions: [],
    unavailable: false,
  };
  const latestRes = await supabaseCfb
    .from("game_projections")
    .select("season, week")
    .order("season", { ascending: false })
    .order("week", { ascending: false })
    .limit(1);
  if (latestRes.error) return { ...empty, unavailable: true };
  const latest = latestRes.data?.[0];
  if (!latest) return empty;

  const decisions: CfbWeeklyPredictions["decisions"] = [];
  const pages = (async () => {
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await supabaseCfb
        .from("recommendations")
        .select(WEEKLY_COLUMNS)
        .eq("season", latest.season)
        .eq("week", latest.week)
        .order("start_date", { ascending: true })
        .order("game_id", { ascending: true })
        .order("market", { ascending: true })
        .range(offset, offset + PAGE - 1);
      if (error) throw error;
      decisions.push(...(data ?? []));
      if ((data?.length ?? 0) < PAGE) break;
    }
  })();
  const [teams, scheduleRes, paged] = await Promise.all([
    fetchTeams(),
    supabaseCfb
      .from("game_projections")
      .select("game_id,start_date,home_team_id,home_team,away_team_id,away_team")
      .eq("season", latest.season)
      .eq("week", latest.week)
      .order("start_date", { ascending: true })
      .order("game_id", { ascending: true }),
    pages.then(
      () => null,
      (error: { message?: string }) => error,
    ),
  ]);
  if (scheduleRes.error || paged) {
    console.error(
      "cfb weekly predictions fetch failed:",
      scheduleRes.error?.message ?? paged?.message,
    );
    return { ...empty, season: latest.season, week: latest.week, unavailable: true };
  }
  return {
    season: latest.season,
    week: latest.week,
    schedule: (scheduleRes.data ?? []).map((game) => ({
      game_id: game.game_id,
      start_date: game.start_date,
      home_team: game.home_team,
      away_team: game.away_team,
      home: teamBadge(
        game.home_team_id == null ? undefined : teams.get(game.home_team_id),
      ),
      away: teamBadge(
        game.away_team_id == null ? undefined : teams.get(game.away_team_id),
      ),
    })),
    decisions,
    unavailable: false,
  };
}
export async function fetchCfbPickSummary(filters: PickFiltersValue) {
  const [latest, result] = await Promise.all([
    supabaseCfb
      .from("game_projections")
      .select("season")
      .order("season", { ascending: false })
      .limit(1),
    supabaseCfb.rpc(
      "recommendation_summary",
      {
        p_season: filters.season ?? undefined,
        p_market: filters.market,
        p_from: filters.from ?? undefined,
      },
      { get: true },
    ),
  ]);
  return {
    latestSeason: latest.data?.[0]?.season ?? new Date().getUTCFullYear(),
    metrics: (result.data ?? []) as CfbPickMetric[],
    unavailable: Boolean(result.error),
  };
}

export async function fetchCfbPickHistory(
  filters: PickFiltersValue,
  page: number,
) {
  let query = supabaseCfb
    .from("recommendations")
    .select("*")
    .match(pickHistoryMatch(filters))
    .order("decision_at", { ascending: false })
    .order("game_id", { ascending: true })
    .order("market", { ascending: true })
    .range((page - 1) * PICK_PAGE_SIZE, page * PICK_PAGE_SIZE - 1);
  if (filters.from) query = query.gte("decision_at", filters.from);
  const { data, error } = await query;
  return { rows: (data ?? []) as CfbPick[], unavailable: Boolean(error) };
}
