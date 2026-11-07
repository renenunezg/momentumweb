"use client";

import {
  useEffect,
  useMemo,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { footballSlateClock, type KickoffPart } from "@/lib/football-slates";
import { SITE_TIME_ZONE } from "@/lib/site-time";

function subscribe(onChange: () => void) {
  window.addEventListener("focus", onChange);
  return () => window.removeEventListener("focus", onChange);
}
function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || SITE_TIME_ZONE;
}

// The zone the visitor's browser reports, re-read on focus so a laptop that
// crossed a border while asleep catches up. Cached HTML is rendered in Pacific,
// so the first paint and the hydration pass agree and no read or rebuild
// depends on the visitor.
export function useVisitorClock() {
  const timeZone = useSyncExternalStore(
    subscribe,
    browserTimeZone,
    () => SITE_TIME_ZONE,
  );
  return useMemo(() => footballSlateClock(timeZone), [timeZone]);
}

// Server-rendered <time data-kickoff> elements are rewritten in place, so a
// 120 row schedule never becomes 240 client components. `content` is whatever
// the container renders, so a server re-render with fresh rows is rewritten
// too.
export function useVisitorKickoffs(
  container: RefObject<HTMLElement | null>,
  content: unknown,
) {
  const clock = useVisitorClock();
  useEffect(() => {
    const times =
      container.current?.querySelectorAll<HTMLTimeElement>(
        "time[data-kickoff]",
      ) ?? [];
    for (const time of times) {
      time.textContent = clock[time.dataset.kickoff as KickoffPart](
        time.dateTime || null,
      );
    }
  }, [container, clock, content]);
  return clock;
}
