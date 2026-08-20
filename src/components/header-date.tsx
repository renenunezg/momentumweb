"use client";

export function HeaderDate() {
  return (
    <span className="whitespace-nowrap font-mono text-xs text-muted-foreground tabular-nums">
      {new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}
    </span>
  );
}
