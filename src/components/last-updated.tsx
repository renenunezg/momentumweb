"use client";

import { useSyncExternalStore } from "react";

function formatRelative(ts: string | null): string {
  if (!ts) return "unknown";
  const then = new Date(ts).getTime();
  if (Number.isNaN(then)) return "unknown";
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(id);
}

// The server renders the absolute time, which only changes when the data
// does: an age in cached HTML would make every regeneration differ from the
// last and bill an ISR write even when nothing changed. The client swaps in
// the age after hydration. A fixed zone keeps the server and client strings
// identical through hydration.
const absolute = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
  timeZoneName: "short",
});

function formatAbsolute(ts: string | null): string {
  const date = ts ? new Date(ts) : null;
  return date && !Number.isNaN(date.getTime()) ? absolute.format(date) : "unknown";
}

export function LastUpdated({
  timestamp,
  schedule,
}: {
  timestamp: string | null;
  schedule: string;
}) {
  const age = useSyncExternalStore(
    subscribe,
    () => formatRelative(timestamp),
    () => formatAbsolute(timestamp),
  );

  return (
    <div className="text-xs text-muted-foreground">
      <div>{schedule}</div>
      <div>Last updated: {age}</div>
    </div>
  );
}
