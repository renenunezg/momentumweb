import { cache } from "react";
import { quotesAtForecast } from "@/lib/nhl-quote-history";
import { supabaseNhl } from "@/lib/supabase";
import type {
  NhlGameProjection,
  NhlMarketSnapshot,
  NhlTeamIdentity,
  NhlTeamRating,
} from "@/lib/types";

// The NHL model publishes daily: ratings keyed by date, projections keyed by
// game, and every partner-feed read archived as a market snapshot.

export async function fetchTeams(): Promise<Map<string, NhlTeamIdentity>> {
  const { data, error } = await supabaseNhl.from("teams").select("*");
  if (error) throw error;
  return new Map((data ?? []).map((t) => [t.team_abbr, t]));
}

// The latest published ratings day, sorted by rating. A failed read throws so
// ISR keeps the last good page.
export const fetchLatestRatings = cache(readLatestRatings);

async function readLatestRatings(): Promise<{ ratings: NhlTeamRating[]; asOf: string | null }> {
  const latestRes = await supabaseNhl
    .from("team_ratings")
    .select("as_of")
    .order("as_of", { ascending: false })
    .limit(1);
  if (latestRes.error) throw latestRes.error;
  const asOf = latestRes.data?.[0]?.as_of;
  if (!asOf) return { ratings: [], asOf: null };
  const { data, error } = await supabaseNhl
    .from("team_ratings")
    .select("*")
    .eq("as_of", asOf)
    .order("rating", { ascending: false });
  if (error) throw error;
  return { ratings: data ?? [], asOf };
}

export async function fetchProjections(
  from: string,
  to: string,
): Promise<{ games: NhlGameProjection[]; unavailable: boolean }> {
  const { data, error } = await supabaseNhl
    .from("game_projections")
    .select("*")
    .gte("start_date", from)
    .lt("start_date", to)
    .order("start_date", { ascending: true })
    .order("game_id", { ascending: true });
  if (error) {
    console.error("nhl projections fetch failed:", error.message);
    return { games: [], unavailable: true };
  }
  return { games: data ?? [], unavailable: false };
}

async function fetchSnapshotRows(
  gameIds: string[], cutoffs: Record<string, string> = {},
): Promise<NhlMarketSnapshot[]> {
  if (gameIds.length === 0) return [];
  const { data, error } = await supabaseNhl.rpc("latest_market_snapshots", {
    p_game_ids: gameIds, p_cutoffs: cutoffs,
  });
  if (error) {
    console.error("nhl snapshots fetch failed:", error.message);
    return [];
  }
  return data ?? [];
}

// Current quotes used on the schedule page.
export async function fetchLatestSnapshots(
  gameIds: string[],
): Promise<Map<string, NhlMarketSnapshot[]>> {
  const byGame = new Map<string, NhlMarketSnapshot[]>();
  const rows = await fetchSnapshotRows(gameIds);
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;
  const seen = new Set<string>();
  for (const row of rows) {
    const key = `${row.game_id}:${row.provider_key}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // Fetching an old quote again does not make it a current book price.
    const updated = Date.parse(row.provider_last_update ?? "");
    const fetched = Date.parse(row.fetched_at);
    if (!(updated <= fetched && fetched <= now && now - updated <= maxAge)) continue;
    byGame.set(row.game_id, [...(byGame.get(row.game_id) ?? []), row]);
  }
  return byGame;
}

// Games compares both sides with the prices available at its forecast cutoff.
// Later fetches cannot replace the historical comparison for a started game.
export async function fetchForecastSnapshots(
  games: NhlGameProjection[],
): Promise<Map<string, NhlMarketSnapshot[]>> {
  const forecasts = new Map(games.map((game) => [game.game_id, game]));
  const byGame = new Map<string, NhlMarketSnapshot[]>();
  const seen = new Set<string>();
  for (const row of await fetchSnapshotRows([...forecasts.keys()], Object.fromEntries(games.map((game) => [game.game_id, game.as_of])))) {
    const forecast = forecasts.get(row.game_id);
    if (!forecast || Date.parse(row.fetched_at) > Date.parse(forecast.as_of)) continue;
    const key = `${row.game_id}:${row.provider_key}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const verified = quotesAtForecast(row, forecast);
    if (verified) byGame.set(row.game_id, [...(byGame.get(row.game_id) ?? []), verified]);
  }
  return byGame;
}

export type NhlAccuracySlice = {
  season?: number;
  n: number;
  log_loss: number;
  brier: number;
  accuracy: number;
  home_win_rate: number;
  total_mae: number;
  total_bias: number;
  // Market figures cover only the games with a recorded close, so each
  // model figure beside them is rescored on that same subset.
  market_n: number;
  market_log_loss: number | null;
  model_log_loss_on_market_games: number | null;
  pure_model_log_loss_on_market_games: number | null;
  market_total_n: number;
  market_total_mae: number | null;
  model_total_mae_on_market_games: number | null;
  pure_model_total_mae_on_market_games: number | null;
  // Absent from a response cached before the function published them.
  total_rmse?: number;
  // Over or under the closing total, a push excluded. The market's figure
  // needs closing over and under prices, which the backtest does not carry.
  over_under_n?: number;
  over_rate?: number | null;
  over_under_log_loss?: number | null;
  market_over_under_n?: number;
  market_over_under_log_loss?: number | null;
  model_over_under_log_loss_on_market_games?: number | null;
};

// One game date or month, as sums so a window pools its games. The live
// record has both series; the backtest only months.
export type NhlAccuracyPeriod = {
  date: string;
  n: number;
  correct: number;
  log_loss_sum: number;
  total_abs_error_sum: number;
  total_error_sum: number;
  // The market's sums cover only the games with a recorded close.
  market_n: number;
  market_correct: number;
  market_log_loss_sum: number;
  market_total_n: number;
  market_total_abs_error_sum: number;
  market_total_error_sum: number;
};

export type NhlAccuracy = {
  overall: NhlAccuracySlice | null;
  by_season: NhlAccuracySlice[];
  calibration: { bin: number; n: number; predicted: number; observed: number }[];
  by_day?: NhlAccuracyPeriod[];
  by_month?: NhlAccuracyPeriod[];
  // Predicted minus actual goals; bin b holds errors from b up to b + 1.
  total_errors?: { bin: number; n: number }[];
  missing_forecast: number;
};

export async function fetchForecastAccuracy(
  source: "live" | "backtest",
): Promise<NhlAccuracy> {
  const { data, error } = await supabaseNhl.rpc(
    "forecast_accuracy",
    { p_source: source },
    { get: true },
  );
  if (error) throw error;
  return data as unknown as NhlAccuracy;
}

// The best posted moneyline for a side across the providers in a game's
// latest snapshots, with the provider that posted it.
export function bestMoneyline(
  snapshots: NhlMarketSnapshot[] | undefined,
  side: "home" | "away",
): { price: number; provider: string } | null {
  let best: { price: number; provider: string } | null = null;
  for (const row of snapshots ?? []) {
    const price = side === "home" ? row.home_price : row.away_price;
    if (price == null) continue;
    if (!best || price > best.price) best = { price, provider: row.provider_key };
  }
  return best;
}

