"use client";

import { useEffect, useRef, useState } from "react";
import type { GameMatchup } from "@/lib/types";
import type { LiveScore } from "@/app/mlb/api/live-scores/route";
import { GamesTable } from "@/components/games-table";

const POLL_MS = 60_000;

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
    };
  });
}

function allFinal(matchups: GameMatchup[]): boolean {
  if (matchups.length === 0) return true;
  return matchups.every((m) => m.status === "Final");
}

export function GamesLive({ initial }: { initial: GameMatchup[] }) {
  const [matchups, setMatchups] = useState<GameMatchup[]>(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Games already sent to eval-game this page load; the route is idempotent
  // but there is no point repeating the call every poll.
  const evalFiredRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function fireEval(game_pk: number) {
      if (evalFiredRef.current.has(game_pk)) return;
      evalFiredRef.current.add(game_pk);
      try {
        await fetch("/mlb/api/eval-game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game_pk }),
        });
      } catch {
        // Best effort: the nightly batch reconciles anything missed here.
      }
    }

    async function fetchOnce() {
      try {
        const res = await fetch("/mlb/api/live-scores", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { scores?: LiveScore[] };
        if (cancelled || !data.scores) return;
        for (const s of data.scores) {
          if (s.status === "Final") fireEval(s.game_pk);
        }
        setMatchups((prev) => mergeScores(prev, data.scores!));
      } catch {
        // A failed poll waits for the next tick.
      }
    }

    function schedule() {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (document.visibilityState !== "visible") return;
      if (allFinal(matchups)) return;
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
  }, [allFinal(matchups)]);

  return <GamesTable matchups={matchups} />;
}
