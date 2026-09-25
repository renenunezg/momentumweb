import {
  pickFilters,
  type FootballPick,
  type FootballPickMetric,
  type PickFiltersValue,
} from "./football-picks.ts";

export function historyFilters(
  params: Parameters<typeof pickFilters>[0],
  now = new Date(),
) {
  const filters = pickFilters(params, "7");
  if (filters.period === "all") return { ...filters, from: null, to: null };
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() + 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - Number(filters.period));
  return {
    ...filters,
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

export type HistoryFilters = ReturnType<typeof historyFilters>;
export const HISTORY_SUMMARY_COLUMNS =
  "game_id,season,status,outcome,stake_units,profit_units,expected_value_per_unit,decision_at,graded_at";
export type HistorySummaryRow = Pick<
  FootballPick,
  | "game_id"
  | "season"
  | "status"
  | "outcome"
  | "stake_units"
  | "profit_units"
  | "expected_value_per_unit"
  | "decision_at"
  | "graded_at"
>;

// The existing summary RPCs filter publication dates. Read only compact
// ledger fields for bounded history windows, keeping all-time aggregation
// in the database and never sending these summary rows to the browser.
export async function fetchHistorySummary(
  filters: PickFiltersValue,
  readPage: (from: number, to: number) => PromiseLike<{
    data: HistorySummaryRow[] | null;
    error: unknown;
  }>,
) {
  const metric: FootballPickMetric = {
    season: filters.season,
    segment_kind: filters.market === "all" ? "overall" : "market",
    segment: filters.market === "all" ? "All picks" : filters.market,
    picks: 0,
    no_plays: 0,
    pending: 0,
    wins: 0,
    losses: 0,
    pushes: 0,
    voids: 0,
    staked_units: 0,
    profit_units: 0,
    average_ev: null,
    first_decision_at: null,
    last_decision_at: null,
    last_graded_at: null,
    roi: null,
    win_rate: null,
    thin_sample: null,
    unique_games: 0,
  };
  const games = new Set<string | number>();
  const seasons = new Set<number>();
  let evSum = 0;
  let evCount = 0;
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await readPage(offset, offset + 999);
    if (error) return { metrics: [], seasons: [], unavailable: true };
    for (const row of data ?? []) {
      seasons.add(row.season);
      if (
        metric.first_decision_at === null ||
        row.decision_at < metric.first_decision_at
      )
        metric.first_decision_at = row.decision_at;
      if (
        metric.last_decision_at === null ||
        row.decision_at > metric.last_decision_at
      )
        metric.last_decision_at = row.decision_at;
      if (row.status !== "recommended") {
        metric.no_plays!++;
        continue;
      }
      metric.picks!++;
      games.add(row.game_id);
      if (row.expected_value_per_unit !== null) {
        evSum += row.expected_value_per_unit;
        evCount++;
      }
      if (
        row.graded_at &&
        (metric.last_graded_at === null || row.graded_at > metric.last_graded_at)
      )
        metric.last_graded_at = row.graded_at;
      if (row.outcome === "pending") metric.pending!++;
      if (row.outcome === "void") metric.voids!++;
      if (row.outcome === "win") metric.wins!++;
      if (row.outcome === "loss") metric.losses!++;
      if (row.outcome === "push") metric.pushes!++;
      if (["win", "loss", "push"].includes(row.outcome)) {
        metric.staked_units! += row.stake_units;
        metric.profit_units! += row.profit_units ?? 0;
      }
    }
    if ((data?.length ?? 0) < 1000) break;
  }
  metric.unique_games = games.size;
  metric.average_ev = evCount ? evSum / evCount : null;
  const decided = metric.wins! + metric.losses!;
  metric.win_rate = decided ? metric.wins! / decided : null;
  metric.roi =
    metric.staked_units! > 0 ? metric.profit_units! / metric.staked_units! : null;
  return {
    metrics: [metric],
    seasons: [...seasons].sort((a, b) => b - a),
    unavailable: false,
  };
}
