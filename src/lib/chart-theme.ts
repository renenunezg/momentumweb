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
  "primary",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "positive",
  "negative",
  "accent-blue",
  "accent-amber",
  "brand-highlight",
] as const;

type Token = (typeof TOKENS)[number];

export type ChartTheme = Record<Token, string>;

/** Server render and first paint; mirrors the light palette in globals.css. */
const FALLBACK: ChartTheme = {
  grid: "#e1e9e6",
  border: "#d6e1dd",
  "rule-strong": "#8ca9a1",
  "muted-foreground": "#5c6e69",
  foreground: "#253a37",
  background: "#f8faf9",
  popover: "#ffffff",
  primary: "#137b70",
  "chart-1": "#137b70",
  "chart-2": "oklch(0.45 0.09 250)",
  "chart-3": "oklch(0.52 0.12 45)",
  "chart-4": "oklch(0.45 0.09 320)",
  "chart-5": "oklch(0.35 0.005 60)",
  positive: "oklch(0.42 0.10 155)",
  negative: "oklch(0.48 0.14 25)",
  "accent-blue": "oklch(0.45 0.09 250)",
  "accent-amber": "oklch(0.52 0.10 65)",
  "brand-highlight": "#12e57a",
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
      fontFamily: "var(--font-sans)",
    },
    axisLine: false as const,
    tickLine: false as const,
  };
}

export function chartTooltipStyle(theme: ChartTheme) {
  return {
    backgroundColor: theme.popover,
    border: `1px solid ${theme.border}`,
    borderRadius: "6px",
    color: theme.foreground,
    fontFamily: "var(--font-sans)",
    fontSize: "12px",
    boxShadow: "none",
  };
}
