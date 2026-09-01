import type { Tables } from "@/lib/database.types";

// Row types come from the generated schema so a column change in a model repo
// fails the build here. Where the site relies on a column the pipeline always
// writes but the schema leaves nullable, `Narrow` records that assumption in
// one place; the cast at the read site is the only trust boundary.
export type Narrow<Row, N extends Partial<Record<keyof Row, unknown>>> = Omit<
  Row,
  keyof N
> &
  N;

// ---------------------------------------------------------------------------
// MLB (mlb schema)

// The scorer writes the projection, the win probability and the play flags in
// one statement, so a row missing any of them is half-written and is dropped
// at the read boundary rather than rendered as NaN.
export type ModelOutput = Narrow<
  Tables<"mlb", "model_outputs">,
  {
    expected_runs: number;
    win_prob: number;
    total_play: string;
    ev_flag: string;
    run_line_ev_flag: string;
    high_variance_flag: string;
    runs_hist: number[] | null;
  }
>;

export type GameInfo = Pick<
  Tables<"mlb", "games">,
  | "game_pk"
  | "game_date"
  | "home_team"
  | "away_team"
  | "home_score"
  | "away_score"
  | "status"
  | "venue"
  | "start_time"
>;

// The nightly batch always fills the count and accuracy columns; only the
// regression, probabilistic and financial metrics are legitimately null.
export type ModelEvaluation = Narrow<
  Tables<"mlb", "model_evaluation">,
  {
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
    average_total_diff: number;
    average_win_prob: number;
  }
>;

export type CalibrationBin = Narrow<
  Tables<"mlb", "model_calibration">,
  { predicted_mean: number; observed_rate: number; count: number }
>;

export type EdgeBucket = Narrow<
  Tables<"mlb", "model_edge_buckets">,
  { n_bets: number; hit_rate: number; roi: number }
>;

export type PosteriorSkill = Narrow<
  Tables<"mlb", "posterior_skills">,
  { actor_type: "batter" | "pitcher"; rank_type: "top" | "bottom" }
>;

export type PosteriorSigma = Tables<"mlb", "posterior_sigmas">;

// bet_ledger_v is a view, so Postgres reports every column nullable; the view
// only emits settled bets, which have all of these.
export type BetLedgerRow = Narrow<
  Tables<"mlb", "bet_ledger_v">,
  {
    date: string;
    team: string;
    game_pk: number;
    bet_type: "ml" | "rl" | "total";
    stake: number;
    decimal_odds: number;
    totals_side: "over" | "under" | null;
    won: boolean;
    edge: number;
    payout: number;
  }
>;

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
  // Filled by the live-scores poll, never stored.
  current_inning?: number | null;
  inning_state?: string | null;
}

// ---------------------------------------------------------------------------
// CFB (cfb schema)

// cfb.teams carries identity only; conference and classification come from
// team_ratings, which every consumer already loads.
export type CfbTeamIdentity = Tables<"cfb", "teams">;
export type CfbTeamRating = Tables<"cfb", "team_ratings">;
export type CfbTeamUnitRating = Tables<"cfb", "team_unit_ratings">;
export type CfbGameProjection = Tables<"cfb", "game_projections">;
export type CfbMarketComparison = Tables<"cfb", "market_comparisons">;
export type CfbBacktestPrediction = Tables<"cfb", "backtest_predictions">;

// One frozen grading record per completed game: the projection published
// before kickoff, the CFBD closing line, and the final score.
export type CfbGradedGame = Narrow<
  Tables<"cfb", "graded_games">,
  { home_team: string; away_team: string }
>;

export type CfbPredictionSource =
  | "pure_model"
  | "market_informed"
  | "closing_market";

export type CfbPerformanceMetric = Narrow<
  Tables<"cfb", "performance_metrics">,
  { prediction_source: CfbPredictionSource }
>;

// ---------------------------------------------------------------------------
// NFL (nfl schema)

// nfl.teams carries identity only, keyed by the current franchise
// abbreviation; conference and division come from team_ratings.
export type NflTeamIdentity = Tables<"nfl", "teams">;
export type NflTeamRating = Tables<"nfl", "team_ratings">;
export type NflTeamUnitRating = Tables<"nfl", "team_unit_ratings">;
export type NflGameProjection = Tables<"nfl", "game_projections">;
export type NflMarketComparison = Tables<"nfl", "market_comparisons">;
export type NflBacktestPrediction = Tables<"nfl", "backtest_predictions">;
