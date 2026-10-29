"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlayerRowDisclosure({ name, rank, identity, grade, open, panelId, onToggle }: {
  name: string;
  rank: number;
  identity: ReactNode;
  grade: string;
  open: boolean;
  panelId: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${open ? "Hide" : "Show"} full player card for ${name}`}
      aria-expanded={open}
      aria-controls={panelId}
      onClick={onToggle}
      className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)_2.75rem_1rem] items-center gap-2 px-1 py-2.5 text-left hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring md:hidden"
    >
      <span className="font-mono text-xs text-muted-foreground">{rank}</span>
      <div className="min-w-0 text-sm">
        {identity}
      </div>
      <span className="text-center">
        <span className="font-mono text-sm font-bold tabular-nums text-primary">{grade}</span>
      </span>
      <ChevronDown aria-hidden="true" className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
    </button>
  );
}

export function PlayerRowHeader() {
  return (
    <div className="md:hidden">
      <p className="pb-2 text-xs text-muted-foreground">Tap a row for the full player card.</p>
      <div className="type-eyebrow grid grid-cols-[1.25rem_minmax(0,1fr)_2.75rem_1rem] items-center gap-2 border-y border-rule-strong px-1 py-2 text-muted-foreground">
        <span>#</span>
        <span>Player</span>
        <span className="text-center">Grade</span>
        <span aria-hidden="true" />
      </div>
    </div>
  );
}
