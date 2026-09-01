import { NextResponse } from "next/server";

// Cached proxy to the MLB Stats API: N browsers polling this route become at
// most two upstream requests a minute, whatever the traffic.

export const revalidate = 30;

interface MLBGame {
  gamePk: number;
  status?: {
    detailedState?: string;
    abstractGameState?: string; // "Preview" | "Live" | "Final"
  };
  teams?: {
    away?: { score?: number; team?: { abbreviation?: string } };
    home?: { score?: number; team?: { abbreviation?: string } };
  };
  linescore?: {
    currentInning?: number;
    inningState?: string; // "Top" | "Middle" | "Bottom" | "End"
  };
}

export interface LiveScore {
  game_pk: number;
  status: string | null;
  abstract_state: string | null;
  home_score: number | null;
  away_score: number | null;
  current_inning: number | null;
  inning_state: string | null;
}

export async function GET() {
  // Pacific date, the same slate boundary the pipeline and games page use.
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Los_Angeles",
  });

  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=linescore`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 30 },
      headers: { "User-Agent": "mlb-model-dashboard" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `MLB API ${res.status}` },
        { status: 502 }
      );
    }
    const data = await res.json();
    const games: MLBGame[] = data?.dates?.[0]?.games ?? [];

    const scores: LiveScore[] = games.map((g) => ({
      game_pk: g.gamePk,
      status: g.status?.detailedState ?? null,
      abstract_state: g.status?.abstractGameState ?? null,
      home_score: g.teams?.home?.score ?? null,
      away_score: g.teams?.away?.score ?? null,
      current_inning: g.linescore?.currentInning ?? null,
      inning_state: g.linescore?.inningState ?? null,
    }));

    return NextResponse.json(
      { scores, fetched_at: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
