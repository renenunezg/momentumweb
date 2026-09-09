"use client";

import {
  useEffect,
  useMemo,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { footballSlateClock } from "@/lib/football-slates";
import { LEAGUE_TIME_ZONE } from "@/lib/football";

function subscribe(onChange: () => void) {
  window.addEventListener("focus", onChange);
  return () => window.removeEventListener("focus", onChange);
}
function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

// The zone the visitor's browser reports, re-read on focus so a laptop that
// crossed a border while asleep catches up. `serverZone` is what the cached
// HTML was rendered in, so the first paint and the hydration pass agree.
export function useVisitorTimeZone(serverZone: string) {
  return useSyncExternalStore(subscribe, browserTimeZone, () => serverZone);
}

// Kickoffs in server-rendered tables arrive as <time data-kickoff> elements
// in Eastern and are rewritten in place into the visitor's zone, so a table
// of 120 rows never becomes 240 client components. `content` is whatever
// the container renders, so a server re-render with fresh rows is rewritten
// too.
export function useVisitorKickoffs(
  container: RefObject<HTMLElement | null>,
  content: unknown,
) {
  const timeZone = useVisitorTimeZone(LEAGUE_TIME_ZONE);
  const clock = useMemo(() => footballSlateClock(timeZone), [timeZone]);
  useEffect(() => {
    const times =
      container.current?.querySelectorAll<HTMLTimeElement>(
        "time[data-kickoff]",
      ) ?? [];
    for (const time of times) {
      const start = time.dateTime || null;
      time.textContent =
        time.dataset.kickoff === "day" ? clock.day(start) : clock.time(start);
    }
  }, [container, clock, content]);
  return clock;
}
