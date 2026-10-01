import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";
import type { ModelOutput, GameMatchup, GameInfo } from "@/lib/types";
import { GamesLive } from "@/components/games-live";
import { SummaryStats } from "@/components/summary-stats";
import { LastUpdated } from "@/components/last-updated";
import { latestStamp } from "@/lib/mlb-picks-version";
import { toLiveScore, type LiveScore, type MlbScheduleGame } from "@/lib/mlb-live-scores";

// Render fresh on every request so predictions always reflect the current
// model_outputs (the last pre-pitch re-score / frozen value), not a cached
// snapshot from an earlier scoring pass. Live scores still come from the
// client poll in GamesLive.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "MLB Predictions Today",
  description:
    "Today's MLB win probabilities, projected run totals, and model picks from a hierarchical Bayesian simulation of every plate appearance, refreshed each morning and graded against the closing line.",
};

async function fetchLiveScores(): Promise<Map<number, LiveScore>> {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Los_Angeles",
  });
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=linescore`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 30 },
      headers: { "User-Agent": "mlb-model-dashboard" },
      // Keep the first-paint block short: GamesLive re-polls live scores
      // immediately on mount, so a slow MLB API only costs staleness, not 4s.
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return new Map();
    const data = await res.json();
    const games: MlbScheduleGame[] = data?.dates?.[0]?.games ?? [];
    return new Map(games.map((game) => [game.gamePk, toLiveScore(game)]));
  } catch {
    return new Map();
  }
}

type ModelOutputRow = Tables<"mlb", "model_outputs">;

// The scorer writes the projection, win probability and play flags together;
// a row missing any of them is half-written and must not render as a pick.
function isPick(row: ModelOutputRow): row is ModelOutputRow & ModelOutput {
  return (
    row.expected_runs != null &&
    row.win_prob != null &&
    row.total_play != null &&
    row.ev_flag != null &&
    row.run_line_ev_flag != null &&
    row.high_variance_flag != null
  );
}

export default async function Page() {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Los_Angeles",
  });

  const [{ data: outputs }, { data: allGames }, liveScores] = await Promise.all([
    supabase.from("model_outputs").select("*").eq("date", today).order("game_pk"),
    supabase
      .from("games")
      .select("game_pk, game_date, home_team, away_team, venue, start_time, home_score, away_score, status, updated_at")
      .eq("game_date", today)
      .order("start_time"),
    fetchLiveScores(),
  ]);

  const lastUpdated = latestStamp((allGames ?? []).map((game) => game.updated_at));
  const picksVersion = latestStamp([
    lastUpdated,
    ...(outputs ?? []).map((o) => o.updated_at),
  ]);
  const predictions = (outputs ?? []).filter(isPick);

  // Eval-on-final (score writeback + model_evaluation upsert) runs off the
  // render path: /mlb/api/live-scores grades every Final game it sees after
  // responding to GamesLive's poll. Keeping it out of the server render avoids
  // blocking first paint on slow MLB API calls and full-season scans. Picks
  // are unaffected (read fresh above); the freeze invariant lives in the
  // Python scorer, not here.

  if (predictions.length === 0 && (!allGames || allGames.length === 0)) {
    return (
      <PageShell>
        <PageTitle>
          Today&apos;s MLB Predictions
        </PageTitle>
        <p className="text-muted-foreground">
          No predictions available.
        </p>
      </PageShell>
    );
  }

  const predictionPks = new Set(predictions.map((p) => p.game_pk));
  const gameMap = new Map((allGames ?? []).map((g) => [g.game_pk, g]));

  const matchups: GameMatchup[] = [...predictionPks]
    .map((pk): GameMatchup | null => {
      const game = gameMap.get(pk);
      if (!game) return null;
      const rows = predictions.filter((p) => p.game_pk === pk);
      const away = rows.find((r) => r.team === game.away_team);
      const home = rows.find((r) => r.team === game.home_team);
      if (!away || !home) return null;
      const live = liveScores.get(pk);
      return {
        game_pk: pk,
        home_team: game.home_team,
        away_team: game.away_team,
        venue: game.venue,
        start_time: game.start_time,
        date: game.game_date,
        away,
        home,
        home_score: live?.home_score ?? game.home_score,
        away_score: live?.away_score ?? game.away_score,
        status: live?.status ?? game.status ?? null,
        current_inning: live?.current_inning ?? null,
        inning_state: live?.inning_state ?? null,
        bases: live?.bases ?? null,
        outs: live?.outs ?? null,
      };
    })
    .filter((m): m is GameMatchup => m != null);

  const unavailableGames: GameInfo[] = (allGames ?? []).filter(
    (g) => !predictionPks.has(g.game_pk)
  );

  const hasAnyPlay = (m: GameMatchup) =>
    m.away.ev_flag !== "No Play" ||
    m.home.ev_flag !== "No Play" ||
    m.away.run_line_ev_flag !== "No Play" ||
    m.home.run_line_ev_flag !== "No Play" ||
    m.away.total_play !== "No Play" ||
    m.home.total_play !== "No Play" ||
    m.away.high_variance_flag === "Yes" ||
    m.home.high_variance_flag === "Yes";

  matchups.sort((a, b) => {
    const aHasEv = hasAnyPlay(a) ? 1 : 0;
    const bHasEv = hasAnyPlay(b) ? 1 : 0;
    if (aHasEv !== bHasEv) return bHasEv - aHasEv;
    const aTime = a.start_time ?? "";
    const bTime = b.start_time ?? "";
    return aTime.localeCompare(bTime);
  });

  const displayDate = new Date().toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>
            Today&apos;s MLB Predictions
          </PageTitle>
          <PageDescription>{displayDate}</PageDescription>
        </div>
        <LastUpdated
          timestamp={lastUpdated}
          schedule="Predictions ~5 AM PT • Scores live"
        />
      </PageHeader>

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Win probabilities, projected run totals, and picks for every MLB game
        today, from a Bayesian model that simulates each plate appearance.
        Picks freeze at first pitch and are graded against the closing line.
      </p>

      <SummaryStats matchups={matchups} />

      <GamesLive
        key={picksVersion ?? "unpublished"}
        initial={matchups}
        unavailableGames={unavailableGames.map((game) => {
          const live = liveScores.get(game.game_pk);
          return { ...game, status: live?.status ?? game.status,
            home_score: live?.home_score ?? game.home_score,
            away_score: live?.away_score ?? game.away_score, bases: live?.bases ?? null,
            outs: live?.outs ?? null };
        })}
        picksVersion={picksVersion}
      />
    </PageShell>
  );
}
