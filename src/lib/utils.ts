import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Empty values render as an en dash everywhere on the site.
export const EMPTY = "–";

export function formatOdds(odds: number | null | undefined): string {
  if (odds == null) return EMPTY;
  const rounded = Math.round(odds);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

export function formatNumber(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value == null) return EMPTY;
  return value.toFixed(decimals);
}

// Sign is decided after rounding so a value that rounds to zero never reads
// as "-0.0".
export function formatSigned(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value == null) return EMPTY;
  const rounded = Number(value.toFixed(decimals));
  const text = Math.abs(rounded).toFixed(decimals);
  if (rounded > 0) return `+${text}`;
  if (rounded < 0) return `-${text}`;
  return text;
}

export function formatPct(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value == null) return EMPTY;
  return `${(value * 100).toFixed(decimals)}%`;
}

// Only the calendar date matters, so the ISO prefix is read and the time is
// pinned to noon to keep the day stable across time zones.
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return EMPTY;
  const d = new Date(dateStr.slice(0, 10) + "T12:00:00");
  if (Number.isNaN(d.getTime())) return EMPTY;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// A `page` query param is untrusted: "abc" or "0" must land on page 1, not on
// a NaN offset sent to PostgREST.
export function pageNumber(raw: string | undefined): number {
  const n = parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
