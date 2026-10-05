"use client";

import { useSyncExternalStore } from "react";

function formatRelative(ts: string | null): string {
  if (!ts) return "unknown";
  const then = new Date(ts).getTime();
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

// The server renders no age: a clock reading in cached HTML makes every
// regeneration differ from the last, which bills an ISR write even when the
// data is unchanged.
function serverAge() {
  return "";
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
    serverAge,
  );

  return (
    <div className="text-xs text-muted-foreground">
      <div>{schedule}</div>
      <div>Last updated: {age}</div>
    </div>
  );
}
