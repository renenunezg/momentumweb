export interface ModelOutput {
  game_pk: number;
  date: string | null;
  team: string;
  starter: string | null;
  expected_runs: number;
  win_prob: number;
  our_odds: number | null;
  moneyline: number | null;
  total: number | null;
  spread: number | null;
  spread_odds: number | null;
  our_total: number | null;
  total_diff: number | null;
  total_play: string;
  ev_flag: string;
  run_line_ev_flag: string;
  ml_confidence: number | null;
  run_line_confidence: number | null;
  kelly_quarter_ml: number | null;
  kelly_quarter_rl: number | null;
  kelly_quarter_total: number | null;
  high_variance_flag: string;
  // v2 percentile bands (nullable on legacy v1 archive rows)
  expected_runs_p10?: number | null;
  expected_runs_p50?: number | null;
  expected_runs_p90?: number | null;
  total_p10?: number | null;
  total_p50?: number | null;
  total_p90?: number | null;
  win_prob_p10?: number | null;
  win_prob_p90?: number | null;
  runs_hist?: number[] | null;
  lineup_source?: string | null;
}

export interface GameInfo {
  game_pk: number;
  game_date: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  venue: string | null;
  start_time: string | null;
}

export interface ModelEvaluation {
  date: string;
  eval_window: string;
  total_correct: number;
  total_predictions: number;
  total_accuracy: number;
  ml_correct: number;
  ml_predictions: number;
  ml_accuracy: number;
  run_line_correct: number;
  run_line_predictions: number;
  run_line_accuracy: number;
  totals_correct: number | null;
  totals_predictions: number | null;
  totals_accuracy: number | null;
  average_total_diff: number;
  average_win_prob: number;
  // Regression metrics
  mae: number | null;
  rmse: number | null;
  mape: number | null;
  r2: number | null;
  // Probabilistic metrics
  brier_score: number | null;
  log_loss: number | null;
  sharpness: number | null;
  interval_coverage_50: number | null;
  interval_coverage_80: number | null;
  interval_coverage_90: number | null;
  // Financial metrics
  roi: number | null;
  sharpe: number | null;
  sortino: number | null;
  max_drawdown: number | null;
  total_staked_units: number | null;
  net_profit_units: number | null;
  equity_end_units: number | null;
  // Segment metrics
  roi_favorites: number | null;
  roi_underdogs: number | null;
  n_favorites: number | null;
  n_underdogs: number | null;
  favorites_correct: number | null;
  underdogs_correct: number | null;
  avg_ml_line: number | null;
  overs_correct: number | null;
  overs_predictions: number | null;
  unders_correct: number | null;
  unders_predictions: number | null;
  overs_roi: number | null;
  unders_roi: number | null;
  roi_run_line: number | null;
  n_run_line: number | null;
  run_line_bets_correct: number | null;
  predictions_rewritten: boolean | null;
}

export interface CalibrationBin {
  date: string;
  bin_mid: number;
  predicted_mean: number;
  observed_rate: number;
  count: number;
}

export interface FeatureImportance {
  date: string;
  feature: string;
  importance: number;
}

export interface EdgeBucket {
  date: string;
  eval_window: string;
  bucket_label: string;
  n_bets: number;
  hit_rate: number;
  roi: number;
}

export interface PosteriorSkill {
  refit_date: string;
  actor_type: "batter" | "pitcher";
  split_label: string;
  rank_type: "top" | "bottom";
  rank: number;
  actor_id: number;
  actor_name: string | null;
  team: string | null;
  skill_score: number;
}

export interface PosteriorSigma {
  refit_date: string;
  sigma_name: string;
  mean: number;
  p10: number | null;
  p90: number | null;
}

export interface BetLedgerRow {
  date: string;
  team: string;
  game_pk: number;
  bet_type: "ml" | "rl" | "total";
  stake: number;
  decimal_odds: number;
  american_odds: number | null;
  totals_side: "over" | "under" | null;
  won: boolean;
  edge: number;
  payout: number;
}

export interface LiveKpis {
  roi: number | null;
  sharpe: number | null;
  sortino: number | null;
  max_drawdown: number | null;
  total_staked_units: number;
  net_profit_units: number;
  roi_favorites: number | null;
  n_favorites: number;
  favorites_correct: number;
  roi_underdogs: number | null;
  n_underdogs: number;
  underdogs_correct: number;
  roi_run_line: number | null;
  n_run_line: number;
  run_line_bets_correct: number;
  avg_ml_line: number | null;
  overs_correct: number;
  overs_predictions: number;
  overs_roi: number | null;
  unders_correct: number;
  unders_predictions: number;
  unders_roi: number | null;
}

export interface GameMatchup {
  game_pk: number;
  home_team: string;
  away_team: string;
  venue: string | null;
  start_time: string | null;
  date: string;
  away: ModelOutput;
  home: ModelOutput;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  // Optional live fields - populated by /api/live-scores polling, not in DB
  current_inning?: number | null;
  inning_state?: string | null;
}

// ---------------------------------------------------------------------------
// CFB (cfb schema)

// cfb.teams carries identity only; conference and classification come from
// team_ratings, which every consumer already loads.
export interface CfbTeamIdentity {
  team_id: number;
  color: string | null;
  alternate_color: string | null;
  logo_light: string | null;
  logo_dark: string | null;
}

export interface CfbTeamRating {
  season: number;
  week: number;
  as_of: string;
  model_version: string;
  team_id: number;
  team: string;
  conference: string | null;
  classification: string | null;
  offense_points: number | null;
  defense_points: number | null;
  power_rating: number;
  scoring_environment: number | null;
  expected_possessions: number | null;
  power_rating_sd: number | null;
  missing_input_count: number | null;
}

export interface CfbGameProjection {
  game_id: number;
  season: number;
  week: number;
  as_of: string;
  model_version: string;
  start_date: string | null;
  home_team_id: number | null;
  home_team: string;
  away_team_id: number | null;
  away_team: string;
  neutral_site: boolean | null;
  home_field_points: number | null;
  expected_home_points: number | null;
  expected_away_points: number | null;
  home_margin: number | null;
  home_spread: number | null;
  model_total: number | null;
  margin_sd: number | null;
  total_sd: number | null;
  margin_total_correlation: number | null;
  distribution: string | null;
  degrees_of_freedom: number | null;
  home_classification: string | null;
  away_classification: string | null;
  home_missing_input_count: number | null;
  away_missing_input_count: number | null;
  conference_game: boolean | null;
}

export interface CfbMarketComparison {
  game_id: number;
  start_date: string | null;
  home_team: string | null;
  away_team: string | null;
  model_home_spread: number | null;
  model_total: number | null;
  margin_sd: number | null;
  total_sd: number | null;
  model_as_of: string | null;
  market_available: boolean | null;
  priced_offer_available: boolean | null;
  executable_offer_available: boolean | null;
  review_status: string | null;
  recommendation_status: string | null;
  best_offer_market: string | null;
  best_offer_selection: string | null;
  best_offer_point: number | null;
  best_offer_price: number | null;
  best_offer_provider: string | null;
  best_offer_provider_key: string | null;
  best_offer_provider_last_update: string | null;
  best_offer_event_link: string | null;
  best_offer_market_link: string | null;
  best_offer_bet_link: string | null;
  best_offer_edge_points: number | null;
  best_offer_edge_standardized: number | null;
  best_offer_model_cover_probability: number | null;
  best_offer_model_fair_price: number | null;
  best_offer_expected_value_per_unit: number | null;
}

export interface CfbBacktestPrediction {
  game_id: number;
  season: number;
  week: number;
  week_index: number | null;
  season_type: string | null;
  home_team: string;
  away_team: string;
  neutral_site: boolean | null;
  home_points: number | null;
  away_points: number | null;
  margin: number | null;
  closing_spread: number | null;
  model_margin: number | null;
  actual_margin: number | null;
}
