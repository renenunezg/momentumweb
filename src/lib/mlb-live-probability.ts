export interface LiveProbabilityPoint {
  id: string;
  label: string;
  description: string;
  home_score: number;
  away_score: number;
  home_win_probability: number;
}

export interface LiveProbability {
  schema_version: 1;
  game_pk: number;
  status: string;
  abstract_state: "Live" | "Final";
  fetched_at: string;
  source_timestamp: string;
  home_team: string;
  away_team: string;
  home_score?: number;
  away_score?: number;
  home_win_probability: number | null;
  away_win_probability: number | null;
  unavailable_reason?: string;
  history_omitted?: number;
  state: {
    inning: number;
    top: boolean;
    outs: number;
    bases: number;
    balls: number;
    strikes: number;
  } | null;
  history: LiveProbabilityPoint[];
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const probability = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
const integer = (value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
const timestamp = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));

// The site validates the serving contract; probability calculations stay in MLB.
export function parseLiveProbability(value: unknown, gamePk: number): LiveProbability | null {
  if (!record(value) || value.schema_version !== 1 || value.game_pk !== gamePk ||
    value.probability_source !== "league_average_game_state" ||
    !["Live", "Final"].includes(String(value.abstract_state)) || typeof value.status !== "string" ||
    !timestamp(value.fetched_at) || !timestamp(value.source_timestamp) ||
    typeof value.home_team !== "string" || typeof value.away_team !== "string" ||
    !Array.isArray(value.history)) return null;
  if (value.unavailable_reason !== undefined && typeof value.unavailable_reason !== "string") return null;
  if (value.history_omitted !== undefined && !integer(value.history_omitted, 0)) return null;
  if (value.home_win_probability === null) {
    if (value.away_win_probability !== null || typeof value.unavailable_reason !== "string") return null;
  } else if (!probability(value.home_win_probability) || !probability(value.away_win_probability) ||
    Math.abs(value.home_win_probability + value.away_win_probability - 1) > 1e-8 ||
    !integer(value.home_score, 0) || !integer(value.away_score, 0)) return null;
  const state = value.state;
  if (state !== null && (!record(state) || !integer(state.inning, 1) || typeof state.top !== "boolean" ||
    !integer(state.outs, 0, 2) || !integer(state.bases, 0, 7) ||
    !integer(state.balls, 0, 3) || !integer(state.strikes, 0, 2))) return null;
  if (!value.history.every((point) => record(point) && typeof point.id === "string" &&
    typeof point.label === "string" && typeof point.description === "string" &&
    integer(point.home_score, 0) && integer(point.away_score, 0) && probability(point.home_win_probability))) return null;
  return value as unknown as LiveProbability;
}

/** A game that will change no further, so an open dialog can stop refreshing. */
export function liveProbabilitySettled(data: LiveProbability): boolean {
  return data.abstract_state === "Final" && data.home_win_probability !== null;
}

export function liveProbabilityStale(data: LiveProbability, now = Date.now()): boolean {
  return data.abstract_state !== "Final" && [data.fetched_at, data.source_timestamp]
    .some((stamp) => now - Date.parse(stamp) > 120_000 || Date.parse(stamp) - now > 30_000);
}
