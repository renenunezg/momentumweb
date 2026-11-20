"use client";

import { useEffect, useRef, useState } from "react";
import { LmbGamesTable } from "@/components/lmb-games-table";
import type { LmbMatchup } from "@/lib/lmb";
import type { LiveScore } from "@/lib/mlb-live-scores";

// The route caches the Stats API for 30 seconds, so polling faster would only
// re-read the cache.
const POLL_MS = 30_000;

function merge(matchups: LmbMatchup[], scores: LiveScore[]): LmbMatchup[] {
  if (scores.length === 0) return matchups;
  const byPk = new Map(scores.map((score) => [score.game_pk, score]));
  return matchups.map((m) => {
    const live = byPk.get(m.game_pk);
    return live ? { ...m, live } : m;
  });
}

// Polls the score proxy while a shown game is not final. Forecasts and picks
// stay as the server rendered them, so a started game keeps its frozen pick.
export function LmbGamesLive({ initial, date }: { initial: LmbMatchup[]; date: string }) {
  const [matchups, setMatchups] = useState<LmbMatchup[]>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = matchups.every((m) => m.live?.abstract_state === "Final");

  useEffect(() => {
    if (done) return;
    let cancelled = false;
    async function fetchOnce() {
      try {
        const res = await fetch(`/lmb/api/live-scores?date=${date}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { scores?: LiveScore[] };
        if (cancelled || !data.scores) return;
        setMatchups((prev) => merge(prev, data.scores!));
      } catch {
        // A failed poll waits for the next tick.
      }
    }
    function schedule() {
      if (timer.current) clearTimeout(timer.current);
      if (cancelled || document.visibilityState !== "visible") return;
      timer.current = setTimeout(async () => {
        await fetchOnce();
        schedule();
      }, POLL_MS);
    }
    schedule();
    function onVisibility() {
      if (document.visibilityState === "visible") {
        fetchOnce().then(() => {
          if (!cancelled) schedule();
        });
      } else if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [date, done]);

  return <LmbGamesTable matchups={matchups} />;
}
