import type { FootballLeague } from "@/lib/football-slates";

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

const GAME_ID: Record<FootballLeague, RegExp> = {
  cfb: /^[1-9]\d{0,15}$/,
  nfl: /^\d{4}_\d{2}_[A-Z]{2,3}_[A-Z]{2,3}$/,
};

export function liveProbabilityRoute(league: FootballLeague) {
  return async function GET(_request: Request, { params }: { params: Promise<{ gameId: string }> }) {
    const { gameId } = await params;
    const json = (body: object, status: number) => Response.json(body, {
      status, headers: { "Cache-Control": "no-store" },
    });
    if (!GAME_ID[league].test(gameId)) return json({ error: "Invalid game" }, 400);
    try {
      const url = new URL("/rest/v1/live_win_probability", process.env.NEXT_PUBLIC_SUPABASE_URL);
      url.search = new URLSearchParams({ select: "payload", game_id: `eq.${gameId}`, limit: "1" }).toString();
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      // A timed cache alone bounds Supabase reads to one per game per window,
      // however many dialogs are open, and needs no revalidate trigger.
      const response = await fetch(url, {
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Accept-Profile": league },
        next: { revalidate: 20 },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error("Snapshot unavailable");
      const rows: { payload?: unknown }[] = await response.json();
      const snapshot = parseFootballLiveProbability(rows[0]?.payload, gameId);
      if (!snapshot) return json({ error: "Win probability is not available for this game yet." }, 404);
      return Response.json(snapshot, { headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Vercel-CDN-Cache-Control": "public, s-maxage=20",
      } });
    } catch {
      return json({ error: "Win probability is temporarily unavailable." }, 503);
    }
  };
}
