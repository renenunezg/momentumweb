// Display vocabulary for the MLB player valuation tables. The trait and input
// keys are mlbmodel's (v2/players/inputs.py and features.py) and must stay in
// step with them. Every number on the page explains itself from here; the
// tables carry only the numbers.

export const MLB_POSITION_ORDER = ["C", "1B", "2B", "SS", "3B", "LF", "CF", "RF", "DH", "SP", "RP"] as const;
export type MlbPositionGroup = (typeof MLB_POSITION_ORDER)[number];
export const PITCHER_GROUPS: ReadonlySet<string> = new Set(["SP", "RP"]);

export const GRADE_TIP =
  "Projected talent on a 20 to 80 scale, relative to his position. 50 is average; the range reflects uncertainty.";

export const TRADE_VALUE_TIP =
  "Estimated value of projected fWAR over his remaining control years, minus contract costs. Future seasons are discounted 8 percent per year. Actual trades also depend on team needs and negotiation.";

export const MARKET_VALUE_TIP =
  "Estimated market salary for next season’s projected production and pitching role. Shown when no team-control years remain. A salary carries no surplus, so these players rank last when sorted by value.";

export const IMPACT_TIP =
  "FanGraphs wins above replacement (fWAR) from his completed season.";

export const OUTLOOK_TIP =
  "Projected wins, salary, and surplus for each remaining control year. Salaries are shown as they will be paid. Surplus is discounted to today’s dollars, so the surplus figures add up to the trade value. Faded seasons show free agency.";

export const PLAYING_TIME_TIP =
  "Expected full-season plate appearances or batters faced, adjusted for recent workload and injuries.";

export const PRICE_TIP =
  "Market salaries are calibrated to real contracts and pitching roles. Future arbitration salaries use historical agreements.";

export const PANEL_LABELS: Record<string, string> = {
  batting: "Batting",
  fielding: "Fielding and running",
  arsenal: "Arsenal",
  results: "Results",
  durability: "Durability",
};

export const TRAIT_LABELS: Record<string, { label: string; tip: string }> = {
  contact: { label: "Contact", tip: "How reliably he puts the bat on the ball, from his swings rather than his batting average." },
  power: { label: "Power", tip: "How hard and how far the ball leaves the bat when he connects, and how fast he swings." },
  discipline: { label: "Discipline", tip: "Which pitches he swings at: chasing out of the zone, attacking in it, and the walks that follow." },
  bbq: { label: "Batted-ball quality", tip: "What his contact is worth: expected wOBA on contact, launch angles in the sweet spot, pulled fly balls, grounders." },
  platoon: { label: "Platoon", tip: "How his production against left-handed pitching compares with his overall line." },
  range: { label: "Range", tip: "Outs above average at his primary position, split by direction." },
  arm: { label: "Arm", tip: "Throwing arm strength; for catchers, caught-stealing above average and pop time." },
  reliability: { label: "Reliability", tip: "For catchers: framing and blocking runs." },
  baserunning: { label: "Baserunning", tip: "Runs from taking extra bases and stealing, net of being thrown out." },
  speed: { label: "Sprint speed", tip: "Feet per second on his fastest runs. A physical measurement." },
  stuff: { label: "Stuff", tip: "Velocity, how far his secondary pitches move away from his fastball, pitch-level run value, and whiffs." },
  command: { label: "Command", tip: "Zone rate, first-pitch strikes, and the walks he allows." },
  batmiss: { label: "Bat-missing", tip: "Strikeouts, whiffs, and the chases he induces." },
  contactmgmt: { label: "Contact management", tip: "What hitters do when they connect: expected wOBA and barrels allowed, ground balls, home runs." },
  workload: { label: "Workload", tip: "Innings and pitches per outing, outings per month, and the leverage of his innings." },
};

// A panel's grade is the mean of its graded traits that count toward the
// overall grade. The table's two skill columns are a hitter's Batting and
// Fielding panels, and a pitcher's Stuff and Command traits.
export interface GradedTrait {
  panel: string;
  trait: string;
  grade: number | null;
  in_grade: boolean;
}

export function panelMean(traits: readonly GradedTrait[], panel: string): number | null {
  const graded = traits.filter((t) => t.panel === panel && t.in_grade && t.grade != null);
  if (graded.length === 0) return null;
  return graded.reduce((sum, t) => sum + (t.grade ?? 0), 0) / graded.length;
}

export function skillColumns(traits: readonly GradedTrait[], pitcher: boolean): { bat: number | null; fld: number | null } {
  if (pitcher) {
    const grade = (name: string) => traits.find((t) => t.trait === name)?.grade ?? null;
    return { bat: grade("stuff"), fld: grade("command") };
  }
  return { bat: panelMean(traits, "batting"), fld: panelMean(traits, "fielding") };
}

export function traitLabel(trait: string): { label: string; tip: string } {
  return TRAIT_LABELS[trait] ?? { label: trait, tip: "" };
}

// Dollars in millions: "$61.5M", "-$12.0M".
export function formatMillions(value: number | null | undefined, decimals = 1): string {
  if (value == null || !Number.isFinite(value)) return "–";
  const rounded = Number(value.toFixed(decimals));
  const text = `$${Math.abs(rounded).toFixed(decimals)}M`;
  return rounded < 0 ? `-${text}` : text;
}
