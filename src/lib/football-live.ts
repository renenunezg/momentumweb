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
  // The provider's absolute yard line, 0 at the home goal line and 100 at
  // the away goal line, whichever side has the ball.
  yard_line: number | null;
  distance: number | null;
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

export interface FieldGeometry {
  // Ball and line-to-gain positions in field units, 0 at the away goal line
  // (drawn on the left) and 100 at the home goal line.
  ball: number;
  lineToGain: number | null;
  // +1 when the offense drives toward the home goal line on the right.
  direction: 1 | -1;
}

export function fieldGeometry(game: LiveGame): FieldGeometry | null {
  if (game.state !== "in" || game.possession == null || game.yard_line == null)
    return null;
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  const ball = clamp(100 - game.yard_line);
  const direction = game.possession === "away" ? 1 : -1;
  const lineToGain =
    game.distance != null ? clamp(ball + direction * game.distance) : null;
  return { ball, lineToGain, direction };
}

// A 12:1 strip: both end zones, a tick every ten yards, the line to gain, and
// an arrow whose head sits on the ball and points the way the offense is going.
export function fieldSvg(game: LiveGame): string | null {
  const field = fieldGeometry(game);
  if (!field) return null;
  const x = 10 + field.ball;
  const ticks = [20, 30, 40, 50, 60, 70, 80, 90, 100]
    .map(
      (at) =>
        `<line x1="${at}" y1="0" x2="${at}" y2="10" stroke="currentColor" stroke-opacity="${at === 60 ? 0.5 : 0.18}"/>`,
    )
    .join("");
  const lineToGain =
    field.lineToGain != null
      ? `<line x1="${10 + field.lineToGain}" y1="0" x2="${10 + field.lineToGain}" y2="10" stroke="currentColor" stroke-width="1"/>`
      : "";
  return (
    `<svg viewBox="0 0 120 10" aria-hidden="true">` +
    `<rect x="0" y="0" width="10" height="10" fill="currentColor" opacity="0.35"/>` +
    `<rect x="110" y="0" width="10" height="10" fill="currentColor" opacity="0.35"/>` +
    `<rect x="10" y="0.5" width="100" height="9" fill="none" stroke="currentColor" stroke-opacity="0.5"/>` +
    ticks +
    lineToGain +
    `<line x1="${x - field.direction * 7}" y1="5" x2="${x}" y2="5" stroke="var(--positive)" stroke-width="2.4"/>` +
    `<polygon points="${x},1 ${x},9 ${x + field.direction * 5},5" fill="var(--positive)"/>` +
    `</svg>`
  );
}

// A small football in the positive color, drawn next to the side that has
// the ball. Laces are cut in the page background so it reads at 18 px.
export const FOOTBALL_SVG =
  `<svg viewBox="0 0 16 16" aria-hidden="true"><g transform="rotate(-35 8 8)">` +
  `<ellipse cx="8" cy="8" rx="7.4" ry="4.4" fill="var(--positive)"/>` +
  `<path d="M4.5 8h7M6 6.5v3M8 6.5v3M10 6.5v3" stroke="var(--background)" stroke-width="1.4" fill="none"/>` +
  `</g></svg>`;
