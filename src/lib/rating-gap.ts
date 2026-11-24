import type { NflTeamRating } from "@/lib/types";

// The fitted NFL rating before the market blend, minus market-implied strength
// from earlier closing spreads, in points. Null before a market rating exists.
export function nflPureMinusMarket(
  r: Pick<NflTeamRating, "power_rating" | "forecast_alignment_points" | "market_rating">,
): number | null {
  return r.market_rating == null ? null : r.power_rating - (r.forecast_alignment_points ?? 0) - r.market_rating;
}
