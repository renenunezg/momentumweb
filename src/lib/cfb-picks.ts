import { supabaseCfb } from "@/lib/supabase";
import type { CfbPicksDatabase } from "@/lib/cfb-picks.database.types";

export type CfbPick =
  CfbPicksDatabase["cfb"]["Tables"]["recommendations"]["Row"];
export type CfbPickMetric =
  CfbPicksDatabase["cfb"]["Views"]["recommendation_performance"]["Row"];
import { PICK_PAGE_SIZE, type PickFiltersValue } from "@/lib/football-picks";
export * from "@/lib/football-picks";
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
