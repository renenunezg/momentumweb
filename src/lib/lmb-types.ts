import type { Database } from "./database.types";

// Row types for the lmb schema, from the generated database.types.ts.
type Lmb = Database["lmb"];

export type LmbGameRow = Lmb["Tables"]["games"]["Row"];
// One row per team per game; model_outputs_season has the same shape.
// prediction_context carries `pick` (parsePick) and `starter` (parseStarter) in src/lib/lmb.ts.
export type LmbModelOutputRow = Lmb["Tables"]["model_outputs"]["Row"];
export type LmbEvaluationRow = Lmb["Tables"]["model_evaluation"]["Row"];
export type LmbCalibrationRow = Lmb["Tables"]["model_calibration"]["Row"];
export type LmbLedgerRow = Lmb["Views"]["bet_ledger_v"]["Row"];
// Playoff odds are basis points (0 to 10000); divide by 10000 for a probability.
export type LmbPlayoffOddsRow = Lmb["Tables"]["playoff_odds"]["Row"];
// raw_score is uncalibrated, so the site reads role_rank and never the score.
export type LmbProspectRow = Omit<Lmb["Tables"]["prospects"]["Row"], "raw_score">;
export type LmbAwardBoardRow = Lmb["Tables"]["award_boards"]["Row"];
export type LmbAwardModelRow = Lmb["Tables"]["award_models"]["Row"];
