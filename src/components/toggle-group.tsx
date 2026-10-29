"use client";

import { cn } from "@/lib/utils";
import { TAB_ITEM, TAB_LIST, TAB_OFF, TAB_ON } from "@/components/view-tabs";

const VARIANTS = {
  underline: {
    group: TAB_LIST,
    button: TAB_ITEM,
    on: TAB_ON,
    off: TAB_OFF,
  },
  pill: {
    group: "inline-flex rounded-lg border border-border bg-card p-0.5",
    button: "rounded-md px-3 py-1.5 type-label font-semibold transition-colors",
    on: "bg-primary text-primary-foreground",
    off: "text-muted-foreground hover:text-foreground",
  },
  chip: {
    group: "flex flex-wrap gap-1.5",
    button: "rounded-lg border px-2.5 py-1 type-label font-semibold transition-colors",
    on: "border-primary bg-primary text-primary-foreground",
    off: "border-border bg-card text-muted-foreground hover:text-foreground",
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
