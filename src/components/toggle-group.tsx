"use client";

import { cn } from "@/lib/utils";

const VARIANTS = {
  underline: {
    group: "flex items-center font-mono text-xs uppercase tracking-wider",
    button: "border-b-2 px-3 py-2 uppercase transition-colors",
    on: "border-foreground text-foreground",
    off: "border-transparent text-muted-foreground hover:text-foreground",
  },
  pill: {
    group: "inline-flex rounded-sm border border-border p-0.5 font-mono text-xs",
    button: "px-3 py-1 transition-colors",
    on: "bg-foreground text-background",
    off: "text-muted-foreground hover:text-foreground",
  },
  chip: {
    group: "flex flex-wrap gap-1.5",
    button:
      "rounded-md border px-2 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors",
    on: "border-foreground bg-foreground text-background",
    off: "border-border text-muted-foreground hover:text-foreground",
  },
} as const;

// A set of mutually exclusive filters over content that stays mounted. Tabs
// would remount the panel on every switch, which loses the DOM state the
// schedule filters and sortable tables rely on, so this is a pressed-button
// group rather than a tablist.
export function ToggleGroup<K extends string>({
  label,
  options,
  value,
  onChange,
  variant = "underline",
  className,
}: {
  label: string;
  options: readonly { key: K; label: string }[];
  value: K;
  onChange: (value: K) => void;
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  const styles = VARIANTS[variant];
  return (
    <div role="group" aria-label={label} className={cn(styles.group, className)}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.key)}
            className={cn(
              styles.button,
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? styles.on : styles.off
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
