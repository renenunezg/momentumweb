import type { Json } from "@/lib/database.types";
import type { Tables } from "@/lib/database-schema";
// The shape the shared pick components read. CFB and NFL rows carry a week
// and per-side missing-input counts; the NHL ledger is daily with one count
// and settles in goals, so those fields are optional here and the table
// renders whichever a row has.
export type FootballPick = Omit<
  Tables<"cfb", "recommendations">,
  | "game_id"
  | "week"
  | "home_missing_input_count"
  | "away_missing_input_count"
  | "home_points"
  | "away_points"
  | "margin_sd"
  | "total_sd"
  | "degrees_of_freedom"
  | "odds_api_event_id"
  | "match_score"
  | "pricing_weights"
  | "pricing_context"
  | "model_home_margin"
  | "closing_source"
  | "closing_point"
  | "closing_price"
  | "clv_points"
  | "decision_forecast"
  | "decision_market_point"
  | "decision_market_probability"
  | "closing_probability"
  | "clv_market_points"
  | "clv_market_probability"
> & {
  // Closing-line and decision-time market columns exist on the CFB ledger only.
  closing_source?: string | null;
  closing_point?: number | null;
  closing_price?: number | null;
  clv_points?: number | null;
  decision_forecast?: Json;
  decision_market_point?: number | null;
  decision_market_probability?: number | null;
  closing_probability?: number | null;
  clv_market_points?: number | null;
  clv_market_probability?: number | null;
  // NFL records where each price came from (odds_api or espn).
  odds_source?: string | null;
  game_id: string | number;
  week?: number;
  margin_sd?: number | null;
  total_sd?: number | null;
  degrees_of_freedom?: number | null;
  odds_api_event_id?: string | null;
  match_score?: number | null;
  pricing_weights?: Json;
  pricing_context?: Json;
  model_home_margin?: number | null;
  home_missing_input_count?: number | null;
  away_missing_input_count?: number | null;
  missing_input_count?: number | null;
  home_points?: number | null;
  away_points?: number | null;
  home_goals?: number | null;
  away_goals?: number | null;
  execution_eligibility_verified?: boolean;
  source_timestamps?: Json;
  data_flags?: Json;
  settlement_reason?: string | null;
  result_source_at?: string | null;
};
type CfbPickMetricRow =
  Tables<"cfb", "recommendation_performance">;
// Closing line value is recorded by the CFB ledger only; the NFL view has
// no closing line columns yet.
type ClosingLineValue =
  | "average_clv_points" | "clv_sample" | "clv_positive_share"
  | "average_clv_market_points" | "clv_market_points_sample" | "clv_market_points_positive_share"
  | "average_clv_market_probability" | "clv_market_probability_sample" | "clv_market_probability_positive_share";
export type FootballPickMetric = Omit<CfbPickMetricRow, ClosingLineValue> &
  Partial<Pick<CfbPickMetricRow, ClosingLineValue>> & {
    unique_games?: number | null;
  };
export type PickMarket = "all" | "h2h" | "spreads" | "totals";
export type PickSport = "cfb" | "nfl" | "nhl";
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
  | "model_home_margin"
  | "model_total"
  | "expected_value_per_unit"
  | "reason"
  | "decision_at"
  | "forecast_as_of"
  | "market_fetched_at"
  | "model_version"
  | "policy_version"
> & { pricing_context?: Json };
export const WEEKLY_PICK_COLUMNS =
  "game_id,market,start_date,home_team,away_team,status,selection,point,price,provider,outcome,profit_units,win_probability,push_probability,model_home_margin,model_total,expected_value_per_unit,reason,decision_at,forecast_as_of,market_fetched_at,model_version,policy_version";
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

// A market selection lists recommended picks only; No Play decisions are
// context for the default All markets view. Both sport tables share these
// columns, so one match object serves either typed client.
export function pickHistoryMatch(filters: PickFiltersValue) {
  return {
    ...(filters.season !== null ? { season: filters.season } : {}),
    ...(filters.market !== "all"
      ? { market: filters.market, status: "recommended" }
      : {}),
  };
}

export function pickHistoryCount(
  metric: FootballPickMetric | undefined,
  market: PickMarket,
) {
  return (
    (metric?.picks ?? 0) + (market === "all" ? (metric?.no_plays ?? 0) : 0)
  );
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

// Keep recorded picks even when the current schedule no longer lists the game.
export function weeklyGames(
  schedule: Omit<WeeklyGame, "rows">[],
  decisions: WeeklyPick[],
): WeeklyGame[] {
  const known = new Map(schedule.map((game) => [game.game_id, game]));
  const games = new Map<string | number, WeeklyGame>();
  for (const row of decisions) {
    if (row.status !== "recommended") continue;
    let game = games.get(row.game_id);
    if (!game) {
      game = {
        ...(known.get(row.game_id) ?? {
          game_id: row.game_id,
          start_date: row.start_date,
          home_team: row.home_team,
          away_team: row.away_team,
          home: null,
          away: null,
        }),
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
    volume_floor: "Exploratory: below the standard edge threshold",
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
    edge_gate: "Qualifying edge",
    "edge_below_0.13": "Below the 13-point edge threshold",
    "edge_below_0.045": "Below the 4.5-point edge threshold",
    total_within_1_goals: "Model total within a goal of the line",
    "total_within_0.5_goals": "Published total within half a goal of the line",
    no_paired_market: "No two-sided price to blend with",
    insufficient_window: "A team's venue window is too short",
    no_offer: "No partner price posted",
    stale_offer: "Partner price is stale",
    missing_spread_reference: "No frozen spread reference",
    unpaired_market: "Missing opposing price",
    missing_moneyline_reference: "No fresh paired moneyline reference",
    invalid_moneyline_pair: "Price is outside the valid moneyline reference",
    missing_price_timestamp: "Missing price timestamp",
    in_play_offer: "Offer was captured after kickoff",
    not_pregame: "Game has started",
    missing_provider: "Missing bookmaker",
    invalid_probability: "Invalid model probability",
  };
  return reasons[reason] ?? reason.replaceAll("_", " ");
}

export function usesPairedMoneylineBlend(pick: Pick<WeeklyPick, "market" | "policy_version">): boolean {
  return pick.market === "h2h" && ["cfb-picks-v9", "cfb-picks-v10", "cfb-picks-v11"].includes(pick.policy_version);
}

export function usesKeyNumberSpread(pick: Pick<WeeklyPick, "market" | "policy_version">): boolean {
  return pick.market === "spreads" && ["cfb-picks-v10", "cfb-picks-v11"].includes(pick.policy_version);
}

export function usesBlendedTotal(pick: Pick<WeeklyPick, "market" | "policy_version">): boolean {
  return pick.market === "totals" && ["cfb-picks-v10", "cfb-picks-v11"].includes(pick.policy_version);
}

export const QUALIFICATION_LABELS: Record<string, string> = {
  edge_qualified: "Edge-qualified",
  exploratory: "Exploratory",
  legacy: "Earlier policy",
};

export function pickQualification(pick: Pick<WeeklyPick, "status" | "reason">): string | null {
  if (pick.status !== "recommended") return null;
  if (pick.reason === "volume_floor") return QUALIFICATION_LABELS.exploratory;
  if (pick.reason === "qualifying_edge") return QUALIFICATION_LABELS.edge_qualified;
  return QUALIFICATION_LABELS.legacy;
}

// Optional context keeps earlier CFB and other-sport ledgers readable.
export function pickResearchContext(pick: Pick<WeeklyPick, "market" | "pricing_context">) {
  const context = pick.pricing_context;
  if (!context || typeof context !== "object" || Array.isArray(context)) return null;
  const raw = context.spread_edge_breakdown;
  const keys = ["model_contribution_points", "quote_difference_points", "price_distribution_adjustment_points", "edge_points"] as const;
  let spread: Record<(typeof keys)[number], number> | null = null;
  if (pick.market === "spreads" && raw && typeof raw === "object" && !Array.isArray(raw)) {
    if (raw.perspective === "selected_side" && keys.every((key) => typeof raw[key] === "number" && Number.isFinite(raw[key]))) {
      const values = Object.fromEntries(keys.map((key) => [key, raw[key]])) as Record<(typeof keys)[number], number>;
      if (Math.abs(values.model_contribution_points + values.quote_difference_points + values.price_distribution_adjustment_points - values.edge_points) < 1e-6) spread = values;
    }
  }
  return {
    postseason: context.is_postseason === true,
    quoteDifference: Array.isArray(context.research_flags) && context.research_flags.includes("spread_quote_differs_from_reference"),
    softCap: context.floor_policy === "shortlist_market_soft_cap_v1",
    spread,
  };
}
