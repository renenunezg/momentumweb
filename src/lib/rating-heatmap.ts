import type { CSSProperties } from "react";

type RatingValue = number | null | undefined;

// Build the scale before search and sorting so neither recolors a team.
export function ratingHeatmap(
  values: RatingValue[],
  { lowerIsBetter = false, center }: { lowerIsBetter?: boolean; center?: number } = {},
) {
  const finite = values.filter((value): value is number => value != null && Number.isFinite(value));
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const midpoint = center ?? (min + max) / 2;

  return (value: RatingValue): CSSProperties | undefined => {
    if (value == null || !Number.isFinite(value) || !finite.length || max === min) return undefined;
    const distance = value - midpoint;
    const extent = distance >= 0 ? max - midpoint : midpoint - min;
    const position = extent > 0 ? Math.max(-1, Math.min(1, distance / extent)) : 0;
    const strength = position * (lowerIsBetter ? -1 : 1);
    const color = strength >= 0 ? "--rating-strong" : "--rating-weak";
    // Reserve the strongest wash for exceptional ratings, keeping the middle quiet.
    const intensity = Math.pow(Math.abs(strength), 1.8) * 100;
    return {
      backgroundColor: `color-mix(in oklab, var(${color}) ${intensity.toFixed(2)}%, transparent)`,
    };
  };
}
