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
  "highlight",
  "chart-primary",
  "chart-comparison",
  "better",
  "worse",
  "neutral-fill",
  "on-fill",
] as const;

type Token = (typeof TOKENS)[number];

export type ChartTheme = Record<Token, string>;

/** Server render and first paint; mirrors the light palette in globals.css. */
const FALLBACK: ChartTheme = {
  grid: "#dcd8cc",
  border: "#d6d2c5",
  "rule-strong": "#9aa199",
  "muted-foreground": "#5a675f",
  foreground: "#10342d",
  background: "#f3f0e7",
  popover: "#fbfaf6",
  primary: "#10342d",
  "chart-1": "#10342d",
  "chart-2": "#858a8f",
  "chart-3": "#a8742a",
  "chart-4": "#4f6b8c",
  "chart-5": "#8a5878",
  positive: "#1b7a4f",
  negative: "#b8362f",
  "accent-blue": "#4f6b8c",
  "accent-amber": "#8f6210",
  highlight: "#2a8c78",
  "chart-primary": "#10342d",
  "chart-comparison": "#858a8f",
  better: "#2aa575",
  worse: "#e2554e",
  "neutral-fill": "#c9cac7",
  "on-fill": "#07150d",
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
      fontSize: 12,
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
    fontSize: "14px",
    boxShadow: "none",
  };
}
