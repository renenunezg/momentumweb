"use client";

import type { ReactNode } from "react";
import { PlayerHeadshot } from "@/components/player-headshot";
import { EMPTY, cn } from "@/lib/utils";

export interface PositionLeader {
  // The full name is the accessible label; the tile shows the short one.
  name: string;
  short: string;
  // A unit row (an offensive line) shows its team logo instead of a headshot.
  image?: ReactNode;
  headshotUrl: string | null;
  // The figure the table ranks by, already formatted.
  stat: string;
  // 0 to 100 fill for a 20 to 80 grade; null shows the stat alone.
  fill: number | null;
  tone?: "primary" | "positive" | "destructive";
}

const TONE = {
  primary: "text-primary",
  positive: "text-positive",
  destructive: "text-destructive",
} as const;

export function gradeFill(grade: number | null | undefined): number | null {
  return grade == null ? null : Math.min(100, Math.max(0, ((grade - 20) / 60) * 100));
}

// Two-part names lose the first name; suffixed and compound surnames keep the rest.
export function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(" ") : name;
}

// A picker whose every option shows the player the table would rank first
// there (a position on the grades pages, a pitch type on pitch value), so the
// picker doubles as a leaderboard summary. Pressed buttons, not tabs, for the
// reason in ToggleGroup.
export function PositionLeaderTabs<K extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  // `label` names the tile when the key is a code ("ST" shown as "Sweeper").
  options: readonly { key: K; label?: string; leader: PositionLeader | null }[];
  // Null while a search spans every position.
  value: K | null;
  onChange: (value: K) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-page-gutter grid auto-cols-[minmax(5.75rem,1fr)] grid-flow-col gap-1.5 overflow-x-auto px-page-gutter [scrollbar-width:none] md:mx-0 md:px-0"
    >
      {options.map(({ key, label: title = key, leader }) => {
        const active = key === value;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            aria-label={leader ? `${title}: ${leader.name}, ${leader.stat}` : `${title}: no player`}
            onClick={() => onChange(key)}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1.5 rounded-md border px-2 pb-2.5 pt-2 text-center transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-rule-strong hover:bg-muted/50"
            )}
          >
            <span className={cn("type-eyebrow w-full truncate", active ? "text-primary" : "text-muted-foreground")}>{title}</span>
            {leader ? (
              <>
                {leader.image ?? <PlayerHeadshot name={leader.name} src={leader.headshotUrl} className="h-11 w-11" />}
                <span className="w-full truncate text-xs font-medium text-foreground">{leader.short}</span>
                <span className={cn("font-mono text-base font-bold leading-none tabular-nums", TONE[leader.tone ?? "primary"])}>
                  {leader.stat}
                </span>
                <span aria-hidden="true" className="h-1 w-full overflow-hidden rounded-[1px] bg-grid">
                  {leader.fill != null && <span className="block h-full bg-primary" style={{ width: `${leader.fill}%` }} />}
                </span>
              </>
            ) : (
              <span className="flex flex-1 items-center text-xs text-muted-foreground">{EMPTY}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
