import { cache } from "react";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database-schema";
import { seasonStatsLine, type SeasonStatsLine } from "@/lib/season-stats";
import { PITCHER_GROUPS, skillColumns, type GradedTrait } from "@/lib/player-values";

// The player valuation tables, written nightly by mlbmodel. The page reads the
// index and every player's in-grade trait grades when it is built, and the
// detail (outlook, tip, traits with inputs) for the players a visitor opens.
// The two jsonb blobs live in player_details so the ordered index read stays
// within the anon role's statement timeout.

export type PlayerValueRow = Tables<"mlb", "player_values">;
export type PlayerTraitRow = Tables<"mlb", "player_traits">;

// bat and fld are the table's two skill columns, from skillColumns, so every
// player sorts on them without his detail loaded.
export type PlayerValueIndex = Omit<PlayerValueRow, "outlook" | "tip"> & { bat: number | null; fld: number | null };

export interface OutlookYear {
  season: number;
  age: number;
  war: number | null;
  salary_musd: number;
  salary_kind: string;
  surplus_musd: number | null;
  in_control: boolean;
}

export type TraitInput = [name: string, weight: number, value: number, percentile: number | null];

export interface PlayerTrait extends Omit<PlayerTraitRow, "inputs"> {
  inputs: TraitInput[];
}

export interface PlayerDetail {
  outlook: OutlookYear[];
  tip: Record<string, number | string | null>;
  traits: PlayerTrait[];
  seasonStats: SeasonStatsLine | null;
}

export interface PlayerValues {
  updatedAt: string | null;
  season: number | null;
  modelVersion: string | null;
  index: PlayerValueIndex[];
}

const INDEX_COLUMNS =
  "player_id, player_name, team, team_id, level, position_group, secondary_positions, age, bats, throws, status, as_of, model_version, season, grade, grade_low, grade_high, grade_percentile, grade_reason, projected_war, trade_value_musd, trade_value_low, trade_value_high, market_value_musd, impact_war, impact_runs, playing_time, service_time, contract_status, fa_year, control_years, salary_current_musd, owed_through_control_musd, headshot_url, updated_at";
const PAGE = 1000;
export const DETAIL_IDS = 40;

// Only the traits the skill columns average: in-grade, graded, and in a panel they read.
async function fetchSkillTraits(): Promise<Map<number, GradedTrait[]>> {
  const byPlayer = new Map<number, GradedTrait[]>();
  for (let from = 0; ; from += PAGE) {
    const res = await supabase
      .from("player_traits")
      .select("player_id, panel, trait, grade, in_grade")
      .eq("in_grade", true)
      .not("grade", "is", null)
      .in("panel", ["batting", "fielding", "arsenal"])
      .order("player_id", { ascending: true })
      .order("trait", { ascending: true })
      .range(from, from + PAGE - 1)
      .abortSignal(AbortSignal.timeout(10_000));
    if (res.error) throw new Error(`Player traits read failed: ${res.error.message}`);
    for (const row of res.data ?? []) {
      const list = byPlayer.get(row.player_id) ?? [];
      list.push(row);
      byPlayer.set(row.player_id, list);
    }
    if ((res.data?.length ?? 0) < PAGE) break;
  }
  return byPlayer;
}

async function fetchIndexRows(): Promise<Omit<PlayerValueIndex, "bat" | "fld">[]> {
  const rows: Omit<PlayerValueIndex, "bat" | "fld">[] = [];
  for (let from = 0; ; from += PAGE) {
    const res = await supabase
      .from("player_values")
      .select(INDEX_COLUMNS)
      .order("player_id", { ascending: true })
      .range(from, from + PAGE - 1)
      // Each page gets its own limit: a build's first read waits seconds on a cold API.
      .abortSignal(AbortSignal.timeout(10_000));
    if (res.error) {
      // Reject incomplete snapshots so ISR keeps the last successful page.
      throw new Error(`Player values read failed: ${res.error.message}`);
    }
    rows.push(...((res.data ?? []) as Omit<PlayerValueIndex, "bat" | "fld">[]));
    if ((res.data?.length ?? 0) < PAGE) break;
  }
  return rows;
}

export const fetchPlayerValues = cache(async (): Promise<PlayerValues> => {
  const [rows, byPlayer] = await Promise.all([fetchIndexRows(), fetchSkillTraits()]);
  const index: PlayerValueIndex[] = rows.map((row) => ({
    ...row,
    ...skillColumns(byPlayer.get(row.player_id) ?? [], PITCHER_GROUPS.has(row.position_group)),
  }));
  const first = index[0];
  return {
    updatedAt: first?.updated_at ?? null,
    season: first?.season ?? null,
    modelVersion: first?.model_version ?? null,
    index,
  };
});

export async function fetchPlayerDetails(ids: number[]): Promise<Record<string, PlayerDetail>> {
  const signal = AbortSignal.timeout(10_000);
  const [valuesRes, traitsRes, statsRes] = await Promise.all([
    supabase.from("player_details").select("player_id, outlook, tip").in("player_id", ids).limit(DETAIL_IDS).abortSignal(signal),
    supabase.from("player_traits").select("*").in("player_id", ids).limit(DETAIL_IDS * 16).abortSignal(signal),
    supabase.from("player_season_stats").select("player_id, season, levels, stats").eq("pool", "mlb").in("player_id", ids).limit(DETAIL_IDS).abortSignal(signal),
  ]);
  // Failed or incomplete reads must reach the route's uncached 503 response.
  if (valuesRes.error) throw new Error(`Player outlook read failed: ${valuesRes.error.message}`);
  if (traitsRes.error) throw new Error(`Player traits read failed: ${traitsRes.error.message}`);
  if (statsRes.error) throw new Error(`Player season stats read failed: ${statsRes.error.message}`);
  const returnedIds = new Set(valuesRes.data?.map((row) => row.player_id));
  if (ids.some((id) => !returnedIds.has(id))) throw new Error("Player outlook rows missing");
  const out: Record<string, PlayerDetail> = {};
  for (const row of valuesRes.data ?? []) {
    out[String(row.player_id)] = {
      outlook: (row.outlook ?? []) as unknown as OutlookYear[],
      tip: (row.tip ?? {}) as Record<string, number | string | null>,
      traits: [],
      seasonStats: null,
    };
  }
  for (const row of (traitsRes.data ?? []) as PlayerTraitRow[]) {
    const detail = out[String(row.player_id)];
    if (!detail) continue;
    detail.traits.push({ ...row, inputs: (row.inputs ?? []) as unknown as TraitInput[] });
  }
  // A player without a line this season (injured all year) simply has no stats block.
  for (const row of statsRes.data ?? []) {
    const detail = out[String(row.player_id)];
    if (detail) detail.seasonStats = seasonStatsLine(row);
  }
  return out;
}
