import type { Json } from "./database.types";

// Hand-written row types for the lmb schema (momentumlmb's
// 20261119120000_lmb_schema.sql), covering only what the site reads. The
// schema is not in the generated database.types.ts yet; once the migration is
// applied and lmb is exposed to the REST API, replace this file with
// `supabase gen types typescript --schema lmb` output and delete it.

type Table<Row> = { Row: Row; Insert: Row; Update: Partial<Row>; Relationships: [] };

export type LmbGameRow = {
  game_pk: number;
  game_date: string;
  start_time: string | null;
  season: number;
  game_type: string;
  home_team: string;
  away_team: string;
  home_team_id: number;
  away_team_id: number;
  venue_id: number;
  venue: string | null;
  scheduled_innings: number;
  status: string;
  home_score: number | null;
  away_score: number | null;
  updated_at: string;
};

// One row per team per game; model_outputs_season has the same shape.
export type LmbModelOutputRow = {
  game_pk: number;
  team: string;
  opponent: string;
  is_home: boolean;
  date: string;
  start_time: string | null;
  win_prob: number;
  win_prob_p10: number | null;
  win_prob_p90: number | null;
  sim_win_prob: number;
  market_prob: number | null;
  kalshi_bid: number | null;
  kalshi_ask: number | null;
  expected_runs: number;
  expected_runs_p10: number | null;
  expected_runs_p50: number | null;
  expected_runs_p90: number | null;
  runs_hist: Json;
  lineup_source: string;
  lineup_hash: string | null;
  prediction_updated_at: string;
  // Carries `pick` (parsePick) and `starter` (parseStarter) in src/lib/lmb.ts.
  prediction_context: Json;
  updated_at: string;
};

export type LmbEvaluationRow = {
  window: string;
  as_of: string;
  season: number;
  n_games: number;
  log_loss: number | null;
  brier: number | null;
  accuracy: number | null;
  kalshi_games: number;
  model_log_loss_on_kalshi: number | null;
  kalshi_log_loss: number | null;
  model_brier_on_kalshi: number | null;
  kalshi_brier: number | null;
  pick_count: number;
  pick_wins: number;
  pick_units: number;
  expected_runs_mae: number | null;
  updated_at: string;
};

export type LmbCalibrationRow = {
  season: number;
  bin: number;
  n: number;
  mean_pred: number;
  mean_obs: number;
  updated_at: string;
};

// View columns are nullable, as `supabase gen types` reports them.
export type LmbLedgerRow = {
  game_pk: number | null;
  date: string | null;
  season: number | null;
  team: string | null;
  tier: string | null;
  policy: string | null;
  probability: number | null;
  price: number | null;
  fee: number | null;
  expected_value: number | null;
  status: string | null;
  won: boolean | null;
  units: number | null;
};

export type LmbDatabase = {
  __InternalSupabase: { PostgrestVersion: "14.4" };
  lmb: {
    Tables: {
      games: Table<LmbGameRow>;
      model_outputs: Table<LmbModelOutputRow>;
      model_outputs_season: Table<LmbModelOutputRow>;
      model_evaluation: Table<LmbEvaluationRow>;
      model_calibration: Table<LmbCalibrationRow>;
    };
    Views: {
      bet_ledger_v: { Row: LmbLedgerRow; Relationships: [] };
    };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
