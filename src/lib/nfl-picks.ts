import { supabaseNfl } from "@/lib/supabase";
import type { NflPicksDatabase } from "@/lib/nfl-picks.database.types";
import type { PickFiltersValue } from "@/lib/football-picks";
export * from "@/lib/football-picks";
export type NflPick =
  NflPicksDatabase["nfl"]["Tables"]["recommendations"]["Row"];
export type NflPickMetric =
  NflPicksDatabase["nfl"]["Views"]["recommendation_performance"]["Row"];
type Summary = { metrics: NflPickMetric[]; seasons: number[] };
type History = Summary & {
  rows: NflPick[];
  count: number;
  page: number;
  total_pages: number;
};
function args(filters: PickFiltersValue) {
  return {
    p_season: filters.season ?? undefined,
    p_market: filters.market,
    p_from: filters.from ?? undefined,
  };
}
export async function fetchNflPickSummary(filters: PickFiltersValue) {
  const { data, error } = await supabaseNfl.rpc(
    "recommendation_dashboard",
    args(filters),
    { get: true },
  );
  const result = data as Summary | null;
  return {
    metrics: result?.metrics ?? [],
    seasons: result?.seasons ?? [],
    latestSeason: result?.seasons?.[0] ?? new Date().getUTCFullYear(),
    unavailable: Boolean(error),
  };
}
export async function fetchNflPickHistory(
  filters: PickFiltersValue,
  page: number,
) {
  const { data, error } = await supabaseNfl.rpc(
    "recommendation_history",
    { ...args(filters), p_page: Math.min(page, 2147483647) },
    { get: true },
  );
  const result = data as History | null;
  return {
    metrics: result?.metrics ?? [],
    seasons: result?.seasons ?? [],
    rows: result?.rows ?? [],
    count: result?.count ?? 0,
    page: result?.page ?? 1,
    total_pages: result?.total_pages ?? 1,
    unavailable: Boolean(error),
  };
}
