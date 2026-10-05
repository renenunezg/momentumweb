export interface LiveProbabilityPoint {
  /** Seconds of regulation elapsed; overtime stays at 3600. */
  s: number;
  h: number;
  a: number;
  /** Home win probability. */
  p: number;
}

export interface FootballLiveProbability {
  schema_version: 1;
  /** An ESPN event id for CFB, an nflverse game id for NFL. */
  game_id: number | string;
  abstract_state: "Pre" | "Live" | "Final" | "Off";
  status: string;
  home_team: string;
  away_team: string;
  home_score?: number;
  away_score?: number;
  period?: number;
  clock?: string | null;
  fetched_at: string;
  home_win_probability: number | null;
  away_win_probability: number | null;
  unavailable_reason?: string;
  history: LiveProbabilityPoint[];
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const probability = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
const count = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

// The site validates the serving contract; probability calculations stay in the model repo.
export function parseFootballLiveProbability(
  value: unknown,
  gameId: string,
): FootballLiveProbability | null {
  if (!record(value) || value.schema_version !== 1 || String(value.game_id) !== gameId ||
    value.probability_source !== "pregame_anchored_game_state" ||
    !["Pre", "Live", "Final", "Off"].includes(String(value.abstract_state)) ||
    typeof value.status !== "string" ||
    typeof value.fetched_at !== "string" || !Number.isFinite(Date.parse(value.fetched_at)) ||
    typeof value.home_team !== "string" || typeof value.away_team !== "string" ||
    !Array.isArray(value.history)) return null;
  if (value.home_win_probability === null) {
    if (value.away_win_probability !== null || typeof value.unavailable_reason !== "string") return null;
  } else if (!probability(value.home_win_probability) || !probability(value.away_win_probability) ||
    Math.abs(value.home_win_probability + value.away_win_probability - 1) > 1e-8) return null;
  const started = value.abstract_state === "Live" || value.abstract_state === "Final";
  if (started && value.home_win_probability !== null &&
    (!count(value.home_score) || !count(value.away_score))) return null;
  if (!value.history.every((point) => record(point) && count(point.s) && point.s <= 3600 &&
    count(point.h) && count(point.a) && probability(point.p))) return null;
  return value as unknown as FootballLiveProbability;
}

/** A game that will change no further, so an open dialog can stop refreshing. */
export function liveProbabilitySettled(data: FootballLiveProbability): boolean {
  return data.abstract_state === "Off" ||
    (data.abstract_state === "Final" && data.home_win_probability !== null);
}

// The publisher rewrites an unchanged live row every two minutes.
export function liveProbabilityStale(data: FootballLiveProbability, now = Date.now()): boolean {
  return data.abstract_state === "Live" && now - Date.parse(data.fetched_at) > 300_000;
}
