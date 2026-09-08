import { cache } from "react";
import { supabaseNfl } from "@/lib/supabase";
import type {
  NflSeasonWinTotal,
  NflTeamIdentity,
  NflTeamRating,
  NflTeamUnitRating,
} from "@/lib/types";

// Team identity is keyed by team_abbr alone, so one fetch serves every table
// on a page. A failure here must not take the page down: the tables degrade
// to plain text without logos or team colors.
export async function fetchTeams(): Promise<Map<string, NflTeamIdentity>> {
  const { data, error } = await supabaseNfl.from("teams").select("*");
  if (error) {
    console.error("nfl teams fetch failed:", error.message);
    return new Map();
  }
  return new Map(
    ((data ?? []) as NflTeamIdentity[]).map((t) => [t.team_abbr, t]),
  );
}

// The published ratings artifact for the latest (season, week).
// Cached per request: generateMetadata and the page both read it.
export const fetchLatestRatings = cache(
  async (): Promise<{
    ratings: NflTeamRating[];
    season: number | null;
    week: number | null;
  }> => {
    const latestRes = await supabaseNfl
      .from("team_ratings")
      .select("season, week")
      .order("season", { ascending: false })
      .order("week", { ascending: false })
      .limit(1);
    const latest = latestRes.data?.[0];
    if (!latest) return { ratings: [], season: null, week: null };

    const ratingsRes = await supabaseNfl
      .from("team_ratings")
      .select("*")
      .eq("season", latest.season)
      .eq("week", latest.week)
      .order("power_rating", { ascending: false });
    return {
      ratings: (ratingsRes.data ?? []) as NflTeamRating[],
      season: latest.season,
      week: latest.week,
    };
  },
);

// Unit ratings for the same (season, week) as the headline ratings. Week-1
// preseason publishes carry no unit ratings (they need played games), so an
// empty result is a normal state, not an error.
export async function fetchUnitRatings(
  season: number,
  week: number,
): Promise<NflTeamUnitRating[]> {
  const { data, error } = await supabaseNfl
    .from("team_unit_ratings")
    .select("*")
    .eq("season", season)
    .eq("week", week);
  if (error) {
    console.error("nfl unit ratings fetch failed:", error.message);
    return [];
  }
  return (data ?? []) as NflTeamUnitRating[];
}

export async function fetchForecastAccuracy(source: "live" | "backtest") {
  const { data, error } = await supabaseNfl.rpc(
    "forecast_accuracy",
    { p_source: source },
    { get: true },
  );
  if (error) throw error;
  return data as unknown as {
    overall:
      | (import("@/lib/backtest-metrics").SliceMetrics & { pureMae: number })
      | null;
    bySeason: import("@/lib/backtest-metrics").SliceMetrics[];
    completed: number;
    missingForecast: number;
    missingClose: number;
  };
}

// A complete snapshot arrives in one request. Fail closed on partial or mixed
// seasons so the page never presents a truncated league as a valid forecast.
export async function fetchSeasonWinTotals(): Promise<{
  rows: NflSeasonWinTotal[];
  unavailable: boolean;
}> {
  const { data, error } = await supabaseNfl
    .from("season_win_totals")
    .select("*")
    .order("season", { ascending: false })
    .order("projected_wins", { ascending: false })
    .order("team_abbr")
    .limit(32);
  if (error) {
    console.error("nfl season wins fetch failed:", error.message);
    return { rows: [], unavailable: true };
  }
  const rows = data ?? [];
  if (rows.length === 0) return { rows: [], unavailable: false };
  const first = rows[0];
  const complete =
    rows.length === 32 &&
    new Set(rows.map((r) => r.team_abbr)).size === 32 &&
    rows.every(
      (r) =>
        r.season === first.season &&
        r.as_of === first.as_of &&
        Number.isFinite(r.projected_wins) &&
        r.games_played + r.games_remaining === 17,
    );
  return { rows: complete ? rows : [], unavailable: !complete };
}
