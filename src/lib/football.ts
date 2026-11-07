import { footballSlateClock } from "@/lib/football-slates";
import { SITE_TIME_ZONE } from "@/lib/site-time";

// Schedule grouping uses league time; server-rendered kickoffs use Pacific
// until the browser rewrites them into the visitor's zone.
const siteKickoffClock = footballSlateClock(SITE_TIME_ZONE);

export const formatKickoff = {
  day: siteKickoffClock.day,
  time: siteKickoffClock.time,
  hour: siteKickoffClock.hour,
} as const;

// A home line like -7.5 means the home team is favored by 7.5.
export function formatHomeLine(homeSpread: number | null): string {
  if (homeSpread == null) return "–";
  const s = homeSpread.toFixed(1);
  return homeSpread > 0 ? `+${s}` : s;
}

// The best offer prices one side of the spread market; convert the priced
// selection back to a home line so model and market read on the same axis.
export function marketHomeLine(
  market: string | null,
  selection: string | null,
  point: number | null,
  homeTeam: string | null,
): number | null {
  if (market !== "spreads" || selection == null || point == null) return null;
  if (homeTeam != null && selection === homeTeam) return point;
  return -point;
}
