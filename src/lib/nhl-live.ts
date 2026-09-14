// Live NHL scores come from the league's public score feed, proxied by
// /nhl/api/live-scores so many browsers polling the games page cost at most
// two upstream reads a minute. Nothing here touches Supabase.

export type NhlLiveState = "pre" | "in" | "post";

export interface NhlLiveGame {
  id: string;
  state: NhlLiveState;
  home_score: number | null;
  away_score: number | null;
  // "2nd 12:34", "Intermission", "Final/OT": what the header shows.
  detail: string | null;
}

interface ScoreFeedGame {
  id?: number;
  gameState?: string;
  period?: number;
  clock?: { timeRemaining?: string; inIntermission?: boolean };
  periodDescriptor?: { periodType?: string; number?: number };
  gameOutcome?: { lastPeriodType?: string };
  homeTeam?: { score?: number };
  awayTeam?: { score?: number };
}

const ORDINAL = ["1st", "2nd", "3rd"];

function periodLabel(game: ScoreFeedGame): string {
  const type = game.periodDescriptor?.periodType;
  const number = game.periodDescriptor?.number ?? game.period ?? 0;
  if (type === "SO") return "SO";
  if (type === "OT") return number > 4 ? `${number - 3}OT` : "OT";
  return ORDINAL[number - 1] ?? `P${number}`;
}

export function parseScoreFeed(payload: unknown): NhlLiveGame[] {
  const games = ((payload as { games?: ScoreFeedGame[] })?.games ?? []);
  const out: NhlLiveGame[] = [];
  for (const game of games) {
    if (game.id == null) continue;
    const raw = game.gameState ?? "FUT";
    const state: NhlLiveState =
      raw === "OFF" || raw === "FINAL"
        ? "post"
        : raw === "LIVE" || raw === "CRIT"
          ? "in"
          : "pre";
    let detail: string | null = null;
    if (state === "post") {
      const last = game.gameOutcome?.lastPeriodType;
      detail = last && last !== "REG" ? `Final/${last}` : "Final";
    } else if (state === "in") {
      detail = game.clock?.inIntermission
        ? `${periodLabel(game)} Int`
        : `${periodLabel(game)} ${game.clock?.timeRemaining ?? ""}`.trim();
    }
    out.push({
      id: String(game.id),
      state,
      home_score: state === "pre" ? null : (game.homeTeam?.score ?? null),
      away_score: state === "pre" ? null : (game.awayTeam?.score ?? null),
      detail,
    });
  }
  return out;
}

export const NHL_SCORE_URL = "https://api-web.nhle.com/v1/score";
// The route caches upstream for 30 seconds; polling at that cadence keeps a
// score within about a minute of the league feed.
export const NHL_POLL_MS = 30_000;
