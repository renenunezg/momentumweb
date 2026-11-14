"use client";

import type { ReactNode } from "react";
import { PlayerHeadshot } from "@/components/player-headshot";
import { EMPTY, cn } from "@/lib/utils";

export interface PositionLeader {
  // The full name is the accessible label; the tile shows the short one.
  name: string;
  short: string;
  // A unit row (an offensive line) shows its team logo instead of a headshot, set in the same circle.
  image?: ReactNode;
  headshotUrl: string | null;
  // The figure the table ranks by, already formatted.
  stat: string;
  tone?: "primary" | "positive" | "destructive";
}

// The badge pinned to the photo: tinted text at rest, a solid fill on the chosen option.
const BADGE = {
  primary: { rest: "text-primary", on: "bg-primary text-primary-foreground" },
  positive: { rest: "text-positive", on: "bg-positive text-background" },
  destructive: { rest: "text-destructive", on: "bg-destructive text-background" },
} as const;

// Two-part names lose the first name; suffixed and compound surnames keep the rest.
export function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(" ") : name;
}

// A picker whose every option shows the player the table would rank first
// there (a position on the grades pages, a pitch type on pitching value), so the
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
      className="-mx-page-gutter grid auto-cols-[minmax(5.25rem,1fr)] grid-flow-col gap-1 overflow-x-auto px-page-gutter [scrollbar-width:none] md:mx-0 md:px-0"
    >
      {options.map(({ key, label: title = key, leader }) => {
        const active = key === value;
        const badge = BADGE[leader?.tone ?? "primary"];
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            aria-label={leader ? `${title}: ${leader.name}, ${leader.stat}` : `${title}: no player`}
            onClick={() => onChange(key)}
            className={cn(
              "group flex min-w-0 flex-col items-center gap-1.5 rounded-lg px-1 pb-2 pt-1.5 text-center transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "bg-primary/[0.07]" : "hover:bg-muted/50"
            )}
          >
            <span className={cn("type-eyebrow w-full truncate", active ? "text-primary" : "text-muted-foreground")}>{title}</span>
            {leader ? (
              <>
                <span className="relative">
                  <span
                    className={cn(
                      "block rounded-full ring-2 ring-offset-2 ring-offset-background transition-shadow",
                      active ? "ring-primary" : "ring-transparent group-hover:ring-rule-strong"
                    )}
                  >
                    {leader.image ? (
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">{leader.image}</span>
                    ) : (
                      <PlayerHeadshot name={leader.name} src={leader.headshotUrl} className="h-12 w-12" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-px font-mono text-[11px] font-bold leading-tight tabular-nums ring-2 ring-background",
                      active ? badge.on : cn("bg-card", badge.rest)
                    )}
                  >
                    {leader.stat}
                  </span>
                </span>
                <span className={cn("mt-2 w-full truncate text-xs", active ? "font-semibold text-foreground" : "font-medium text-muted-foreground group-hover:text-foreground")}>
                  {leader.short}
                </span>
              </>
            ) : (
              <span className="flex h-12 items-center text-xs text-muted-foreground">{EMPTY}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
