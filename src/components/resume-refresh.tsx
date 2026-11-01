"use client";

import { useEffect } from "react";

// Mobile browsers keep a suspended tab's page for days, so coming back to it
// can show old data and, across a deploy, an old design. Past the hour a cached
// page lives, the tab loads the current page instead of resuming.
const MAX_AWAY_MS = 60 * 60 * 1000;

export function ResumeRefresh() {
  useEffect(() => {
    let awaySince: number | null = null;
    const leave = () => {
      awaySince ??= Date.now();
    };
    const resume = () => {
      if (awaySince !== null && Date.now() - awaySince > MAX_AWAY_MS) window.location.reload();
      awaySince = null;
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? leave() : resume());

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", resume);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", resume);
    };
  }, []);

  return null;
}
