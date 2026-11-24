import type { CSSProperties } from "react";

type RatingValue = number | null | undefined;

// Build the scale before search and sorting so neither recolors a team.
// With `extent`, every column sharing it reads on one symmetric scale around
// `center`; otherwise each side of the center spans its own observed range.
// A value's place on it runs from -1 (worst) to 1 (best).
export function ratingScale(
  values: RatingValue[],
  {
    lowerIsBetter = false,
    center,
    extent,
  }: { lowerIsBetter?: boolean; center?: number; extent?: number } = {},
) {
  const finite = values.filter((value): value is number => value != null && Number.isFinite(value));
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const midpoint = center ?? (min + max) / 2;

  return (value: RatingValue): number | null => {
    if (value == null || !Number.isFinite(value) || !finite.length || max === min) return null;
    const distance = value - midpoint;
    const span = extent ?? (distance >= 0 ? max - midpoint : midpoint - min);
    const position = span > 0 ? Math.max(-1, Math.min(1, distance / span)) : 0;
    return position * (lowerIsBetter ? -1 : 1);
  };
}

// Near-center values stay a quiet tint; full saturation is for the extremes.
export function heatIntensity(strength: number): number {
  return Math.pow(Math.abs(strength), 1.2);
}

export function ratingHeatmap(values: RatingValue[], options: Parameters<typeof ratingScale>[1] = {}) {
  const scale = ratingScale(values, options);
  return (value: RatingValue): CSSProperties | undefined => {
    const strength = scale(value);
    if (strength == null) return undefined;
    const color = strength >= 0 ? "--better" : "--worse";
    return {
      backgroundColor: `color-mix(in oklab, var(${color}) ${(heatIntensity(strength) * 100).toFixed(1)}%, var(--cell-neutral))`,
      color: "var(--on-fill)",
    };
  };
}

// The absolute value at quantile `q` across every column that should share one
// scale. Below 1 it keeps a few extreme teams (the weakest FCS programs sit far
// below everyone else) from washing out the rest; values past it simply clamp.
export function sharedExtent(columns: RatingValue[][], q = 1): number {
  const finite = columns
    .flat()
    .filter((v): v is number => v != null && Number.isFinite(v))
    .map(Math.abs)
    .sort((a, b) => a - b);
  if (!finite.length) return 0;
  return finite[Math.min(finite.length - 1, Math.floor(q * (finite.length - 1)))];
}
