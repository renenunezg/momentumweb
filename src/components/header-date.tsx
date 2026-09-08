"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const interval = window.setInterval(onChange, 60_000);
  window.addEventListener("focus", onChange);
  return () => {
    window.clearInterval(interval);
    window.removeEventListener("focus", onChange);
  };
}

function localDate() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function serverDate() {
  return "";
}

export function HeaderDate() {
  const date = useSyncExternalStore(subscribe, localDate, serverDate);
  return (
    <span className="inline-block min-w-[6ch] whitespace-nowrap font-mono text-xs text-muted-foreground tabular-nums">
      {date}
    </span>
  );
}
