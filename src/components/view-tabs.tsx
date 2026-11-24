"use client";

import { Tabs } from "@base-ui/react/tabs";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TAB_ITEM, TAB_LIST, TAB_OFF } from "@/lib/tab-styles";

// The site's tab bar. Built on Base UI so the tablist gets roving focus,
// arrow-key switching and aria-selected without each caller wiring them by hand.
export function ViewTabs<K extends string>({
  label,
  options,
  value,
  onValueChange,
  aside,
  className,
  children,
}: {
  label: string;
  options: readonly { key: K; label: string }[];
  value: K;
  onValueChange: (value: K) => void;
  // An action for the current view, at the end of the tab row.
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tabs.Root
      value={value}
      onValueChange={(next) => onValueChange(next as K)}
      className={cn("space-y-section", className)}
    >
      {/* The row carries the baseline too, so it runs on under the action instead of stopping short of it. */}
      <div className="flex items-center gap-3 shadow-[inset_0_-1px_0_var(--border)]">
        <Tabs.List
          aria-label={label}
          className={cn(TAB_LIST, "min-w-0 flex-1")}
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
        {aside}
      </div>
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
