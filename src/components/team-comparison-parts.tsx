"use client";

import { useId, useMemo } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { ArrowLeftRight, Check, ChevronsUpDown } from "lucide-react";
import { cn, formatSigned } from "@/lib/utils";

// The pieces every sport's team comparison shares: the searchable team
// pickers with a swap button, and the centered bars that put two teams on
// one scale.

function TeamPicker<T extends { team: string }>({
  label,
  rows,
  selected,
  rowKey,
  onChange,
}: {
  label: string;
  rows: T[];
  selected: T;
  rowKey: (row: T) => string | number;
  onChange: (row: T) => void;
}) {
  const inputId = useId();
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.team.localeCompare(b.team)),
    [rows],
  );
  return (
    <Combobox.Root
      items={sortedRows}
      value={selected}
      onValueChange={(row) => {
        if (row) onChange(row);
      }}
      itemToStringLabel={(row) => row.team}
      itemToStringValue={(row) => String(rowKey(row))}
      isItemEqualToValue={(a, b) => rowKey(a) === rowKey(b)}
      autoHighlight
    >
      <div className="min-w-0 space-y-2">
        <label
          htmlFor={inputId}
          className="type-eyebrow text-muted-foreground"
        >
          {label}
        </label>
        <div className="relative">
          <Combobox.Input
            id={inputId}
            className="h-11 w-full rounded-md border border-border bg-background py-2 pl-3 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Search teams…"
          />
          <Combobox.Trigger
            aria-label={`Choose ${label.toLowerCase()}`}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronsUpDown className="size-4" />
          </Combobox.Trigger>
        </div>
      </div>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={6} className="z-50">
          <Combobox.Popup className="w-[var(--anchor-width)] min-w-48 overflow-hidden rounded-md border border-border bg-background shadow-lg">
            <Combobox.Empty className="p-3 text-sm text-muted-foreground">
              No teams found.
            </Combobox.Empty>
            <Combobox.List className="max-h-64 overflow-y-auto p-1">
              {(row: T) => (
                <Combobox.Item
                  key={rowKey(row)}
                  value={row}
                  className="flex cursor-default items-center justify-between gap-3 rounded-sm px-3 py-2 text-sm outline-none data-highlighted:bg-muted"
                >
                  {row.team}
                  <Combobox.ItemIndicator>
                    <Check className="size-4" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

// Away and home pickers with a swap button between them. Picking the team
// already on the other side swaps the two.
export function AwayHomePickers<T extends { team: string }>({
  rows,
  away,
  home,
  rowKey,
  onSelect,
}: {
  rows: T[];
  away: T;
  home: T;
  rowKey: (row: T) => string | number;
  onSelect: (away: T, home: T) => void;
}) {
  return (
    <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
      <TeamPicker
        label="Away"
        rows={rows}
        selected={away}
        rowKey={rowKey}
        onChange={(row) =>
          onSelect(row, rowKey(row) === rowKey(home) ? away : home)
        }
      />
      <button
        type="button"
        onClick={() => onSelect(home, away)}
        className="flex h-11 items-center justify-center gap-2 rounded-md border border-border px-3 text-xs text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Swap teams"
      >
        <ArrowLeftRight className="size-4" />
        <span className="sm:sr-only">Swap teams</span>
      </button>
      <TeamPicker
        label="Home"
        rows={rows}
        selected={home}
        rowKey={rowKey}
        onChange={(row) =>
          onSelect(rowKey(row) === rowKey(away) ? home : away, row)
        }
      />
    </div>
  );
}

export type ChartEntry = {
  team: string;
  value: number | null;
  color: string;
  detail?: string;
  label?: string;
};

// Bars centered on zero (league average) out to `extent` either side.
// `digits` sets the value's decimals and `unit` a suffix such as "%"; the
// axis ends are whole numbers.
export function RatingBars({
  entries,
  extent,
  compact = false,
  digits = 1,
  unit = "",
}: {
  entries: ChartEntry[];
  extent: number;
  compact?: boolean;
  digits?: number;
  unit?: string;
}) {
  const format = (value: number | null) =>
    value == null ? formatSigned(value) : `${formatSigned(value, digits)}${unit}`;
  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <div key={index} className="space-y-1.5">
          {!compact && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
              <span className="space-y-0.5">
                {entry.label && (
                  <span className="block text-sm font-medium">
                    {entry.label}
                  </span>
                )}
                <span
                  className={
                    entry.label ? "block text-muted-foreground" : "font-medium"
                  }
                >
                  {entry.team}
                </span>
              </span>
              <span className="text-muted-foreground">{entry.detail}</span>
            </div>
          )}
          <div
            className="flex items-center gap-3"
            role="img"
            aria-label={`${entry.team}${entry.label ? ` ${entry.label}` : ""}: ${format(entry.value)}${entry.detail ? `, ${entry.detail}` : ""}`}
          >
            {compact && (
              <span
                className="w-14 shrink-0 truncate text-[10px] text-muted-foreground"
                title={entry.team}
                aria-hidden="true"
              >
                {entry.team}
              </span>
            )}
            <div
              className="relative h-5 min-w-0 flex-1 rounded-sm bg-muted/70"
              aria-hidden="true"
            >
              <span className="absolute inset-y-0 left-1/4 border-l border-border/60" />
              <span className="absolute inset-y-0 left-3/4 border-l border-border/60" />
              {entry.value != null && entry.value !== 0 && (
                <span
                  className="absolute inset-y-1 rounded-sm border border-foreground/15"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${entry.color} 85%, var(--foreground))`,
                    left: `${50 + Math.max(-1, Math.min(0, entry.value / extent)) * 50}%`,
                    width: `${Math.min(1, Math.abs(entry.value) / extent) * 50}%`,
                  }}
                />
              )}
              <span className="absolute -inset-y-0.5 left-1/2 border-l border-muted-foreground/70" />
            </div>
            <span
              className={cn(
                "shrink-0 text-right font-mono text-lg tabular-nums",
                unit || digits > 1 ? "w-16" : "w-12",
              )}
              aria-hidden="true"
            >
              {format(entry.value)}
            </span>
          </div>
        </div>
      ))}
      <div
        className={cn(
          "flex justify-between text-[10px] tabular-nums text-muted-foreground",
          unit || digits > 1 ? "pr-19" : "pr-15",
          compact && "pl-17",
        )}
        aria-hidden="true"
      >
        <span>{formatSigned(-extent, 0)}{unit}</span>
        <span>0 · Average</span>
        <span>{formatSigned(extent, 0)}{unit}</span>
      </div>
    </div>
  );
}
