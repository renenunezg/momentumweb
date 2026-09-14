"use client";

import { useEffect, useRef, useState } from "react";
import { NhlGamesTable, type NhlMatchup } from "@/components/nhl-games-table";
import { NHL_POLL_MS, type NhlLiveGame } from "@/lib/nhl-live";

function merge(matchups: NhlMatchup[], games: NhlLiveGame[]): NhlMatchup[] {
  if (games.length === 0) return matchups;
  const byId = new Map(games.map((g) => [g.id, g]));
  return matchups.map((m) => {
    const live = byId.get(m.projection.game_id);
    return live ? { ...m, live } : m;
  });
}

function allFinal(matchups: NhlMatchup[]): boolean {
  return matchups.every((m) => m.live?.state === "post");
}

// Polls the score proxy while a shown game is not final, and stops for good
// once every game is.
export function NhlGamesLive({
  initial,
  date,
}: {
  initial: NhlMatchup[];
  date: string;
}) {
  const [matchups, setMatchups] = useState<NhlMatchup[]>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = allFinal(matchups);

  useEffect(() => {
    let cancelled = false;
    async function fetchOnce() {
      try {
        const res = await fetch(`/nhl/api/live-scores?date=${date}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { games?: NhlLiveGame[] };
        if (cancelled || !data.games) return;
        setMatchups((prev) => merge(prev, data.games!));
      } catch {
        // A failed poll waits for the next tick.
      }
    }
    function schedule() {
      if (timer.current) clearTimeout(timer.current);
      if (document.visibilityState !== "visible" || done) return;
      timer.current = setTimeout(async () => {
        await fetchOnce();
        schedule();
      }, NHL_POLL_MS);
    }
    fetchOnce().then(() => {
      if (!cancelled) schedule();
    });
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

  return <NhlGamesTable matchups={matchups} />;
}
