"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GameCardUnavailable } from "@/components/game-card-unavailable";
import type { GameInfo, GameMatchup } from "@/lib/types";
import type { LiveScore } from "@/lib/mlb-live-scores";
import { GamesTable } from "@/components/games-table";

// The route caches upstream for 30s, so polling faster than that only
// re-reads the cache; polling at exactly that cadence keeps a score within
// about a minute of the MLB feed.
const POLL_MS = 30_000;

function mergeScores(
  matchups: GameMatchup[],
  scores: LiveScore[]
): GameMatchup[] {
  if (scores.length === 0) return matchups;
  const byPk = new Map(scores.map((s) => [s.game_pk, s]));
  return matchups.map((m) => {
    const s = byPk.get(m.game_pk);
    if (!s) return m;
    return {
      ...m,
      home_score: s.home_score ?? m.home_score,
      away_score: s.away_score ?? m.away_score,
      status: s.status ?? m.status,
      current_inning: s.current_inning,
      inning_state: s.inning_state,
      bases: s.bases ?? null,
      outs: s.outs ?? null,
    };
  });
}

function allFinal(matchups: { status: string | null }[]): boolean {
  if (matchups.length === 0) return true;
  return matchups.every((m) => m.status === "Final");
}

export function GamesLive({
  initial,
  unavailableGames = [],
  picksVersion,
}: {
  initial: GameMatchup[];
  unavailableGames?: GameInfo[];
  // Newest pick or game write the server rendered from. When the poll
  // reports a newer one the page re-renders, and the parent keys this
  // component on the version so the fresh picks replace the merged state.
  picksVersion: string | null;
}) {
  const router = useRouter();
  const [matchups, setMatchups] = useState<GameMatchup[]>(initial);
  const [unavailable, setUnavailable] = useState(unavailableGames);
  const finished = allFinal([...matchups, ...unavailable]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionRef = useRef(picksVersion);

  useEffect(() => {
    let cancelled = false;

    // Polling live-scores is also what grades finished games: the route
    // grades any Final game server-side after it responds.
    async function fetchOnce() {
      try {
        const res = await fetch("/mlb/api/live-scores", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          scores?: LiveScore[];
          picks_version?: string | null;
        };
        if (cancelled || !data.scores) return;
        const scores = data.scores;
        setMatchups((prev) => mergeScores(prev, scores));
        setUnavailable((prev) => prev.map((game) => {
          const score = scores.find((s) => s.game_pk === game.game_pk);
          return score ? { ...game, status: score.status ?? game.status,
            home_score: score.home_score ?? game.home_score,
            away_score: score.away_score ?? game.away_score, bases: score.bases ?? null,
            outs: score.outs ?? null } : game;
        }));
        if (data.picks_version && data.picks_version !== versionRef.current) {
          versionRef.current = data.picks_version;
          router.refresh();
        }
      } catch {
        // A failed poll waits for the next tick.
      }
    }

    function schedule() {
      if (cancelled) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (document.visibilityState !== "visible") return;
      if (finished) return;
      timerRef.current = setTimeout(async () => {
        await fetchOnce();
        schedule();
      }, POLL_MS);
    }

    // Poll once on mount so live data shows without waiting a full interval.
    fetchOnce().then(() => {
      if (!cancelled) schedule();
    });

    function onVisibility() {
      if (document.visibilityState === "visible") {
        fetchOnce().then(() => {
          if (!cancelled) schedule();
        });
      } else if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the last game goes Final, so polling stops
  }, [finished]);

  return <>
    <GamesTable matchups={matchups} />
    {unavailable.length > 0 && <div className="space-y-3">
      {unavailable.map((game) => <GameCardUnavailable key={game.game_pk} game={game}
        showWinProbability={game.status === "Final" || (
          game.status != null && !["Scheduled", "Pre-Game", "Warmup", "Delayed Start", "Postponed", "Cancelled"].includes(game.status)
          && (game.home_score != null || game.away_score != null)
        )} />)}
    </div>}
  </>;
}
