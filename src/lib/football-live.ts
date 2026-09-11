import type { FootballLeague } from "@/lib/football-slates";

// Live scores for the football pages come from ESPN's public scoreboard,
// proxied by /cfb/api/live-scores and /nfl/api/live-scores. Nothing here
// touches Supabase: the pages keep their cached projections and the browser
// overlays whatever the scoreboard says about the games it already shows.

export type LiveState = "pre" | "in" | "post";

export interface LiveGame {
  id: string;
  home: string;
  away: string;
  // The provider's current kickoff, which can drift from the published one.
  start: string | null;
  state: LiveState;
  home_score: number | null;
  away_score: number | null;
  // "12:30 - 4th", "Halftime", "Final/OT": the provider's own status text.
  detail: string | null;
  possession: "home" | "away" | null;
  // "2nd & 7 at LAR 26"
  situation: string | null;
}

export interface LiveGameRef {
  key: string;
  start: number | null;
}

// CFBD game ids are ESPN event ids, so CFB rows match on the id itself. NFL
// ids are nflverse's season_week_AWAY_HOME; a home team plays once a week, so
// the home abbreviation identifies the game within the week's scoreboard.
const NFL_ABBR_TO_ESPN: Record<string, string> = { LA: "LAR", WAS: "WSH" };

export function liveKey(league: FootballLeague, gameId: string | number) {
  if (league === "cfb") return String(gameId);
  const home = String(gameId).split("_").at(-1) ?? "";
  return NFL_ABBR_TO_ESPN[home] ?? home;
}

export function liveGameKey(league: FootballLeague, game: LiveGame) {
  return league === "cfb" ? game.id : game.home;
}

// The CDN holds a read for 15 seconds, so a 20 second poll keeps a score
// within about half a minute of the provider.
export const POLL_MS = 20_000;
// Polling starts shortly before kickoff and, for a game the provider has not
// reported live yet, keeps going through a delay of up to 90 minutes.
const LEAD_MS = 5 * 60_000;
const GRACE_MS = 90 * 60_000;
// A wait is re-planned at least this often so a tab left open for days still
// wakes for the right kickoff after the schedule moves.
const MAX_WAIT_MS = 6 * 60 * 60_000;

export type PollPlan =
  | { action: "poll" }
  | { action: "wait"; delay: number }
  | { action: "stop" };

// Decides whether the page needs the scoreboard now, later, or not at all.
// `fetched` is whether this page has read the scoreboard yet: games that
// already kicked off are read once so finals show, and then only games the
// provider reports live or inside their kickoff window keep polling.
export function pollPlan(
  refs: LiveGameRef[],
  live: Map<string, LiveGame>,
  fetched: boolean,
  now: number,
): PollPlan {
  let next = Infinity;
  for (const ref of refs) {
    const game = live.get(ref.key);
    if (game?.state === "post") continue;
    if (game?.state === "in") return { action: "poll" };
    const providerStart = game?.start ? Date.parse(game.start) : NaN;
    const kickoff = Number.isFinite(providerStart) ? providerStart : ref.start;
    if (kickoff == null) continue;
    if (!fetched && kickoff <= now) return { action: "poll" };
    if (kickoff - LEAD_MS <= now && now <= kickoff + GRACE_MS)
      return { action: "poll" };
    if (kickoff - LEAD_MS > now) next = Math.min(next, kickoff - LEAD_MS);
  }
  if (next < Infinity)
    return { action: "wait", delay: Math.min(next - now, MAX_WAIT_MS) };
  return { action: "stop" };
}

// The scoreboard is asked for the page's own kickoff span, padded a day each
// side so the provider's calendar-day cut cannot drop a late game.
export function scoreboardDates(refs: LiveGameRef[]): string | null {
  const starts = refs
    .map((ref) => ref.start)
    .filter((start): start is number => start != null);
  if (starts.length === 0) return null;
  const day = 86_400_000;
  const stamp = (at: number) =>
    new Date(at).toISOString().slice(0, 10).replaceAll("-", "");
  return `${stamp(Math.min(...starts) - day)}-${stamp(Math.max(...starts) + day)}`;
}

export interface LiveLines {
  score: string;
  detail: string | null;
  situation: string | null;
}

// The three lines a live or finished game shows in place of its kickoff time:
// the away-home score (the same axis as the projected score), the provider's
// clock or final text, and who has the ball where.
export function liveLines(game: LiveGame): LiveLines | null {
  if (game.state === "pre") return null;
  const score = `${game.away_score ?? 0}–${game.home_score ?? 0}`;
  const holder =
    game.possession === "home"
      ? game.home
      : game.possession === "away"
        ? game.away
        : null;
  const situation =
    game.state === "in" && holder
      ? game.situation
        ? `● ${holder} · ${game.situation}`
        : `● ${holder} ball`
      : null;
  return { score, detail: game.detail, situation };
}
