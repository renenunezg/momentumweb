import type { CfbPerformanceMetric, NflPerformanceMetric } from "@/lib/types";

// cfb.performance_metrics and nfl.performance_metrics share one contract: a
// row per prediction source and segment, precomputed by the model repo from
// frozen pregame forecasts. The page formats these rows and never aggregates
// games itself.
export type FootballPerformanceMetric =
  | CfbPerformanceMetric
  | NflPerformanceMetric;

// The 95 percent paired bootstrap interval on model_minus_market_mae. The two
// schemas name the columns differently; both are null until the grading run
// that publishes them.
export function gapInterval(m: FootballPerformanceMetric): [number, number] | null {
  const lo = "model_minus_market_mae_lo_95" in m ? m.model_minus_market_mae_lo_95 : m.model_minus_market_mae_ci_low;
  const hi = "model_minus_market_mae_hi_95" in m ? m.model_minus_market_mae_hi_95 : m.model_minus_market_mae_ci_high;
  return lo == null || hi == null ? null : [lo, hi];
}

// Overall rows of the latest graded season in one request, for pages that
// cite the headline without rendering the tab.
export async function fetchOverallMetrics(
  query: () => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<{ season: number | null; metrics: FootballPerformanceMetric[] }> {
  const { data, error } = await query();
  if (error) throw new Error(error.message);
  // The generated row types a prediction_source as text; the metric type
  // narrows it to the three sources the pipeline writes.
  const rows = (data ?? []) as FootballPerformanceMetric[];
  const season = rows[0]?.season ?? null;
  return { season, metrics: rows.filter((m) => m.season === season) };
}

export interface FootballLivePerformance {
  season: number | null;
  metrics: FootballPerformanceMetric[];
  lastGradedAt: string | null;
  latestKickoff: string | null;
  // A failed read is reported as such; an empty season is a different state.
  unavailable: boolean;
  // Graded games per closing_source behind the market columns, so a close
  // captured before kickoff is never pooled silently with a provider's
  // post-game value. Null until the model repo publishes the split.
  closingSources?: Record<string, number> | null;
}

// Each sport's closing_lines row names its feed in closing_source; the two
// football repos spell the Odds API median differently.
const CLOSING_SOURCE_LABELS: Record<string, string> = {
  "odds_api:median": "Odds API median captured before kickoff",
  odds_api_median: "Odds API median captured before kickoff",
  "espn:draftkings": "ESPN DraftKings quote captured before kickoff",
  nflverse: "nflverse schedule value recorded after the game",
  cfbd_lines_median: "CFBD provider median recorded after the game",
};

export function describeClosingSources(sources: Record<string, number>): string {
  return Object.entries(sources)
    .filter(([, games]) => games > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([source, games]) => `${games} from the ${CLOSING_SOURCE_LABELS[source] ?? source}`)
    .join(", ");
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
