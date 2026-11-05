// The swing hoop's scene: a right-handed hitter's barrel path drawn as a hoop tilted by the swing path tilt, in a small
// perspective projection. Frame: x toward first base, y toward the pitcher, z up (meters). The lab's canvas and the
// lab's share card both draw from here.

export type Vec = [number, number, number];

export const CONTACT: Vec = [0, 0.35, 0.85];
const RADIUS = 1.0;
// A 34-inch bat with its sweet spot on the hoop, about 6 inches from the end.
export const BAT_LENGTH = 0.86;
export const BAT_KNOB = RADIUS + 0.15 - BAT_LENGTH;
// The hitter stands off the plate's first-base side at this x.
export const HITTER_X = -0.85;
// The visible part of a swing, in degrees around the hoop from the start of the stroke to the follow-through.
export const STROKE: [number, number] = [-150, 110];

const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec): Vec => {
  const l = Math.hypot(...a);
  return [a[0] / l, a[1] / l, a[2] / l];
};

// The hoop traces the bat's sweet spot; `dist` from the hoop's center places other points along the same bat.
export function hoopPoint(tilt: number, angle: number, dist = RADIUS): Vec {
  const r = (tilt * Math.PI) / 180;
  const n: Vec = [-Math.cos(r), 0, Math.sin(r)];
  const c: Vec = [CONTACT[0] + RADIUS * n[0], CONTACT[1], CONTACT[2] + RADIUS * n[2]];
  const p = (angle * Math.PI) / 180;
  return [c[0] - dist * n[0] * Math.cos(p), c[1] + dist * Math.sin(p), c[2] - dist * n[2] * Math.cos(p)];
}

/** Points around the hoop from `from` to `to` degrees. */
export function hoopArc(tilt: number, from: number, to: number, step: number): Vec[] {
  const pts: Vec[] = [];
  for (let g = from; g <= to; g += step) pts.push(hoopPoint(tilt, g));
  return pts;
}

/** A camera orbiting the plate at azimuth `az` and elevation `el` (degrees), projecting onto a w by h picture. */
export function projector(az: number, el: number, w: number, h: number): (p: Vec) => [number, number] {
  const a = (az * Math.PI) / 180;
  const e = (el * Math.PI) / 180;
  const target: Vec = [0, 0.3, 0.9];
  const eye: Vec = [target[0] + 6.2 * Math.sin(a) * Math.cos(e), target[1] - 6.2 * Math.cos(a) * Math.cos(e), target[2] + 6.2 * Math.sin(e)];
  const f = norm(sub(target, eye));
  const r = norm(cross(f, Math.abs(f[2]) > 0.98 ? [0, 1, 0] : [0, 0, 1]));
  const u = cross(r, f);
  const scale = Math.min(w, h) * 1.55;
  return (p) => {
    const d = sub(p, eye);
    const z = dot(d, f);
    return [w / 2 + (scale * dot(d, r)) / z, h * 0.56 - (scale * dot(d, u)) / z];
  };
}

/** The fixed scene around the hoops: field grid, home plate, strike zone and the hitter's body. */
export function sceneLines(): { grid: Vec[][]; plate: Vec[]; zone: Vec[]; legs: Vec[]; torso: Vec[]; head: Vec; shoulder: Vec } {
  const grid: Vec[][] = [];
  for (let i = -3; i <= 3; i++) {
    grid.push([[i * 0.6, -1.8, 0], [i * 0.6, 2.4, 0]]);
    grid.push([[-1.8, i * 0.6 + 0.3, 0], [1.8, i * 0.6 + 0.3, 0]]);
  }
  return {
    grid,
    plate: [[-0.22, 0.43, 0], [0.22, 0.43, 0], [0.22, 0.22, 0], [0, 0, 0], [-0.22, 0.22, 0], [-0.22, 0.43, 0]],
    zone: [[-0.22, 0.3, 0.5], [0.22, 0.3, 0.5], [0.22, 0.3, 1.07], [-0.22, 0.3, 1.07], [-0.22, 0.3, 0.5]],
    legs: [[HITTER_X - 0.18, 0.05, 0], [HITTER_X, 0.05, 0.9], [HITTER_X + 0.18, 0.05, 0]],
    torso: [[HITTER_X, 0.05, 0.9], [HITTER_X, 0.05, 1.5]],
    head: [HITTER_X, 0.05, 1.66],
    shoulder: [HITTER_X, 0.05, 1.4],
  };
}

/** The hitter's arm reaching the bat's grip at `angle` around the hoop. */
export function armLine(tilt: number, angle: number, shoulder: Vec): Vec[] {
  const hands = hoopPoint(tilt, angle, BAT_KNOB + 0.1 * BAT_LENGTH);
  const elbow: Vec = [(shoulder[0] + hands[0]) / 2, (shoulder[1] + hands[1]) / 2, (shoulder[2] + hands[2]) / 2 - 0.14];
  return [shoulder, elbow, hands];
}
