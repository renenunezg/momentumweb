import { NextResponse } from "next/server";
import type { FootballLeague } from "@/lib/football-slates";
import type { LiveGame, LiveState } from "@/lib/football-live";

// Cached proxy to ESPN's public scoreboard, shared by the CFB and NFL routes.
// Every browser polling a page asks for the same date span, so the CDN cache
// and the fetch cache collapse them to at most two upstream reads a minute
// per league. The response carries only what the pages render; the upstream
// payload (about 1.5 MB per CFB group) never reaches the browser.

const SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/football";
// ESPN groups FBS and FCS separately and caps a scoreboard at 400 events.
const QUERIES: Record<FootballLeague, string[]> = {
  cfb: ["college-football/scoreboard?groups=80", "college-football/scoreboard?groups=81"],
  nfl: ["nfl/scoreboard?"],
};
const MAX_SPAN_DAYS = 10;

interface EspnCompetitor {
  homeAway?: string;
  id?: string;
  score?: string;
  team?: { abbreviation?: string };
}
interface EspnEvent {
  id?: string;
  date?: string;
  competitions?: {
    status?: { type?: { state?: string; shortDetail?: string } };
    competitors?: EspnCompetitor[];
    situation?: { possession?: string; downDistanceText?: string };
  }[];
}

function score(value: string | undefined, state: LiveState) {
  if (state === "pre" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseScoreboard(payload: unknown): LiveGame[] {
  const events = ((payload as { events?: EspnEvent[] })?.events ?? []);
  const games: LiveGame[] = [];
  for (const event of events) {
    const competition = event.competitions?.[0];
    const home = competition?.competitors?.find((c) => c.homeAway === "home");
    const away = competition?.competitors?.find((c) => c.homeAway === "away");
    if (!event.id || !home?.team?.abbreviation || !away?.team?.abbreviation)
      continue;
    const rawState = competition?.status?.type?.state;
    const state: LiveState =
      rawState === "in" ? "in" : rawState === "post" ? "post" : "pre";
    const possession = competition?.situation?.possession;
    games.push({
      id: event.id,
      home: home.team.abbreviation,
      away: away.team.abbreviation,
      start: event.date ?? null,
      state,
      home_score: score(home.score, state),
      away_score: score(away.score, state),
      detail: state === "pre" ? null : (competition?.status?.type?.shortDetail ?? null),
      possession:
        state !== "in" || !possession
          ? null
          : possession === home.id
            ? "home"
            : possession === away.id
              ? "away"
              : null,
      situation:
        state === "in" ? (competition?.situation?.downDistanceText ?? null) : null,
    });
  }
  return games;
}

function spanDays(dates: string) {
  const at = (stamp: string) =>
    Date.parse(`${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6)}T00:00:00Z`);
  return (at(dates.slice(9)) - at(dates.slice(0, 8))) / 86_400_000;
}

export function liveScoresRoute(league: FootballLeague) {
  return async function GET(request: Request) {
    const dates = new URL(request.url).searchParams.get("dates") ?? "";
    const span = /^\d{8}-\d{8}$/.test(dates) ? spanDays(dates) : NaN;
    if (!(span >= 0 && span <= MAX_SPAN_DAYS))
      return NextResponse.json({ error: "dates must be YYYYMMDD-YYYYMMDD" }, { status: 400 });

    try {
      const pages = await Promise.all(
        QUERIES[league].map(async (query) => {
          const res = await fetch(`${SCOREBOARD}/${query}&limit=400&dates=${dates}`, {
            next: { revalidate: 30 },
            headers: { "User-Agent": "momentum-dashboard" },
            signal: AbortSignal.timeout(4000),
          });
          if (!res.ok) throw new Error(`ESPN ${res.status}`);
          return parseScoreboard(await res.json());
        }),
      );
      // A game between an FBS and an FCS team is listed under both groups.
      const games = [...new Map(pages.flat().map((g) => [g.id, g])).values()];
      return NextResponse.json(
        { games, fetched_at: new Date().toISOString() },
        { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
      );
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 502 });
    }
  };
}
