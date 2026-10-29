import type {
  CarryHitterRow,
  CarryOutcome,
  ChangerCoefficients,
  SwingTypeRow,
} from "@/lib/mlb-carry";

// Pure formatting and interpolation over carry-study rows. Kept apart from the
// loader so client components can import these without bundling supabase-js.

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

/** Expected change in one outcome for a swing change at constant bat speed, with its standard error; whiffZ is the hitter's
 *  whiff rate in standard deviations from the changer sample's mean. The change is linear in the coefficients, so its
 *  variance is g' cov g for the gradient g. */
export function changerEffect(
  coefs: ChangerCoefficients,
  outcome: CarryOutcome,
  dTilt: number,
  dAttack: number,
  whiffZ: number,
): { estimate: number; se: number } {
  const c = coefs.outcomes[outcome];
  const g = [dTilt, dAttack, whiffZ * dAttack, 0];
  const estimate = c.d_tilt * g[0] + c.d_attack * g[1] + c.d_attack_x_whiff * g[2];
  const variance = g.reduce((sum, gi, i) => sum + gi * g.reduce((row, gj, j) => row + c.cov[i][j] * gj, 0), 0);
  return { estimate, se: Math.sqrt(Math.max(variance, 0)) };
}
