import { footballSlateClock } from "@/lib/football-slates";

// Helpers shared by the CFB and NFL sections: both quote lines for the home
// team and anchor kickoffs to Eastern time.

export const LEAGUE_TIME_ZONE = "America/New_York";

const eastern = footballSlateClock(LEAGUE_TIME_ZONE);

export const formatKickoffDay = eastern.day;
export const formatKickoffTime = eastern.time;

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
