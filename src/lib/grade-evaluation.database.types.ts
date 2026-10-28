// Column metadata from momentumnfl/sql/021_position_grade_evaluation.sql and
// momentumcfb/sql/20261027220000_player_grade_validation.sql.
export type GradeEvaluationDatabase = {
  nfl: {
    Tables: {
      position_grade_evaluation: {
        Row: {
          model_version: string;
          position_group: string;
          evaluation: string;
          sample_set: string;
          seasons: string;
          validation_season: number;
          checkpoint_week: number | null;
          target: string;
          players: number | null;
          player_seasons: number;
          grade_spearman: number;
          baseline: string;
          baseline_spearman: number;
          difference: number;
          difference_ci_low: number | null;
          difference_ci_high: number | null;
          thin_sample: boolean;
          holdout_status: string;
          computed_at: string;
        };
        Insert: Partial<GradeEvaluationDatabase["nfl"]["Tables"]["position_grade_evaluation"]["Row"]>;
        Update: Partial<GradeEvaluationDatabase["nfl"]["Tables"]["position_grade_evaluation"]["Row"]>;
        Relationships: [];
      };
    };
  };
  cfb: {
    Tables: {
      player_grade_validation: {
        Row: {
          grade_model_version: string;
          model_sha: string;
          input_value_model_version: string;
          eval_kind: string;
          seasons: string;
          position_group: string;
          players: number;
          spearman_grade: number;
          spearman_epa_credit: number;
          spearman_games: number | null;
          spearman_value_above_replacement: number | null;
          spearman_qbr: number | null;
          diff_grade_minus_epa: number;
          diff_lo_95: number | null;
          diff_hi_95: number | null;
          holdout_status: string;
          computed_at: string;
        };
        Insert: Partial<GradeEvaluationDatabase["cfb"]["Tables"]["player_grade_validation"]["Row"]>;
        Update: Partial<GradeEvaluationDatabase["cfb"]["Tables"]["player_grade_validation"]["Row"]>;
        Relationships: [];
      };
    };
  };
};
