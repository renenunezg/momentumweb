import { supabase, supabaseCfb, supabaseNfl } from "@/lib/supabase";
import {
  SITE_TIME_ZONE,
  footballGames,
  mlbGamePicks,
  zonedDayRange,
  type DailyGame,
  type DailySport,
  type MlbPickRow,
} from "@/lib/daily-picks";

const FOOTBALL_COLUMNS =
  "game_id,market,start_date,home_team,away_team,status,selection,point,price,win_probability";

function byStart(a: DailyGame, b: DailyGame) {
  return (a.start ?? "").localeCompare(b.start ?? "");
}

function emptyDay(sport: DailySport["sport"]): DailySport {
  return {
    sport,
    name: sport.toUpperCase(),
    href: sport === "mlb" ? "/mlb/games" : `/${sport}/predictions`,
    gameCount: 0,
    published: false,
    games: [],
    unavailable: false,
  };
}

async function fetchMlbDay(date: string): Promise<DailySport> {
  const sport = emptyDay("mlb");
  const [gamesRes, outputsRes] = await Promise.all([
    supabase
      .from("games")
      .select("game_pk, home_team, away_team, start_time")
      .eq("game_date", date)
      .order("start_time"),
    supabase
      .from("model_outputs")
      .select(
        "game_pk, team, lineup_source, ev_flag, run_line_ev_flag, total_play, moneyline, spread, spread_odds, total, total_over_odds, total_under_odds, win_prob, p_cover, p_over, p_under",
      )
      .eq("date", date),
  ]);
  if (gamesRes.error || outputsRes.error) return { ...sport, unavailable: true };
  const outputs = new Map<number, MlbPickRow[]>();
  for (const row of outputsRes.data ?? [])
    outputs.set(row.game_pk, [...(outputs.get(row.game_pk) ?? []), row]);
  const games = (gamesRes.data ?? []).map((game) => ({
    key: String(game.game_pk),
    start: game.start_time,
    away_team: game.away_team,
    home_team: game.home_team,
    picks: mlbGamePicks(outputs.get(game.game_pk) ?? []),
  }));
  // The scorer suppresses every pick flag until a real lineup is posted, so
  // a morning slate with no picks is unpublished, not edgeless.
  const lineupsPosted = (outputsRes.data ?? []).some((row) =>
    (row.lineup_source ?? "").startsWith("lineup_live"),
  );
  return {
    ...sport,
    gameCount: games.length,
    published: lineupsPosted || games.some((game) => game.picks.length > 0),
    games: games.filter((game) => game.picks.length > 0),
  };
}

async function fetchFootballDay(
  sport: "cfb" | "nfl",
  range: { from: string; to: string },
): Promise<DailySport> {
  // Both football schemas publish these two tables with the same columns, so
  // one query path serves both; the CFB type stands in for the union.
  const client = (sport === "cfb" ? supabaseCfb : supabaseNfl) as typeof supabaseCfb;
  const day = emptyDay(sport);
  const [countRes, decisionsRes] = await Promise.all([
    client
      .from("game_projections")
      .select("game_id", { count: "exact", head: true })
      .gte("start_date", range.from)
      .lt("start_date", range.to),
    client
      .from("recommendations")
      .select(FOOTBALL_COLUMNS)
      .gte("start_date", range.from)
      .lt("start_date", range.to)
      .order("start_date", { ascending: true })
      .order("game_id", { ascending: true }),
  ]);
  if (countRes.error || decisionsRes.error) return { ...day, unavailable: true };
  const decisions = decisionsRes.data ?? [];
  const games = footballGames(decisions);
  return {
    ...day,
    gameCount: Math.max(countRes.count ?? 0, games.length),
    published: decisions.length > 0,
    games: games.filter((game) => game.picks.length > 0).sort(byStart),
  };
}

// A sport whose read throws (rather than returning an error) degrades to its
// unavailable state so the home page never 500s over one schema.
export async function fetchDailyPicks(date: string): Promise<DailySport[]> {
  const range = zonedDayRange(date, SITE_TIME_ZONE);
  return Promise.all(
    [
      fetchMlbDay(date),
      fetchFootballDay("cfb", range),
      fetchFootballDay("nfl", range),
    ].map((day, index) =>
      day.catch(() => ({
        ...emptyDay((["mlb", "cfb", "nfl"] as const)[index]),
        unavailable: true,
      })),
    ),
  );
}
