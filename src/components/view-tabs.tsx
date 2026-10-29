"use client";

import { Tabs } from "@base-ui/react/tabs";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// One underline-tab look for every tab bar, link row and filter on the site.
// One row that scrolls sideways on narrow screens rather than wrapping. The
// baseline is an inset shadow, not a border: the scroll container clips a
// tab's negative margin, and the tabs' own underline paints over a shadow.
export const TAB_LIST =
  "flex items-center gap-x-2 overflow-x-auto shadow-[inset_0_-1px_0_var(--border)] [scrollbar-width:none]";
export const TAB_ITEM =
  "shrink-0 whitespace-nowrap rounded-t-md border-b-2 px-3 py-2.5 type-label font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const TAB_ON = "border-primary text-foreground";
export const TAB_OFF = "border-transparent text-muted-foreground hover:text-foreground";

// The site's tab bar. Built on Base UI so the tablist gets roving focus,
// arrow-key switching and aria-selected without each caller wiring them by hand.
export function ViewTabs<K extends string>({
  label,
  options,
  value,
  onValueChange,
  className,
  children,
}: {
  label: string;
  options: readonly { key: K; label: string }[];
  value: K;
  onValueChange: (value: K) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tabs.Root
      value={value}
      onValueChange={(next) => onValueChange(next as K)}
      className={cn("space-y-section", className)}
    >
      <Tabs.List
        aria-label={label}
        className={TAB_LIST}
      >
        {options.map((option) => (
          <Tabs.Tab
            key={option.key}
            value={option.key}
            className={cn(TAB_ITEM, TAB_OFF, "data-active:border-primary data-active:text-foreground")}
          >
            {option.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {children}
    </Tabs.Root>
  );
}

export function ViewTabPanel({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tabs.Panel value={value} className={cn("outline-none", className)}>
      {children}
    </Tabs.Panel>
  );
}
