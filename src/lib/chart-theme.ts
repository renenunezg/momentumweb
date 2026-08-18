"use client";

import { useEffect, useState } from "react";

/**
 * Recharts renders colors as SVG presentation attributes, which do not resolve
 * `var(--token)`. So we read the resolved values off the document once and
 * again whenever the theme class flips, keeping globals.css authoritative.
 */
const TOKENS = [
  "grid",
  "border",
  "rule-strong",
  "muted-foreground",
  "foreground",
  "background",
  "popover",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "positive",
  "negative",
  "accent-blue",
  "accent-amber",
] as const;

type Token = (typeof TOKENS)[number];

export type ChartTheme = Record<Token, string>;

/** Server render and first paint; mirrors the light palette in globals.css. */
const FALLBACK: ChartTheme = {
  grid: "oklch(0.90 0.005 75)",
  border: "oklch(0.87 0.006 75)",
  "rule-strong": "oklch(0.35 0.008 60)",
  "muted-foreground": "oklch(0.48 0.008 60)",
  foreground: "oklch(0.20 0.008 60)",
  background: "oklch(0.985 0.005 85)",
  popover: "oklch(0.995 0.003 85)",
  "chart-1": "oklch(0.42 0.10 155)",
  "chart-2": "oklch(0.45 0.09 250)",
  "chart-3": "oklch(0.52 0.10 65)",
  "chart-4": "oklch(0.45 0.09 320)",
  "chart-5": "oklch(0.35 0.005 60)",
  positive: "oklch(0.42 0.10 155)",
  negative: "oklch(0.48 0.14 25)",
  "accent-blue": "oklch(0.45 0.09 250)",
  "accent-amber": "oklch(0.52 0.10 65)",
};

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(FALLBACK);

  useEffect(() => {
    const read = () => {
      const styles = getComputedStyle(document.documentElement);
      const next = {} as ChartTheme;
      for (const token of TOKENS) {
        next[token] =
          styles.getPropertyValue(`--${token}`).trim() || FALLBACK[token];
      }
      setTheme(next);
    };
    read();
    // next-themes toggles a class on <html>; re-read when it does.
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}

/**
 * Shared axis, grid, and tooltip config for the Tufte-leaning chart style:
 * horizontal rules only, no frame, no tick marks.
 */
export function chartAxisProps(theme: ChartTheme) {
  return {
    tick: {
      fill: theme["muted-foreground"],
      fontSize: 11,
      fontFamily: "var(--font-geist-mono)",
    },
    axisLine: false as const,
    tickLine: false as const,
  };
}

export function chartTooltipStyle(theme: ChartTheme) {
  return {
    backgroundColor: theme.popover,
    border: `1px solid ${theme.border}`,
    borderRadius: "2px",
    color: theme.foreground,
    fontFamily: "var(--font-geist-mono)",
    fontSize: "12px",
    boxShadow: "none",
  };
}
