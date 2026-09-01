"use client";

import { Tabs } from "@base-ui/react/tabs";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// The site's tab bar: mono, uppercase, underlined. Built on Base UI so the
// tablist gets roving focus, arrow-key switching and aria-selected without
// each caller wiring them by hand.
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
      className={cn("space-y-6", className)}
    >
      <Tabs.List
        aria-label={label}
        className="flex items-center font-mono text-xs uppercase tracking-wider"
      >
        {options.map((option) => (
          <Tabs.Tab
            key={option.key}
            value={option.key}
            className={cn(
              // Preflight resets text-transform on <button>, so uppercase is
              // set here rather than inherited from the list.
              "border-b-2 border-transparent px-3 py-2 uppercase text-muted-foreground transition-colors",
              "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "data-active:border-foreground data-active:text-foreground"
            )}
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
