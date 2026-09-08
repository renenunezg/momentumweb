import { supabaseCfb } from "@/lib/supabase";
import type { CfbPicksDatabase } from "@/lib/cfb-picks.database.types";

export type CfbPick =
  CfbPicksDatabase["cfb"]["Tables"]["recommendations"]["Row"];
export type CfbPickMetric =
  CfbPicksDatabase["cfb"]["Views"]["recommendation_performance"]["Row"];
export type PickMarket = "all" | "spreads" | "totals";
export const PICK_PAGE_SIZE = 50;

export function pickMarket(value?: string): PickMarket {
  return value === "spreads" || value === "totals" ? value : "all";
}

export async function fetchCfbPickSummary(requestedSeason?: string) {
  const latest = await supabaseCfb
    .from("game_projections")
    .select("season")
    .order("season", { ascending: false })
    .limit(1);
  const parsed = Number(requestedSeason);
  const season =
    Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100
      ? parsed
      : (latest.data?.[0]?.season ?? new Date().getUTCFullYear());
  const { data, error } = await supabaseCfb
    .from("recommendation_performance")
    .select("*")
    .eq("season", season);
  return {
    season,
    latestSeason: latest.data?.[0]?.season ?? season,
    metrics: (data ?? []) as CfbPickMetric[],
    unavailable: Boolean(error),
  };
}

export async function fetchCfbPickHistory(
  season: number,
  market: PickMarket,
  page: number,
) {
  let query = supabaseCfb
    .from("recommendations")
    .select("*", { count: "exact" })
    .eq("season", season)
    .order("start_date", { ascending: false })
    .order("game_id", { ascending: true })
    .order("market", { ascending: true })
    .range((page - 1) * PICK_PAGE_SIZE, page * PICK_PAGE_SIZE - 1);
  if (market !== "all") query = query.eq("market", market);
  const { data, count, error } = await query;
  return {
    rows: (data ?? []) as CfbPick[],
    count: count ?? 0,
    unavailable: Boolean(error),
  };
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
