import { supabaseNfl } from "@/lib/supabase";
import type { NflPicksDatabase } from "@/lib/nfl-picks.database.types";
import {
  PICK_PAGE_SIZE,
  pickHistoryMatch,
  type PickFiltersValue,
} from "@/lib/football-picks";
export * from "@/lib/football-picks";
export type NflPick =
  NflPicksDatabase["nfl"]["Tables"]["recommendations"]["Row"];
export type NflPickMetric =
  NflPicksDatabase["nfl"]["Views"]["recommendation_performance"]["Row"];
type Summary = { metrics: NflPickMetric[]; seasons: number[] };
type NflPickHistoryRow = Omit<NflPick, "pricing_weights">;
const NFL_HISTORY_COLUMNS =
  "game_id,market,season,week,start_date,home_team,away_team,model_version,forecast_as_of,home_missing_input_count,away_missing_input_count,policy_version,decision_at,published_at,status,reason,selection,side,point,price,provider,provider_key,market_fetched_at,odds_api_event_id,provider_start_date,provider_last_update,match_score,execution_eligibility_verified,win_probability,push_probability,probability_edge,expected_value_per_unit,stake_units,model_home_margin,model_total,margin_sd,total_sd,degrees_of_freedom,outcome,home_points,away_points,profit_units,graded_at,source_timestamps,data_flags,settlement_reason,result_source_at";
function args(filters: PickFiltersValue) {
  return {
    p_season: filters.season ?? undefined,
    p_market: filters.market,
    p_from: filters.from ?? undefined,
  };
}
export async function fetchNflPickSummary(filters: PickFiltersValue) {
  const { data, error } = await supabaseNfl.rpc(
    "recommendation_dashboard",
    args(filters),
    { get: true },
  );
  const result = data as Summary | null;
  return {
    metrics: result?.metrics ?? [],
    seasons: result?.seasons ?? [],
    latestSeason: result?.seasons?.[0] ?? new Date().getUTCFullYear(),
    unavailable: Boolean(error),
  };
}
// Rows come straight from the table rather than the model repo's paging RPC,
// which lists No Play decisions for every market selection; pricing_weights
// is the one column the history table never reads, so it stays behind.
export async function fetchNflPickHistory(
  filters: PickFiltersValue,
  page: number,
) {
  let query = supabaseNfl
    .from("recommendations")
    .select(NFL_HISTORY_COLUMNS)
    .match(pickHistoryMatch(filters))
    .order("decision_at", { ascending: false })
    .order("game_id", { ascending: true })
    .order("market", { ascending: true })
    .range((page - 1) * PICK_PAGE_SIZE, page * PICK_PAGE_SIZE - 1);
  if (filters.from) query = query.gte("decision_at", filters.from);
  const [summary, { data, error }] = await Promise.all([
    fetchNflPickSummary(filters),
    query,
  ]);
  return {
    ...summary,
    rows: (data ?? []) as NflPickHistoryRow[],
    unavailable: summary.unavailable || Boolean(error),
  };
}
