import { cache } from "react";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database-schema";

// Pitch run value, written by mlbmodel (v2.pitch_value.publish): one jsonb row with the coverage and validation the
// page quotes, one row per pitcher-season and one per pitcher-season and pitch type. Runs are the batting team's, so
// negative is good for the pitcher; per-100 rates are derived here.

export type PitchValueRow = Omit<Tables<"mlb", "pitch_values">, "updated_at">;
export type PitchTypeValueRow = Omit<Tables<"mlb", "pitch_type_values">, "updated_at">;

export type PitchValueBaseline = "era" | "fip" | "xfip";

// One season's value against the next season's runs allowed per nine, over pitchers with `innings` in both seasons.
export interface PitchValueCut {
  innings: number;
  pairs: number;
  pitchers: number;
  r: Record<PitchValueBaseline | "value", number>;
  lead: Record<PitchValueBaseline, [diff: number, low: number, high: number]>;
}

export interface PitchValueStudy {
  seasons: number[];
  pitches: number;
  min_pitches: number;
  min_type_pitches: number;
  validation: PitchValueCut[];
}

export interface PitchValueData {
  study: PitchValueStudy | null;
  season: number | null;
  updatedAt: string | null;
  pitchers: PitchValueRow[];
  types: PitchTypeValueRow[];
}

const PAGE = 1000;
const PITCHER_COLUMNS = "player_id, season, player_name, team, pitches, raw_runs, context_runs, runs";
const TYPE_COLUMNS = "player_id, season, pitch_type, pitches, usage, runs";

// Each request gets its own limit: a build's first read waits seconds on a cold API.
const timeout = () => AbortSignal.timeout(10_000);

export const fetchPitchValue = cache(async (): Promise<PitchValueData> => {
  const studyRes = await supabase
    .from("pitch_value_study")
    .select("season, payload, updated_at")
    .order("season", { ascending: false })
    .limit(1)
    .abortSignal(timeout());
  if (studyRes.error) throw new Error(`pitch_value_study: ${studyRes.error.message}`);
  const row = studyRes.data[0];
  if (!row) return { study: null, season: null, updatedAt: null, pitchers: [], types: [] };

  // The page shows the study's latest season; earlier seasons stay in the tables.
  const pitchers: PitchValueRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const res = await supabase
      .from("pitch_values")
      .select(PITCHER_COLUMNS)
      .eq("season", row.season)
      .order("player_id", { ascending: true })
      .range(from, from + PAGE - 1)
      .abortSignal(timeout());
    // Reject incomplete snapshots so ISR keeps the last successful page.
    if (res.error) throw new Error(`pitch_values: ${res.error.message}`);
    pitchers.push(...res.data);
    if (res.data.length < PAGE) break;
  }
  const types: PitchTypeValueRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const res = await supabase
      .from("pitch_type_values")
      .select(TYPE_COLUMNS)
      .eq("season", row.season)
      .order("player_id", { ascending: true })
      .order("pitch_type", { ascending: true })
      .range(from, from + PAGE - 1)
      .abortSignal(timeout());
    if (res.error) throw new Error(`pitch_type_values: ${res.error.message}`);
    types.push(...res.data);
    if (res.data.length < PAGE) break;
  }
  return { study: row.payload as unknown as PitchValueStudy, season: row.season, updatedAt: row.updated_at, pitchers, types };
});

export const per100 = (row: { runs: number; pitches: number }) => (100 * row.runs) / row.pitches;

// Statcast pitch type codes.
const PITCH_NAMES: Record<string, string> = {
  FF: "Four-seam", SI: "Sinker", FC: "Cutter", SL: "Slider", ST: "Sweeper", SV: "Slurve", CU: "Curveball",
  KC: "Knuckle curve", CS: "Slow curve", CH: "Changeup", FS: "Splitter", FO: "Forkball", SC: "Screwball",
  KN: "Knuckleball", EP: "Eephus", FA: "Fastball",
};

export const pitchName = (code: string) => PITCH_NAMES[code] ?? code;
