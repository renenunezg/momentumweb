import { cache } from "react";
import { quotesAtForecast } from "@/lib/nhl-quote-history";
import { nhlPlayerHeadshotUrl } from "@/lib/player-headshots";
import {
  EMPTY_GRADES,
  ID_CHUNK,
  STATS_COLUMNS,
  INDEX_COLUMNS,
  buildGradedPlayers,
  chunk,
  rankIndex,
  readAllPages,
  toIndexRow,
  type GradedPlayer,
  type IndexRow,
  type PlayerSeasonStatsRow,
  type PositionGrades,
} from "@/lib/position-grades";
import { supabaseNhl } from "@/lib/supabase";
import type {
  NhlGameProjection,
  NhlMarketSnapshot,
  NhlPositionTrait,
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

// Each team's rating in the newest snapshot published at least a week
// before `asOf`, for the change column. A missed morning leaves a gap, so the
// snapshot found can be older than seven days; its date is returned.
export async function fetchRatingsWeekBefore(
  asOf: string,
): Promise<{ asOf: string | null; ratings: Map<string, number> }> {
  const cutoff = new Date(`${asOf}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 7);
  const { data, error } = await supabaseNhl
    .from("team_ratings")
    .select("as_of, team_abbr, rating")
    .lte("as_of", cutoff.toISOString().slice(0, 10))
    .order("as_of", { ascending: false })
    .limit(40);
  if (error) throw error;
  const previous = data?.[0]?.as_of ?? null;
  return {
    asOf: previous,
    ratings: new Map(
      (data ?? []).filter((row) => row.as_of === previous).map((row) => [row.team_abbr, row.rating]),
    ),
  };
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
  gameIds: string[], cutoffs: Record<string, string>,
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
  // The close's Brier score and winner accuracy with the forecast's on the
  // same games, and one paired standard error for each gap to the close.
  market_brier?: number | null;
  model_brier_on_market_games?: number | null;
  market_accuracy?: number | null;
  model_accuracy_on_market_games?: number | null;
  log_loss_gap_se?: number | null;
  pure_log_loss_gap_se?: number | null;
  brier_gap_se?: number | null;
  total_mae_gap_se?: number | null;
  accuracy_gap_se?: number | null;
  over_under_gap_se?: number | null;
};

// How often favorites won against how often they were expected to. Bin b
// covers 50 + 5b percent up to the next bin; bin 5 is 75 percent and above.
// The forecast's rows cover every graded game, the close's only its games.
export type NhlFavoriteBin = {
  source: "model" | "market";
  bin: number;
  n: number;
  predicted: number;
  observed: number;
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
  favorites?: NhlFavoriteBin[];
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

// Player grades: the season's snapshot of nhl.position_traits, in the shape
// the football pages use (lib/position-grades). The index carries every graded
// player; the full rows of the top of the opening position come with it and
// the rest load on demand through /nhl/api/player-traits.
async function fetchGradeIndex(season: number): Promise<IndexRow[]> {
  return readAllPages((from, to) =>
    supabaseNhl
      .from("position_traits")
      .select(INDEX_COLUMNS)
      .eq("season", season)
      .eq("trait", "grade")
      .order("athlete_id", { ascending: true })
      .range(from, to)
  );
}

// Each player's trait rows and season stat line.
export async function fetchNhlPlayerTraitRows(
  season: number,
  ids: string[],
): Promise<{ traits: NhlPositionTrait[]; stats: PlayerSeasonStatsRow[] }> {
  const parts = await Promise.all(
    chunk(ids, ID_CHUNK).map((part) =>
      Promise.all([
        readAllPages((from, to) =>
          supabaseNhl
            .from("position_traits")
            .select("*")
            .eq("season", season)
            .in("athlete_id", part)
            .order("athlete_id")
            .order("trait")
            .range(from, to)
        ),
        supabaseNhl.from("player_season_stats").select(STATS_COLUMNS).eq("season", season).in("athlete_id", part).limit(ID_CHUNK),
      ]),
    ),
  );
  const traits: NhlPositionTrait[] = [];
  const stats: PlayerSeasonStatsRow[] = [];
  for (const [traitRows, statsRes] of parts) {
    if (statsRes.error) throw statsRes.error;
    traits.push(...traitRows);
    stats.push(...(statsRes.data ?? []));
  }
  return { traits, stats };
}

// A player off his club's current roster is published without a headshot.
function withHeadshot<T extends { athlete_id: string; headshot_url?: string | null }>(row: T): T {
  return { ...row, headshot_url: row.headshot_url ?? nhlPlayerHeadshotUrl(row.athlete_id) };
}

// The number the grade ranks is published under its own name: a skater's
// total, a goalie's goals saved. The card shows it as the rating headline. A
// skater's total is the sum of the offense and defense rows the card lists, so
// it is not listed again; a goalie's is the only row he has, so it stays.
export function buildNhlGradedPlayers({ traits, stats }: { traits: NhlPositionTrait[]; stats: PlayerSeasonStatsRow[] }): Record<string, GradedPlayer> {
  const shaped = traits.map(withHeadshot).flatMap((row) => {
    if (row.trait === "total") return [{ ...row, trait: "rating" }];
    if (row.trait === "goals_saved") return [row, { ...row, trait: "rating" }];
    return [row];
  });
  return buildGradedPlayers(shaped, stats);
}

// The grade index and trait rows throw on a failed read so ISR keeps the last
// good page.
export const fetchNhlPositionGrades = cache(readNhlPositionGrades);

async function readNhlPositionGrades(): Promise<PositionGrades> {
  const latestRes = await supabaseNhl
    .from("position_traits")
    .select("season, week, as_of, model_version")
    .eq("trait", "grade")
    .order("season", { ascending: false })
    .limit(1);
  if (latestRes.error) throw latestRes.error;
  const latest = latestRes.data?.[0];
  if (!latest) return EMPTY_GRADES;

  const [gradeRows, teams] = await Promise.all([fetchGradeIndex(latest.season), fetchTeams()]);
  const { index, topIds } = rankIndex(
    gradeRows.map((row) => toIndexRow(withHeadshot(row), teams.get(row.team ?? "")?.division ?? null)),
  );
  return {
    season: latest.season,
    week: latest.week,
    asOf: latest.as_of,
    modelVersion: latest.model_version,
    index,
    details: buildNhlGradedPlayers(await fetchNhlPlayerTraitRows(latest.season, topIds)),
  };
}
