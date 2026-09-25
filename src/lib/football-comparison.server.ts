import { supabaseCfb, supabaseNfl } from "@/lib/supabase";
import type { ComparisonProjections } from "@/lib/football-comparison";

const COLUMNS =
  "game_id,season,week,start_date,home_team,away_team,neutral_site,home_spread,pure_home_spread,market_home_spread,expected_home_points,expected_away_points,as_of";

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
          .select(`${COLUMNS},home_key:home_team_id,away_key:away_team_id`)
          .eq("season", season)
          .eq("week", week)
          .order("start_date")
      : await supabaseNfl
          .from("game_projections")
          .select(`${COLUMNS},home_key:home_team_abbr,away_key:away_team_abbr`)
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
              forecastSpread: row.home_spread,
              pureSpread: row.pure_home_spread,
              marketSpread: row.market_home_spread,
              awayPoints: row.expected_away_points,
              homePoints: row.expected_home_points,
              asOf: row.as_of,
            },
          ],
    ),
  };
}
