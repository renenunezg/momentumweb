import { cache } from "react";
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
  if (error) {
    console.error("nhl teams fetch failed:", error.message);
    return new Map();
  }
  return new Map((data ?? []).map((t) => [t.team_abbr, t]));
}

// The latest published ratings day, sorted by rating.
export const fetchLatestRatings = cache(
  async (): Promise<{ ratings: NhlTeamRating[]; asOf: string | null }> => {
    const latestRes = await supabaseNhl
      .from("team_ratings")
      .select("as_of")
      .order("as_of", { ascending: false })
      .limit(1);
    const asOf = latestRes.data?.[0]?.as_of;
    if (!asOf) return { ratings: [], asOf: null };
    const { data, error } = await supabaseNhl
      .from("team_ratings")
      .select("*")
      .eq("as_of", asOf)
      .order("rating", { ascending: false });
    if (error) {
      console.error("nhl ratings fetch failed:", error.message);
      return { ratings: [], asOf };
    }
    return { ratings: data ?? [], asOf };
  },
);

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

// The newest snapshot per game and provider. The feed is read once a day,
// so a game rarely has more than a few rows; newest-first with a client
// dedupe avoids a lateral join the anon role cannot express through REST.
export async function fetchLatestSnapshots(
  gameIds: string[],
): Promise<Map<string, NhlMarketSnapshot[]>> {
  const byGame = new Map<string, NhlMarketSnapshot[]>();
  if (gameIds.length === 0) return byGame;
  const { data, error } = await supabaseNhl
    .from("market_snapshots")
    .select("*")
    .in("game_id", gameIds)
    .order("fetched_at", { ascending: false });
  if (error) {
    console.error("nhl snapshots fetch failed:", error.message);
    return byGame;
  }
  const seen = new Set<string>();
  for (const row of data ?? []) {
    const key = `${row.game_id}:${row.provider_key}`;
    if (seen.has(key)) continue;
    seen.add(key);
    byGame.set(row.game_id, [...(byGame.get(row.game_id) ?? []), row]);
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
};

export type NhlAccuracy = {
  overall: NhlAccuracySlice | null;
  by_season: NhlAccuracySlice[];
  calibration: { bin: number; n: number; predicted: number; observed: number }[];
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

export function americanToImplied(price: number): number {
  return price > 0 ? 100 / (price + 100) : -price / (-price + 100);
}

export const PROVIDER_NAMES: Record<string, string> = {
  draftkings: "DraftKings",
  fanduel: "FanDuel",
};
