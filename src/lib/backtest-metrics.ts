// Model-versus-market scoring for the CFB and NFL backtests. The market's
// implied home margin is the negated closing spread; both model and market
// are scored against the same actual margin.

export interface BacktestRow {
  season: number;
  model_margin: number | null;
  closing_spread: number | null;
  actual_margin: number | null;
}

export interface SliceMetrics {
  label: string;
  games: number;
  modelMae: number;
  marketMae: number;
  modelBeatsMarket: number;
  bias: number;
}

export function computeMetrics(
  label: string,
  rows: BacktestRow[]
): SliceMetrics | null {
  let games = 0;
  let modelAbs = 0;
  let marketAbs = 0;
  let modelWins = 0;
  let biasSum = 0;
  for (const r of rows) {
    if (r.model_margin == null || r.closing_spread == null || r.actual_margin == null) {
      continue;
    }
    const modelErr = r.model_margin - r.actual_margin;
    const marketErr = -r.closing_spread - r.actual_margin;
    games += 1;
    modelAbs += Math.abs(modelErr);
    marketAbs += Math.abs(marketErr);
    if (Math.abs(modelErr) < Math.abs(marketErr)) modelWins += 1;
    biasSum += modelErr;
  }
  if (games === 0) return null;
  return {
    label,
    games,
    modelMae: modelAbs / games,
    marketMae: marketAbs / games,
    modelBeatsMarket: modelWins / games,
    bias: biasSum / games,
  };
}

export function metricsBySeason(rows: BacktestRow[]): {
  overall: SliceMetrics | null;
  bySeason: SliceMetrics[];
  seasons: number[];
} {
  const seasons = [...new Set(rows.map((r) => r.season))].sort((a, b) => a - b);
  const bySeason = seasons
    .map((season) =>
      computeMetrics(String(season), rows.filter((r) => r.season === season))
    )
    .filter((m): m is SliceMetrics => m != null);
  return { overall: computeMetrics("All seasons", rows), bySeason, seasons };
}
