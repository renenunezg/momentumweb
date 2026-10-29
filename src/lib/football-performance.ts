import type { CfbPerformanceMetric, NflPerformanceMetric } from "@/lib/types";

// cfb.performance_metrics and nfl.performance_metrics share one contract: a
// row per prediction source and segment, precomputed by the model repo from
// frozen pregame forecasts. The page formats these rows and never aggregates
// games itself.
export type FootballPerformanceMetric =
  | CfbPerformanceMetric
  | NflPerformanceMetric;

export interface FootballLivePerformance {
  season: number | null;
  metrics: FootballPerformanceMetric[];
  lastGradedAt: string | null;
  latestKickoff: string | null;
  // A failed read is reported as such; an empty season is a different state.
  unavailable: boolean;
}

export interface FootballPerformanceCopy {
  // What the closing line is and where it comes from, completing the sentence
  // "the projection published before kickoff, <closingLine>, and the final
  // score".
  closingLine: string;
  cadence: string;
  // Status of the live season, after "<season> season, graded as played".
  seasonLabel: string;
  // Which model versions published the live record; the metrics table carries
  // no version column yet, so this is copy kept in step with the model repo.
  versions: string;
  // A segment kind whose rows describe the composition of the headline, shown
  // under the KPIs so a pooled gap is not read as one population.
  compositionKind?: string;
  // Segment tables shown in the main section, in order.
  segments: { kind: string; title: string }[];
  // Segment tables folded into the diagnostics disclosure, with its note.
  diagnostics: { note: string; segments: { kind: string; title: string }[] };
}
