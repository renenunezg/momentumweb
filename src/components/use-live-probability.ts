"use client";

import { useEffect, useState } from "react";

const POLL_MS = 30_000;

// One polling loop for every sport's win probability dialog: it reads while
// the tab is visible and stops for good once the game is settled. `parse` and
// `settled` must be stable references, since a new one restarts the loop.
export function useLiveProbability<T, Id extends string | number>(
  url: string,
  gameId: Id,
  parse: (value: unknown, gameId: Id) => T | null,
  settled: (snapshot: T) => boolean,
): { data: T | null; error: string | null; now: number } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    async function refresh() {
      clearTimeout(timer);
      if (cancelled || done || document.visibilityState !== "visible") return;
      controller?.abort();
      const request = new AbortController();
      controller = request;
      // Advancing the clock before the read lets a snapshot age into stale
      // while refreshes are failing.
      setNow(Date.now());
      try {
        const response = await fetch(url, {
          signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]),
        });
        if (!response.ok) throw new Error(response.status === 404
          ? "Win probability is not available for this game yet."
          : "Could not refresh win probability. Retrying shortly.");
        const snapshot = parse(await response.json(), gameId);
        if (!snapshot) throw new Error("The latest game state is unavailable. Retrying shortly.");
        if (!cancelled && !request.signal.aborted) {
          setData(snapshot);
          setError(null);
          setNow(Date.now());
          done = settled(snapshot);
        }
      } catch (cause) {
        if (!cancelled && !request.signal.aborted) setError(cause instanceof Error ? cause.message : "Refresh failed.");
      } finally {
        if (!cancelled && !done && !request.signal.aborted) timer = setTimeout(refresh, POLL_MS);
      }
    }
    function visibility() {
      clearTimeout(timer);
      if (document.visibilityState === "visible") void refresh();
      else controller?.abort();
    }
    void refresh();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [url, gameId, parse, settled]);

  return { data, error, now };
}
