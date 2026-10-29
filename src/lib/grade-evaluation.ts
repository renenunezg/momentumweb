import { cache } from "react";
import { supabase, supabaseCfb, supabaseNfl } from "@/lib/supabase";
import { formatSigned } from "@/lib/utils";
import type { Tables } from "@/lib/database-schema";

// Player-grade evaluations the model repos publish for the performance pages:
// NFL rows in nfl.position_grade_evaluation, CFB rows in
// cfb.player_grade_validation, and the MLB forward head-to-head stored on the
// live model row at payload.evaluation.forward. Every number is served as
// published; nothing is recomputed here.

export type NflGradeEvaluationRow = Tables<"nfl", "position_grade_evaluation">;
export type CfbGradeValidationRow = Tables<"cfb", "player_grade_validation">;

export const NFL_BASELINE_LABELS: Record<string, string> = {
  epa_credit: "Last season's EPA credit",
  standard: "Position's standard stat",
  epa_db: "EPA per dropback to date",
  epa_cpoe: "EPA + CPOE composite",
  dakota: "DAKOTA (nflfastR) to date",
  qbr: "ESPN Total QBR to date",
  qbr_raw: "ESPN raw QBR to date",
  epa_prior: "EPA per dropback + last season",
  dakota_prior: "DAKOTA + last season",
  qbr_prior: "QBR + last season",
  epa_game: "EPA per game to date",
  epa_game_prior: "EPA per game + last season",
};

export const NFL_HOLDOUT_LABELS: Record<string, string> = {
  development: "development, cross-validated",
  clean: "untouched holdout",
  viewed: "holdout viewed before the final model choices",
  screened: "season also used to screen the model's measures",
};

export const fetchNflGradeEvaluation = cache(async (): Promise<NflGradeEvaluationRow[]> => {
  const { data, error } = await supabaseNfl
    .from("position_grade_evaluation")
    .select("*")
    .is("checkpoint_week", null)
    .order("position_group")
    .order("baseline");
  if (error) throw new Error(`position_grade_evaluation: ${error.message}`);
  return data;
});

export const fetchCfbGradeValidation = cache(async (): Promise<CfbGradeValidationRow[]> => {
  const { data, error } = await supabaseCfb
    .from("player_grade_validation")
    .select("*")
    .order("eval_kind")
    .order("position_group");
  if (error) throw new Error(`player_grade_validation: ${error.message}`);
  return data;
});

export type ForwardSystem = "zips" | "the_bat" | "steamer";
export type ForwardSnapshotSystem = "zips_ros" | "the_bat_ros";

export interface ForwardComparison {
  rho_grade: number;
  rho_system: number;
  diff: number;
  ci95: [number, number];
  wins: number;
  checkpoints: number;
  mean_n: number;
}

export interface ForwardBlock {
  grade_column: string;
  system_statistic: string;
  target: string;
  preseason: Partial<Record<ForwardSystem, ForwardComparison>>;
  in_season: Partial<Record<ForwardSystem, ForwardComparison>>;
  by_season_preseason: Record<string, Partial<Record<ForwardSystem, ForwardComparison>>>;
  rest_of_season_snapshots?: Partial<Record<ForwardSnapshotSystem, ForwardComparison>>;
}

export interface ForwardEvaluation {
  method: string;
  computed_at: string;
  source: string;
  seasons: number[];
  systems: Record<string, string>;
  pools: {
    hitter: Record<string, ForwardBlock>;
    SP: Record<string, ForwardBlock>;
    RP: Record<string, ForwardBlock>;
  };
  caveats: string[];
}

export const FORWARD_SYSTEM_LABELS: Record<ForwardSystem | ForwardSnapshotSystem, string> = {
  zips: "ZiPS",
  the_bat: "THE BAT X",
  steamer: "Steamer",
  zips_ros: "ZiPS rest of season",
  the_bat_ros: "THE BAT X rest of season",
};

// mlb.player_value_evaluation is a view over the model row that exposes only
// the published evaluation block; the fitted weights on the row stay private.
// A missing view or block degrades to "not published" rather than failing the
// performance page.
export const fetchMlbForwardEvaluation = cache(
  async (modelVersion: string): Promise<ForwardEvaluation | null> => {
    const { data, error } = await supabase
      .from("player_value_evaluation")
      .select("model_version, forward")
      .eq("model_version", modelVersion)
      .maybeSingle();
    if (error) {
      console.error("player_value_evaluation unavailable:", error.message);
      return null;
    }
    const forward = (data as unknown as { forward?: unknown } | null)?.forward;
    return forward && typeof forward === "object" ? (forward as ForwardEvaluation) : null;
  },
);

/** "+0.05 (+0.01 to +0.10)", with the interval's verdict for the caption. */
export function describeGap(diff: number, lo: number | null, hi: number | null, decimals = 2) {
  const text = lo == null || hi == null ? formatSigned(diff, decimals) : `${formatSigned(diff, decimals)} (${formatSigned(lo, decimals)} to ${formatSigned(hi, decimals)})`;
  const verdict = lo == null || hi == null ? null : lo > 0 ? "clear of zero" : hi < 0 ? "behind, clear of zero" : "within noise";
  return { text, verdict };
}
