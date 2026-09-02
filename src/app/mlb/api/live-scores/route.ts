import { NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { runEvalForGame } from "@/lib/eval-game";

// Cached proxy to the MLB Stats API: N browsers polling this route become at
// most two upstream requests a minute, whatever the traffic.
//
// It is also the trigger for live grading. When the schedule the server just
// read shows a game as Final, that game is graded after the response is sent.
// Which game gets graded is decided here from the MLB feed, never from the
// request, so there is no client-facing write endpoint, and the route cache
// bounds the trigger to one pass per revalidation window however many
// browsers are polling.

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

// Games this server instance has already seen graded, so a finished game
// costs one indexed lookup per instance rather than one per revalidation.
const graded = new Set<number>();

async function gradeFinals(gamePks: number[]): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Without the service key (local dev) nothing is written; the nightly
  // Python batch remains the source of truth either way.
  if (!url || !serviceKey) return;

  const pending = gamePks.filter((pk) => !graded.has(pk));
  if (pending.length === 0) return;

  const sb = createClient<Database, "mlb">(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "mlb" },
  });
  // Sequential on purpose: the first ungraded game recomputes the day's
  // evaluation windows, and running several at once only repeats that scan.
  for (const pk of pending) {
    try {
      const result = await runEvalForGame(sb, pk);
      if (result.ok) graded.add(pk);
    } catch {
      // Best effort: the nightly batch reconciles anything missed here.
    }
  }
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

    const finals = games
      .filter((g) => g.status?.abstractGameState === "Final")
      .map((g) => g.gamePk);
    if (finals.length > 0) {
      after(() => gradeFinals(finals));
    }

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
