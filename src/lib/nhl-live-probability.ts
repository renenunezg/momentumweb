export interface NhlLiveProbabilityPoint {
  /** Seconds of regulation elapsed; overtime and the shootout stay at 3600. */
  s: number;
  h: number;
  a: number;
  /** Home win probability. */
  p: number;
}

export interface NhlLiveProbability {
  schema_version: 1;
  game_id: string;
  abstract_state: "Pre" | "Live" | "Final" | "Off";
  status: string;
  home_team: string;
  away_team: string;
  home_score?: number;
  away_score?: number;
  period?: number;
  period_type?: "REG" | "OT" | "SO";
  /** Left in the period; null in a shootout. */
  clock?: string | null;
  intermission?: boolean;
  fetched_at: string;
  home_win_probability: number | null;
  away_win_probability: number | null;
  unavailable_reason?: string;
  history: NhlLiveProbabilityPoint[];
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const probability = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
const count = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

// The site validates the serving contract; probability calculations stay in the model repo.
export function parseNhlLiveProbability(value: unknown, gameId: string): NhlLiveProbability | null {
  if (!record(value) || value.schema_version !== 1 || value.game_id !== gameId ||
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
  return value as unknown as NhlLiveProbability;
}

/** A game that will change no further, so an open dialog can stop refreshing. */
export function nhlLiveProbabilitySettled(data: NhlLiveProbability): boolean {
  return data.abstract_state === "Off" ||
    (data.abstract_state === "Final" && data.home_win_probability !== null);
}

// The publisher rewrites an unchanged live row every two minutes.
export function nhlLiveProbabilityStale(data: NhlLiveProbability, now = Date.now()): boolean {
  return data.abstract_state === "Live" && now - Date.parse(data.fetched_at) > 300_000;
}

const ORDINAL = ["1st", "2nd", "3rd"];

/** "2nd 12:34", "2nd Int", "OT 3:12", "Shootout": where a live game stands. */
export function nhlLiveProbabilityClock(data: NhlLiveProbability): string {
  if (data.period_type === "SO") return "Shootout";
  if (data.period == null) return "In progress";
  const period = data.period_type === "OT" ? "OT" : ORDINAL[data.period - 1] ?? `P${data.period}`;
  return data.intermission ? `${period} Int` : `${period} ${data.clock ?? ""}`.trim();
}
