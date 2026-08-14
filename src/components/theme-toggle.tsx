"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";

const order = ["system", "light", "dark"] as const;

const neverChanges = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // The stored theme lives in localStorage, so the server cannot know it and
  // renders the system icon. Holding the client to that same icon through
  // hydration keeps the two in agreement; swapping to the real one is then an
  // ordinary re-render. suppressHydrationWarning could not cover this, because
  // the mismatch is a different icon element, not a differing attribute.
  const mounted = useSyncExternalStore(
    neverChanges,
    () => true,
    () => false
  );

  const current = (mounted ? theme : null) ?? "system";
  const Icon =
    current === "dark" ? Moon : current === "light" ? Sun : Monitor;

  const cycle = () => {
    const i = order.indexOf(current as (typeof order)[number]);
    setTheme(order[(i + 1) % order.length]);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${current}. Click to cycle.`}
      title={`Theme: ${current}`}
      className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-transparent text-muted-foreground transition-colors hover:border-border hover:text-foreground"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
