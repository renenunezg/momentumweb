import { supabaseCfb } from "@/lib/supabase";
import type { CfbPicksDatabase } from "@/lib/cfb-picks.database.types";

export type CfbPick =
  CfbPicksDatabase["cfb"]["Tables"]["recommendations"]["Row"];
export type CfbPickMetric =
  CfbPicksDatabase["cfb"]["Views"]["recommendation_performance"]["Row"];
export type PickMarket = "all" | "h2h" | "spreads" | "totals";
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

export async function fetchCfbPickSummary(filters: PickFiltersValue) {
  const [latest, result] = await Promise.all([
    supabaseCfb
      .from("game_projections")
      .select("season")
      .order("season", { ascending: false })
      .limit(1),
    supabaseCfb.rpc(
      "recommendation_summary",
      {
        p_season: filters.season ?? undefined,
        p_market: filters.market,
        p_from: filters.from ?? undefined,
      },
      { get: true },
    ),
  ]);
  return {
    latestSeason: latest.data?.[0]?.season ?? new Date().getUTCFullYear(),
    metrics: (result.data ?? []) as CfbPickMetric[],
    unavailable: Boolean(result.error),
  };
}

export async function fetchCfbPickHistory(
  filters: PickFiltersValue,
  page: number,
) {
  let query = supabaseCfb
    .from("recommendations")
    .select("*")
    .order("decision_at", { ascending: false })
    .order("game_id", { ascending: true })
    .order("market", { ascending: true })
    .range((page - 1) * PICK_PAGE_SIZE, page * PICK_PAGE_SIZE - 1);
  if (filters.season !== null) query = query.eq("season", filters.season);
  if (filters.market !== "all") query = query.eq("market", filters.market);
  if (filters.from) query = query.gte("decision_at", filters.from);
  const { data, error } = await query;
  return { rows: (data ?? []) as CfbPick[], unavailable: Boolean(error) };
}

export function selectedPickMetric(
  metrics: CfbPickMetric[],
  market: PickMarket,
) {
  return metrics.find((row) =>
    market === "all"
      ? row.segment_kind === "overall"
      : row.segment_kind === "market" && row.segment === market,
  );
}

export function pickLabel(pick: CfbPick): string {
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
