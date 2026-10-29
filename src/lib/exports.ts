import { supabaseMlbCached, supabaseCfb, supabaseNfl } from "@/lib/supabase";
import { toPage, type CsvExport } from "@/lib/csv-export";

// The export behind each /api/export route, with the columns a reader needs to
// recompute the page that cites it. Column lists are explicit so a JSON blob
// or a private column never leaks into a download by accident.

export const MLB_LEDGER_COLUMNS = [
  "date", "game_pk", "team", "bet_type", "totals_side", "stake", "decimal_odds",
  "american_odds", "edge", "won", "push", "payout",
] as const;

export const MLB_PREDICTION_COLUMNS = [
  "game_pk", "date", "start_time", "model_version", "team", "home_team", "away_team", "starter",
  "expected_runs", "win_prob", "our_odds", "moneyline", "spread", "spread_odds", "total",
  "total_over_odds", "total_under_odds", "p_cover", "p_over", "p_under",
  "ev_flag", "run_line_ev_flag", "total_play", "kelly_quarter_ml", "kelly_quarter_rl",
  "kelly_quarter_total", "lineup_source", "prediction_updated_at",
  "game_status", "home_score", "away_score",
] as const;

const FOOTBALL_RECOMMENDATION_COLUMNS = [
  "game_id", "market", "season", "week", "start_date", "home_team", "away_team",
  "model_version", "forecast_as_of", "policy_version", "decision_at", "published_at",
  "status", "reason", "selection", "side", "point", "price", "provider", "provider_key",
  "market_fetched_at", "provider_last_update", "win_probability", "push_probability",
  "probability_edge", "expected_value_per_unit", "stake_units", "model_home_margin",
  "model_total", "market_total", "edge_points", "outcome", "home_points", "away_points",
  "profit_units", "graded_at", "settlement_reason",
] as const;

export const CFB_RECOMMENDATION_COLUMNS = [
  ...FOOTBALL_RECOMMENDATION_COLUMNS,
  "closing_point", "closing_price", "closing_source", "clv_points",
] as const;

export const NFL_RECOMMENDATION_COLUMNS = [
  ...FOOTBALL_RECOMMENDATION_COLUMNS,
  "execution_eligibility_verified", "result_source_at",
] as const;

export const mlbLedgerExport: CsvExport = {
  filename: "mlb-prediction-ledger.csv",
  columns: MLB_LEDGER_COLUMNS,
  page: (from, to) =>
    toPage(supabaseMlbCached
      .from("bet_ledger_v")
      .select(MLB_LEDGER_COLUMNS.join(","))
      .order("date", { ascending: true })
      .order("game_pk", { ascending: true })
      .order("bet_type", { ascending: true })
      .order("team", { ascending: true })
      .range(from, to)),
};

export const mlbPredictionsExport: CsvExport = {
  filename: "mlb-graded-predictions.csv",
  columns: MLB_PREDICTION_COLUMNS,
  page: (from, to) =>
    toPage(supabaseMlbCached
      .from("model_outputs_season_unified")
      .select(MLB_PREDICTION_COLUMNS.join(","))
      .order("date", { ascending: true })
      .order("game_pk", { ascending: true })
      .order("team", { ascending: true })
      .range(from, to)),
};

export const FOOTBALL_EXPORTS = {
  cfb: {
    gradedGames: {
      filename: "cfb-graded-games.csv",
      columns: [] as readonly string[],
      page: (from, to) =>
        toPage(supabaseCfb
          .from("graded_games")
          .select("*")
          .order("start_date", { ascending: true })
          .order("game_id", { ascending: true })
          .range(from, to)),
    },
    backtest: {
      filename: "cfb-backtest-predictions.csv",
      columns: [] as readonly string[],
      page: (from, to) =>
        toPage(supabaseCfb
          .from("backtest_predictions")
          .select("*")
          .order("season", { ascending: true })
          .order("week", { ascending: true })
          .order("game_id", { ascending: true })
          .range(from, to)),
    },
    recommendations: {
      filename: "cfb-recommendations.csv",
      columns: CFB_RECOMMENDATION_COLUMNS,
      page: (from, to) =>
        toPage(supabaseCfb
          .from("recommendations")
          .select(CFB_RECOMMENDATION_COLUMNS.join(","))
          .order("start_date", { ascending: true })
          .order("game_id", { ascending: true })
          .order("market", { ascending: true })
          .range(from, to)),
    },
  },
  nfl: {
    gradedGames: {
      filename: "nfl-graded-games.csv",
      columns: [] as readonly string[],
      page: (from, to) =>
        toPage(supabaseNfl
          .from("graded_games")
          .select("*")
          .order("start_date", { ascending: true })
          .order("game_id", { ascending: true })
          .range(from, to)),
    },
    backtest: {
      filename: "nfl-backtest-predictions.csv",
      columns: [] as readonly string[],
      page: (from, to) =>
        toPage(supabaseNfl
          .from("backtest_predictions")
          .select("*")
          .order("season", { ascending: true })
          .order("week", { ascending: true })
          .order("game_id", { ascending: true })
          .range(from, to)),
    },
    recommendations: {
      filename: "nfl-recommendations.csv",
      columns: NFL_RECOMMENDATION_COLUMNS,
      page: (from, to) =>
        toPage(supabaseNfl
          .from("recommendations")
          .select(NFL_RECOMMENDATION_COLUMNS.join(","))
          .order("start_date", { ascending: true })
          .order("game_id", { ascending: true })
          .order("market", { ascending: true })
          .range(from, to)),
    },
  },
} satisfies Record<"cfb" | "nfl", Record<string, CsvExport>>;

// Tables exported with select("*") take their column order from the first
// row, which PostgREST returns in table order.
export function withColumnsFromFirstRow(spec: CsvExport): CsvExport {
  if (spec.columns.length > 0) return spec;
  let columns: readonly string[] = [];
  return {
    ...spec,
    get columns() {
      return columns;
    },
    page: async (from, to) => {
      const result = await spec.page(from, to);
      if (from === 0 && result.data?.[0]) columns = Object.keys(result.data[0]);
      return result;
    },
  };
}
