import { supabaseNhl } from "@/lib/supabase";
import type { NhlPick, NhlPickMetric } from "@/lib/types";
import {
  PICK_PAGE_SIZE,
  pickHistoryMatch,
  type PickFiltersValue,
} from "@/lib/football-picks";
export * from "@/lib/football-picks";
export type { NhlPick, NhlPickMetric };

type Summary = { metrics: NhlPickMetric[]; seasons: number[] };
type NhlPickHistoryRow = Omit<NhlPick, "pricing_weights">;
// The history table never reads pricing_weights, so it stays behind.
const NHL_HISTORY_COLUMNS =
  "game_id,market,season,game_date,start_date,home_team,away_team,model_version,forecast_as_of,missing_input_count,policy_version,decision_at,published_at,status,reason,selection,side,point,price,provider,provider_key,market_fetched_at,provider_event_id,provider_start_date,provider_last_update,win_probability,push_probability,probability_edge,edge_points,expected_value_per_unit,stake_units,kelly_fraction,minimum_price,home_lambda,away_lambda,model_total,market_total,source_timestamps,data_flags,outcome,home_goals,away_goals,profit_units,graded_at,settlement_reason,result_source_at";

export const NHL_DECISION_COLUMNS =
  "game_id,market,start_date,home_team,away_team,status,reason,selection,side,point,price,provider,provider_key,win_probability,push_probability,probability_edge,edge_points,expected_value_per_unit,kelly_fraction,minimum_price,market_total,outcome,profit_units,decision_at";

export type NhlDecision = Pick<
  NhlPick,
  | "game_id"
  | "market"
  | "start_date"
  | "home_team"
  | "away_team"
  | "status"
  | "reason"
  | "selection"
  | "side"
  | "point"
  | "price"
  | "provider"
  | "provider_key"
  | "win_probability"
  | "push_probability"
  | "probability_edge"
  | "edge_points"
  | "expected_value_per_unit"
  | "kelly_fraction"
  | "minimum_price"
  | "market_total"
  | "outcome"
  | "profit_units"
  | "decision_at"
>;

function args(filters: PickFiltersValue) {
  return {
    p_season: filters.season ?? undefined,
    p_market: filters.market,
    p_from: filters.from ?? undefined,
  };
}

export async function fetchNhlPickSummary(filters: PickFiltersValue) {
  const { data, error } = await supabaseNhl.rpc(
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

export async function fetchNhlPickHistory(
  filters: PickFiltersValue,
  page: number,
) {
  let query = supabaseNhl
    .from("recommendations")
    .select(NHL_HISTORY_COLUMNS)
    .match(pickHistoryMatch(filters))
    .order("decision_at", { ascending: false })
    .order("game_id", { ascending: true })
    .order("market", { ascending: true })
    .range((page - 1) * PICK_PAGE_SIZE, page * PICK_PAGE_SIZE - 1);
  if (filters.from) query = query.gte("decision_at", filters.from);
  const [summary, { data, error }] = await Promise.all([
    fetchNhlPickSummary(filters),
    query,
  ]);
  return {
    ...summary,
    rows: (data ?? []) as NhlPickHistoryRow[],
    unavailable: summary.unavailable || Boolean(error),
  };
}

// Decisions for the games starting inside a window, newest decision first
// within a game so a replaced No Play reads correctly.
export async function fetchNhlDecisions(
  from: string,
  to: string,
): Promise<{ decisions: NhlDecision[]; unavailable: boolean }> {
  const { data, error } = await supabaseNhl
    .from("recommendations")
    .select(NHL_DECISION_COLUMNS)
    .gte("start_date", from)
    .lt("start_date", to)
    .order("start_date", { ascending: true })
    .order("game_id", { ascending: true })
    .order("market", { ascending: true });
  if (error) {
    console.error("nhl decisions fetch failed:", error.message);
    return { decisions: [], unavailable: true };
  }
  return { decisions: (data ?? []) as NhlDecision[], unavailable: false };
}
