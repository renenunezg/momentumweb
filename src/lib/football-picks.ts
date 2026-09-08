import type { CfbPicksDatabase } from "@/lib/cfb-picks.database.types";
import type { Json } from "@/lib/database.types";
export type FootballPick = Omit<
  CfbPicksDatabase["cfb"]["Tables"]["recommendations"]["Row"],
  "game_id"
> & {
  game_id: string | number;
  execution_eligibility_verified?: boolean;
  source_timestamps?: Json;
  data_flags?: Json;
  settlement_reason?: string | null;
  result_source_at?: string | null;
};
export type FootballPickMetric =
  CfbPicksDatabase["cfb"]["Views"]["recommendation_performance"]["Row"] & {
    unique_games?: number | null;
  };
export type PickMarket = "all" | "h2h" | "spreads" | "totals";
export type WeeklyPick = Pick<
  FootballPick,
  | "game_id"
  | "market"
  | "start_date"
  | "home_team"
  | "away_team"
  | "status"
  | "selection"
  | "point"
  | "price"
  | "provider"
  | "outcome"
  | "profit_units"
  | "win_probability"
  | "push_probability"
>;
// The identity a matchup card needs, structural so CFB rows (keyed by
// team_id) and NFL rows (keyed by team_abbr) both satisfy it, and small
// enough to serialize for every game of a 120 game week.
export type TeamBadge = {
  logo_light: string | null;
  logo_dark: string | null;
  color: string | null;
};
export type WeeklyGame = {
  game_id: string | number;
  start_date: string | null;
  home_team: string;
  away_team: string;
  home: TeamBadge | null;
  away: TeamBadge | null;
  rows: WeeklyPick[];
};
export type PickPeriod = "7" | "14" | "all";
export const PICK_PAGE_SIZE = 50;
export const MARKET_LABELS = {
  h2h: "Moneyline",
  spreads: "Spread",
  totals: "Total",
};
export const SIDE_LABELS: Record<string, string> = {
  favorite: "Favorites",
  underdog: "Underdogs",
  pickem: "Pick’em",
  over: "Overs",
  under: "Unders",
  even: "Even money",
};

export function pickMarket(value?: string): PickMarket {
  return value === "h2h" || value === "spreads" || value === "totals"
    ? value
    : "all";
}

export function pickFilters(
  params: { season?: string; market?: string; period?: string },
  defaultPeriod: PickPeriod = "all",
) {
  const parsed = Number(params.season);
  const season =
    Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100
      ? parsed
      : null;
  const period: PickPeriod =
    params.period === "7" || params.period === "14" || params.period === "all"
      ? params.period
      : defaultPeriod;
  const floor = new Date();
  floor.setUTCHours(0, 0, 0, 0);
  if (period !== "all")
    floor.setUTCDate(floor.getUTCDate() - Number(period) + 1);
  return {
    season,
    market: pickMarket(params.market),
    period,
    from: period === "all" ? null : floor.toISOString(),
  };
}
export type PickFiltersValue = ReturnType<typeof pickFilters>;

export function pickQuery(filters: PickFiltersValue): URLSearchParams {
  return new URLSearchParams({
    season: filters.season?.toString() ?? "all",
    market: filters.market,
    period: filters.period,
  });
}

export function selectedPickMetric(
  metrics: FootballPickMetric[],
  market: PickMarket,
) {
  return metrics.find((row) =>
    market === "all"
      ? row.segment_kind === "overall"
      : row.segment_kind === "market" && row.segment === market,
  );
}

export function teamBadge(team: TeamBadge | undefined): TeamBadge | null {
  return team
    ? {
        logo_light: team.logo_light,
        logo_dark: team.logo_dark,
        color: team.color,
      }
    : null;
}

// The week's matchups come from the schedule, so a game with no recorded
// decision still holds its place in the slate; a decision for a game the
// schedule no longer lists is kept rather than hidden.
export function weeklyGames(
  schedule: Omit<WeeklyGame, "rows">[],
  decisions: WeeklyPick[],
): WeeklyGame[] {
  const games = new Map<string | number, WeeklyGame>(
    schedule.map((game) => [game.game_id, { ...game, rows: [] }]),
  );
  for (const row of decisions) {
    let game = games.get(row.game_id);
    if (!game) {
      game = {
        game_id: row.game_id,
        start_date: row.start_date,
        home_team: row.home_team,
        away_team: row.away_team,
        home: null,
        away: null,
        rows: [],
      };
      games.set(row.game_id, game);
    }
    game.rows.push(row);
  }
  return [...games.values()];
}

export function pickLabel(
  pick: Pick<FootballPick, "status" | "market" | "selection" | "point">,
): string {
  if (pick.status !== "recommended") return "No Play";
  if (pick.market === "h2h") return `${pick.selection} ML`;
  const point = pick.point;
  const line =
    point == null
      ? ""
      : pick.market === "spreads" && point > 0
        ? `+${point}`
        : String(point);
  return `${pick.selection} ${line}`;
}

export function pickReason(reason: string): string {
  const reasons: Record<string, string> = {
    qualifying_edge: "Qualifying edge",
    unverified_book_availability: "Bookmaker availability is not verified",
    stale_or_missing_expected_qb: "Expected QB information is missing or stale",
    below_edge_threshold: "Below the edge threshold",
    missing_model_inputs: "Incomplete model inputs",
    no_valid_price: "No valid price",
    stale_price: "Price is stale",
    stale_forecast: "Forecast is stale",
    unverified_source: "Missing verified odds source",
    kickoff_mismatch: "Provider kickoff does not match the schedule",
    uncertain_game_match: "Game match needs verification",
    unpaired_market: "Missing opposing price",
    missing_price_timestamp: "Missing price timestamp",
    in_play_offer: "Offer was captured after kickoff",
    not_pregame: "Game has started",
    missing_provider: "Missing bookmaker",
    invalid_probability: "Invalid model probability",
  };
  return reasons[reason] ?? reason.replaceAll("_", " ");
}
