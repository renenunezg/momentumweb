export const AWARDS = {
  MVP: "Most Valuable Player",
  OPOY: "Offensive Player of the Year",
  OROY: "Offensive Rookie of the Year",
  DPOY: "Defensive Player of the Year",
  DROY: "Defensive Rookie of the Year",
  CPOY: "Comeback Player of the Year",
  COY: "Coach of the Year",
} as const;
export type AwardKey = keyof typeof AWARDS;

export interface AwardBoard {
  season: number; week: number; award: AwardKey; as_of: string; model_version: string;
  candidate_id: string; candidate_name: string; headshot_url: string | null; team: string; position: string;
  predicted_rank: number | null; performance_rank: number | null; performance_score: number | null;
  win_probability: number | null; probability_status: string; rank_change: number | null;
  games: number; projected_stats: Record<string, number>;
  drivers: { feature: string; contribution: number }[]; context_source: string | null; context_reason: string | null;
}
export interface AwardMeta {
  season: number; week: number; award: AwardKey; as_of: string; model_version: string;
  status: string; candidate_count: number; training_seasons: number[];
  validation: {
    status: string; seasons: number; probabilities_publishable: boolean;
    winner_hit_rate?: number; top_three_rate?: number; winner_pool_coverage?: number;
    log_loss?: number; brier?: number; leader_calibration_gap?: number;
  };
  provenance: { cutoff: string; source_basis?: string; projection_basis?: string };
}
