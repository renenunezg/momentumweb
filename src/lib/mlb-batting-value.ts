import { cache } from "react";
import { pitchName } from "@/lib/mlb-pitch-value";
import { supabase } from "@/lib/supabase";

// Batting run value, written by mlbmodel (v2.batting_value.publish): one jsonb row with the coverage and validation the
// page quotes, one row per hitter-season, and one per hitter-season and split. Runs are the batting team's, so positive
// is good for the hitter. The total, the rates and "vs rest" are derived here.

export const BATTING_PARTS = ["decision", "contact", "quality"] as const;
export type BattingPart = (typeof BATTING_PARTS)[number];
export type BattingParts = Record<BattingPart, number>;

export const BATTING_PART_LABELS: Record<BattingPart, string> = { decision: "Decision", contact: "Contact", quality: "Quality" };

export interface BattingHitter extends BattingParts {
  player_id: number;
  player_name: string;
  team: string;
  pa: number;
  pitches: number;
  // Called strikes and hit batters on his takes against what the league model expected. Not part of the total.
  calls: number;
}

// One hitter's parts on the pitches of one split. A tuple, because the page ships about 5,000 of them to the browser.
export type BattingSplit = readonly [playerId: number, pitches: number, decision: number, contact: number, quality: number];

export const COUNT_SPLITS = ["two_strikes", "ahead", "first_pitch"] as const;
export const PITCH_GROUP_SPLITS = ["fastball", "breaking", "offspeed"] as const;
export const ZONE_SPLITS = ["heart", "shadow", "chase", "waste"] as const;
// The outer thirds of the plate, from the hitter's side of it, and of his own strike zone, each running on past the edge.
// Unlike the zones these cross: a pitch up and in is in both Up and Inside.
export const DIRECTION_SPLITS = ["inside", "away", "up", "down"] as const;

const SPLIT_LABELS: Record<string, string> = {
  two_strikes: "Two strikes", ahead: "Hitter ahead", first_pitch: "First pitch",
  fastball: "Fastballs", breaking: "Breaking balls", offspeed: "Offspeed",
  heart: "Heart", shadow: "Shadow", chase: "Chase", waste: "Waste",
  inside: "Inside", away: "Outside", up: "Up", down: "Down",
};
// Any other split code is a Statcast pitch type.
export const battingSplitLabel = (code: string) => SPLIT_LABELS[code] ?? pitchName(code);

// A correlation or a difference of correlations with its 95% interval.
export type Interval = [value: number, low: number, high: number];

// One season's value against the next season's batting runs per PA, over hitters with `pa` in both seasons. `grade`
// is the same comparison on the pairs the preseason hitter grade covers, with what the total adds once it is known.
export interface BattingValueCut {
  pa: number;
  pairs: number;
  hitters: number;
  r: Record<"value" | "woba" | "xwoba", number>;
  lead: Record<"woba" | "xwoba", Interval>;
  grade: { pairs: number; r: number; value: number; lead: Interval; partial: Interval };
}

export type BattingMeasure = BattingPart | "total" | "call" | "woba" | "xwoba";

// Year-to-year repeat of a split's runs per 100 pitches, and of its gap to the hitter's other pitches.
export interface BattingSplitRepeat {
  pairs: number;
  repeat: Interval;
  vs_rest: Interval;
}

export interface BattingValueStudy {
  seasons: number[];
  pitches: number;
  min_pa: number;
  min_type_pitches: number;
  // Every season pair, then only the pairs kept back while the method was designed.
  validation: BattingValueCut[];
  held_back: BattingValueCut[];
  parts: { pa: number; pairs: number; measures: Record<BattingMeasure, { repeat: Interval; next_runs: Interval }> };
  counts: { pitches: number; values: Record<string, BattingSplitRepeat> };
  pitch_types: { pitches: number; values: Record<string, BattingSplitRepeat> };
  // Absent from a study published before the directions were added.
  directions?: { pitches: number; values: Record<string, BattingSplitRepeat> };
}

export interface BattingValueData {
  study: BattingValueStudy | null;
  season: number | null;
  updatedAt: string | null;
  hitters: BattingHitter[];
  splits: Record<string, BattingSplit[]>;
}

const PAGE = 1000;
const HITTER_COLUMNS = "player_id, player_name, team, pa, pitches, decision_runs, contact_runs, quality_runs, call_runs";
const SPLIT_COLUMNS = "player_id, split, pitches, decision_runs, contact_runs, quality_runs";

// Each request gets its own limit: a build's first read waits seconds on a cold API.
const timeout = () => AbortSignal.timeout(10_000);
// Hundredths of a run are far below what the page shows and keep the split rows small.
const cents = (v: number) => Math.round(100 * v) / 100;

export const fetchBattingValue = cache(async (): Promise<BattingValueData> => {
  const studyRes = await supabase
    .from("batting_value_study")
    .select("season, payload, updated_at")
    .order("season", { ascending: false })
    .limit(1)
    .abortSignal(timeout());
  if (studyRes.error) throw new Error(`batting_value_study: ${studyRes.error.message}`);
  const row = studyRes.data[0];
  if (!row) return { study: null, season: null, updatedAt: null, hitters: [], splits: {} };

  // The page shows the study's season.
  const hitters: BattingHitter[] = [];
  for (let from = 0; ; from += PAGE) {
    const res = await supabase
      .from("batting_values")
      .select(HITTER_COLUMNS)
      .eq("season", row.season)
      .order("player_id", { ascending: true })
      .range(from, from + PAGE - 1)
      .abortSignal(timeout());
    // Reject incomplete snapshots so ISR keeps the last successful page.
    if (res.error) throw new Error(`batting_values: ${res.error.message}`);
    for (const h of res.data) {
      hitters.push({
        player_id: h.player_id, player_name: h.player_name, team: h.team, pa: h.pa, pitches: h.pitches,
        decision: cents(h.decision_runs), contact: cents(h.contact_runs), quality: cents(h.quality_runs), calls: cents(h.call_runs),
      });
    }
    if (res.data.length < PAGE) break;
  }
  const splits: Record<string, BattingSplit[]> = {};
  for (let from = 0; ; from += PAGE) {
    const res = await supabase
      .from("batting_split_values")
      .select(SPLIT_COLUMNS)
      .eq("season", row.season)
      .order("player_id", { ascending: true })
      .order("split", { ascending: true })
      .range(from, from + PAGE - 1)
      .abortSignal(timeout());
    if (res.error) throw new Error(`batting_split_values: ${res.error.message}`);
    for (const s of res.data) {
      (splits[s.split] ??= []).push([s.player_id, s.pitches, cents(s.decision_runs), cents(s.contact_runs), cents(s.quality_runs)]);
    }
    if (res.data.length < PAGE) break;
  }
  return { study: row.payload as unknown as BattingValueStudy, season: row.season, updatedAt: row.updated_at, hitters, splits };
});

export const battingTotal = (parts: BattingParts) => parts.decision + parts.contact + parts.quality;

// Where a 95% interval puts a difference: clear of zero either way, or not shown to differ.
export type LeadSide = "ahead" | "behind" | "level";
export const leadSide = ([, low, high]: Interval): LeadSide => (low > 0 ? "ahead" : high < 0 ? "behind" : "level");

// ".52" and "-.07": a correlation at the two decimals its sample supports.
export const formatCorrelation = (v: number) => v.toFixed(2).replace(/^(-?)0\./, "$1.");
