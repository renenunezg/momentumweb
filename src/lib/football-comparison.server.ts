import { supabaseCfb, supabaseNfl } from "@/lib/supabase";
import type { ComparisonProjections } from "@/lib/football-comparison";

const COLUMNS =
  "game_id,season,week,start_date,home_team,away_team,neutral_site,home_field_points,pure_home_spread,market_home_spread,expected_home_points,expected_away_points,market_informed_home_points,market_informed_away_points,as_of";

// Match the ratings snapshot so a cached comparison cannot combine model weeks.
export async function fetchComparisonProjections(
  sport: "cfb" | "nfl",
  season: number,
  week: number,
): Promise<ComparisonProjections> {
  const { data, error } =
    sport === "cfb"
      ? await supabaseCfb
          .from("game_projections")
          // CFB keeps home_spread pure and publishes its blended line in a
          // separate column; NFL's home_spread is already the blend.
          .select(
            `${COLUMNS},home_key:home_team_id,away_key:away_team_id,forecast_spread:market_informed_home_spread`,
          )
          .eq("season", season)
          .eq("week", week)
          .order("start_date")
      : await supabaseNfl
          .from("game_projections")
          .select(
            `${COLUMNS},home_key:home_team_abbr,away_key:away_team_abbr,forecast_spread:home_spread`,
          )
          .eq("season", season)
          .eq("week", week)
          .order("start_date");

  if (error) {
    console.error(
      `${sport} comparison projections fetch failed:`,
      error.message,
    );
    return { games: [], unavailable: true };
  }
  return {
    unavailable: false,
    games: (data ?? []).flatMap((row) =>
      row.home_key == null || row.away_key == null
        ? []
        : [
            {
              gameId: String(row.game_id),
              awayKey: String(row.away_key),
              homeKey: String(row.home_key),
              awayTeam: row.away_team,
              homeTeam: row.home_team,
              season: row.season,
              week: row.week,
              kickoff: row.start_date,
              neutralSite: row.neutral_site,
              homeFieldPoints: row.home_field_points,
              forecastSpread: row.forecast_spread,
              pureSpread: row.pure_home_spread,
              marketSpread: row.market_home_spread,
              // Rows published before the blended scores existed carry only
              // the earlier ones.
              awayPoints:
                row.market_informed_away_points ?? row.expected_away_points,
              homePoints:
                row.market_informed_home_points ?? row.expected_home_points,
              asOf: row.as_of,
            },
          ],
    ),
  };
}
