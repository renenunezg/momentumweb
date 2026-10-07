import type { Database } from "@/lib/database.types";
import { NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runEvalForGame } from "@/lib/eval-game";
import { toLiveScore, type MlbScheduleGame } from "@/lib/mlb-live-scores";
import { fetchPicksVersion } from "@/lib/mlb-picks-version";

// Cached proxy to the MLB Stats API: the CDN window turns N browsers polling
// this route into at most two upstream requests a minute per region. The
// cache is the CDN's, not ISR: scores change all game long, so an ISR copy
// would bill a write every window.
//
// It is also the trigger for live grading. When the schedule the server just
// read shows a game as Final, that game is graded after the response is sent.
// Which game gets graded is decided here from the MLB feed, never from the
// request, so there is no client-facing write endpoint, and the CDN window
// bounds the trigger to one pass per window however many browsers are
// polling.

export const dynamic = "force-dynamic";

async function gradeFinals(gamePks: number[]): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Without the service key (local dev) nothing is written; the nightly
  // Python batch remains the source of truth either way.
  if (!url || !serviceKey) return;

  const sb = createClient<Database, "mlb">(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "mlb" },
  });
  // Completion is durable across instances. Recheck official scores so a
  // correction stays eligible; failed publications never record completion.
  for (const pk of gamePks) {
    try {
      await runEvalForGame(sb, pk);
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
    const [res, picksVersion] = await Promise.all([
      fetch(url, {
        cache: "no-store",
        headers: { "User-Agent": "mlb-model-dashboard" },
        signal: AbortSignal.timeout(4000),
      }),
      fetchPicksVersion(today),
    ]);
    if (!res.ok) {
      return NextResponse.json(
        { error: `MLB API ${res.status}` },
        { status: 502 }
      );
    }
    const data = await res.json();
    const games: MlbScheduleGame[] = data?.dates?.[0]?.games ?? [];

    const scores = games.map(toLiveScore);

    const finals = games
      .filter((g) => g.status?.abstractGameState === "Final")
      .map((g) => g.gamePk);
    if (finals.length > 0) {
      after(() => gradeFinals(finals));
    }

    return NextResponse.json(
      { scores, picks_version: picksVersion, fetched_at: new Date().toISOString() },
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
