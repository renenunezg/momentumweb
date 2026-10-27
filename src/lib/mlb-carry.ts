import { cache } from "react";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database-schema";

// The carry study, written once per offseason by mlbmodel (v2.carry.build): one jsonb row of aggregates for the study
// sections and one row per hitter-season. Rates are derived here from raw counts.

export type CarryHitterRow = Omit<Tables<"mlb", "carry_hitters">, "updated_at">;
export type CarryMinorRow = Omit<Tables<"mlb", "carry_minors">, "updated_at">;
export type MinorLevel = "aaa" | "fsl";

export interface MinorSummary {
  seasons: number[];
  split_half: number;
  year_to_year: number;
  qualified: number;
  qualified_air: number;
  parks: { venue: string; elevation: number | null; measured: number; n: number }[];
}

export interface PuzzleBall {
  player_id: number;
  date: string;
  exit: number;
  launch: number;
  distance: number;
  expected: number;
  spray: number;
}

export interface SwingTypeRow {
  type: string;
  lo: number | null;
  hi: number | null;
  n: number;
  carry: number;
  gb: number;
  pu: number;
  ba: number;
  obp: number;
  slg: number;
  ops: number;
  hr600: number;
  so600: number;
  whiff: number;
}

export type Coef = [estimate: number, se: number];

export type CarryOutcome = "ba" | "obp" | "slg" | "ops" | "hr600" | "so600" | "bb600" | "carry";

export interface ChangerCoefficients {
  n: number;
  whiff_mean: number;
  whiff_sd: number;
  outcomes: Record<CarryOutcome, { d_tilt: Coef; d_attack: Coef; d_attack_x_whiff: Coef; d_bat_speed: Coef }>;
}

export interface CarryStudy {
  season: number;
  model_version: string;
  puzzle: { balls: PuzzleBall[]; every_ball: Record<string, [expected: number, actual: number][]> };
  repeatability: { split_half: number; year_to_year: number; hitters: number };
  air: {
    ft_per_density_measured: number;
    ft_per_density_model: number;
    league_density: number;
    by_density: [density: number, carry: number, n: number][];
    parks: { venue: string; elevation: number; measured: number; air: number; n: number }[];
  };
  spin_curve: { exit: number; launch: number; rpm: number[]; league: number[]; coors: number[] };
  sidespin: { direction: string; curve: number; feet: number; n: number }[];
  collision: { efficiency: number; balls: number };
  explained: {
    coef: [slope: number, intercept: number];
    share: number;
    share_without_steep_correction: number;
    ceiling: number;
    leftover_year_to_year: number;
    backspin_carry_corr: number;
  };
  swing_types: { attack: SwingTypeRow[]; tilt: SwingTypeRow[]; seasons: number[] };
  pitch_height: { swing_path_tilt: number[]; attack_angle: number[] };
  changers: {
    coefficients: ChangerCoefficients;
    groups: ({ group: string; n: number } & Record<CarryOutcome, number>)[];
  };
  lab: { steps: number[]; generic: number[]; min_balls: number };
  physics: Record<string, number>;
  minors: Record<MinorLevel, MinorSummary>;
}

/** The slices of the study the swing lab and the leaderboard read in the browser. */
export type LabStudy = Pick<CarryStudy, "season" | "lab" | "swing_types"> & { changers: Pick<CarryStudy["changers"], "coefficients"> };
export type LeaderboardStudy = Pick<CarryStudy, "season" | "swing_types">;

export interface CarryData {
  study: CarryStudy | null;
  updatedAt: string | null;
  hitters: CarryHitterRow[];
  minors: CarryMinorRow[];
}

const PAGE = 1000;
const HITTER_COLUMNS =
  "player_id, season, player_name, team, bats, pa, ab, h, tb, hr, bb, hbp, sf, so, swings, whiffs, n_air, carry, carry_raw, physics, backspin, sidespin, tilt, attack, bat_speed, lab_carry";
const MINOR_COLUMNS = "player_id, season, level, player_name, team, pa, hr, n_air, carry, carry_raw, exit_velo";

export const fetchCarry = cache(async (): Promise<CarryData> => {
  const signal = AbortSignal.timeout(10_000);
  const studyRes = await supabase
    .from("carry_study")
    .select("season, model_version, payload, updated_at")
    .order("season", { ascending: false })
    .limit(1)
    .abortSignal(signal);
  if (studyRes.error) throw new Error(`carry_study: ${studyRes.error.message}`);
  const row = studyRes.data[0];
  if (!row) return { study: null, updatedAt: null, hitters: [], minors: [] };

  const hitters: CarryHitterRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const res = await supabase
      .from("carry_hitters")
      .select(HITTER_COLUMNS)
      .order("season", { ascending: true })
      .order("player_id", { ascending: true })
      .range(from, from + PAGE - 1)
      .abortSignal(signal);
    // Reject incomplete snapshots so ISR keeps the last successful page.
    if (res.error) throw new Error(`carry_hitters: ${res.error.message}`);
    hitters.push(...res.data);
    if (res.data.length < PAGE) break;
  }
  const minors: CarryMinorRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const res = await supabase
      .from("carry_minors")
      .select(MINOR_COLUMNS)
      .eq("season", row.season)
      .order("level", { ascending: true })
      .order("player_id", { ascending: true })
      .range(from, from + PAGE - 1)
      .abortSignal(signal);
    if (res.error) throw new Error(`carry_minors: ${res.error.message}`);
    minors.push(...res.data);
    if (res.data.length < PAGE) break;
  }
  return { study: row.payload as unknown as CarryStudy, updatedAt: row.updated_at, hitters, minors };
});

export interface SlashLine {
  ba: number;
  obp: number;
  slg: number;
  ops: number;
  hr600: number;
  so600: number;
  bb600: number;
  whiff: number | null;
}

export function slashLine(row: CarryHitterRow): SlashLine {
  const obp = (row.h + row.bb + row.hbp) / (row.ab + row.bb + row.hbp + row.sf);
  const slg = row.tb / row.ab;
  return {
    ba: row.h / row.ab,
    obp,
    slg,
    ops: obp + slg,
    hr600: (row.hr / row.pa) * 600,
    so600: (row.so / row.pa) * 600,
    bb600: (row.bb / row.pa) * 600,
    whiff: row.swings ? (row.whiffs ?? 0) / row.swings : null,
  };
}

export function swingType(rows: SwingTypeRow[], value: number | null): string | null {
  if (value == null) return null;
  return rows.find((r) => (r.lo == null || value >= r.lo) && (r.hi == null || value < r.hi))?.type ?? null;
}

/** Carry change from the lab grid for tilt and attack-angle changes on the grid's steps, bilinear between steps. */
export function labCarry(grid: number[], steps: number[], dTilt: number, dAttack: number, tenths: boolean): number {
  const n = steps.length;
  const pos = (d: number) => {
    const clamped = Math.min(Math.max(d, steps[0]), steps[n - 1]);
    const i = Math.min(Math.floor((clamped - steps[0]) / (steps[1] - steps[0])), n - 2);
    return { i, f: (clamped - steps[i]) / (steps[i + 1] - steps[i]) };
  };
  const t = pos(dTilt);
  const a = pos(dAttack);
  const at = (ti: number, ai: number) => grid[ti * n + ai] / (tenths ? 10 : 1);
  const top = at(t.i, a.i) * (1 - a.f) + at(t.i, a.i + 1) * a.f;
  const bottom = at(t.i + 1, a.i) * (1 - a.f) + at(t.i + 1, a.i + 1) * a.f;
  return top * (1 - t.f) + bottom * t.f;
}

/** Expected change in one outcome for a swing change, with a one-standard-error range; whiffZ is the hitter's whiff rate
 *  in standard deviations from the changer sample's mean. The terms' errors are treated as independent. */
export function changerEffect(
  coefs: ChangerCoefficients,
  outcome: CarryOutcome,
  dTilt: number,
  dAttack: number,
  whiffZ: number,
): { estimate: number; se: number } {
  const c = coefs.outcomes[outcome];
  const estimate = c.d_tilt[0] * dTilt + (c.d_attack[0] + c.d_attack_x_whiff[0] * whiffZ) * dAttack;
  const se = Math.sqrt(
    (c.d_tilt[1] * dTilt) ** 2 + (c.d_attack[1] * dAttack) ** 2 + (c.d_attack_x_whiff[1] * whiffZ * dAttack) ** 2,
  );
  return { estimate, se };
}
