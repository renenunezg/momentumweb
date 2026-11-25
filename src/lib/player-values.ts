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

// What the value columns need of a player_values row.
export interface ValuedPlayer {
  grade: number | null;
  projected_war: number | null;
  trade_value_musd: number | null;
  market_value_musd: number | null;
  salary_current_musd: number | null;
  control_years: number | null;
  impact_war: number | null;
  contract_status: string | null;
}

export function marketPriced(row: Pick<ValuedPlayer, "control_years" | "contract_status">): boolean {
  return row.control_years === 0 || row.contract_status === "free_agent";
}

// A player with no control years is shopped at his market value for one season.
export function headlineValue(row: ValuedPlayer): { label: string; value: number | null; tip: string } {
  if (marketPriced(row)) {
    return { label: "Market value", value: row.market_value_musd, tip: MARKET_VALUE_TIP };
  }
  return { label: "Trade value", value: row.trade_value_musd, tip: TRADE_VALUE_TIP };
}

// The value rows of a two-player comparison; a row neither player has is left out.
export function mlbComparisonMetrics(rows: [ValuedPlayer, ValuedPlayer]): { label: string; values: [string, string] }[] {
  const dash = "–";
  const pair = (value: (row: ValuedPlayer) => string): [string, string] => [value(rows[0]), value(rows[1])];
  return [
    { label: "Grade", values: pair((row) => (row.grade == null ? dash : row.grade.toFixed(0))) },
    { label: "Projected WAR", values: pair((row) => (row.projected_war == null ? dash : row.projected_war.toFixed(1))) },
    {
      label: "Trade value",
      values: pair((row) => (row.grade != null && headlineValue(row).label === "Trade value" ? formatMillions(row.trade_value_musd) : dash)),
    },
    {
      label: "Market value",
      values: pair((row) => (row.grade != null && headlineValue(row).label === "Market value" ? formatMillions(row.market_value_musd) : dash)),
    },
    { label: "Salary", values: pair((row) => formatMillions(row.salary_current_musd)) },
    { label: "Control years", values: pair((row) => String(row.control_years)) },
    { label: "Impact WAR", values: pair((row) => (row.impact_war == null ? dash : row.impact_war.toFixed(1))) },
  ].filter((metric) => metric.values.some((value) => value !== dash));
}

// Graded traits in card order: by panel, then by name.
export function orderTraits<T extends { panel: string; trait: string }>(traits: T[]): T[] {
  const panels = Object.keys(PANEL_LABELS);
  const rank = (panel: string) => (panels.indexOf(panel) + panels.length + 1) % (panels.length + 1);
  return [...traits].sort((a, b) => rank(a.panel) - rank(b.panel) || traitLabel(a.trait).label.localeCompare(traitLabel(b.trait).label));
}

// What the opened card reads of a player_values row.
export interface CardPlayer extends ValuedPlayer {
  season: number;
  bats: string | null;
  throws: string | null;
  age: number | null;
  secondary_positions: string[];
  service_time: number | null;
  fa_year: number | null;
  owed_through_control_musd: number | null;
  trade_value_low: number | null;
  trade_value_high: number | null;
  impact_runs: number | null;
}

// Service time is MLB's years.days, with 172 days to a year.
export function serviceText(value: number | null): string | null {
  if (value == null) return null;
  const years = Math.floor(value);
  const days = Math.round((value - years) * 1000);
  if (days > 171) return null;
  return `${years} yr ${days} days service`;
}

// The line of facts that opens a player's card.
export function playerFacts(row: CardPlayer): string[] {
  const service = serviceText(row.service_time);
  return [
    `${row.bats ?? "?"}/${row.throws ?? "?"}`,
    row.age != null && `Age ${row.age}`,
    row.secondary_positions.length > 0 && `also ${row.secondary_positions.join(", ")}`,
    service,
    row.fa_year != null && `free agent ${row.fa_year}`,
    row.contract_status === "estimated" && "contract estimated from debut date",
    row.contract_status === "unknown" && "contract not found",
    row.owed_through_control_musd != null &&
      (row.control_years ?? 0) > 0 &&
      `owed ${formatMillions(row.owed_through_control_musd)} over ${row.control_years} control year${row.control_years === 1 ? "" : "s"}`,
  ].filter((fact): fact is string => Boolean(fact));
}

// A text color token for his headline value: muted without a grade, plain at a
// market price, and signed where it is a surplus over his contract.
export function valueTone(row: ValuedPlayer): string {
  if (row.grade == null) return "text-muted-foreground";
  if (marketPriced(row)) return "text-foreground";
  return (row.trade_value_musd ?? 0) >= 0 ? "text-positive" : "text-destructive";
}

// The line under his headline value.
export function valueSub(row: CardPlayer): string {
  if (row.grade == null) return "Not enough data";
  return headlineValue(row).label === "Trade value" && row.trade_value_low != null
    ? `${formatMillions(row.trade_value_low)} to ${formatMillions(row.trade_value_high)} · ${row.control_years} yrs`
    : `${row.projected_war == null ? "–" : row.projected_war.toFixed(1)} projected WAR`;
}

const signed = (value: number, digits: number) => {
  const rounded = Number(value.toFixed(digits));
  const text = Math.abs(rounded).toFixed(digits);
  return rounded > 0 ? `+${text}` : rounded < 0 ? `-${text}` : text;
};

// The line under his impact: last season's runs, or why there are none.
export function impactSub(row: CardPlayer, pitcher: boolean): string {
  if (row.impact_runs == null) return pitcher ? `no batters faced in ${row.season - 1}` : `no plate appearances in ${row.season - 1}`;
  return `${signed(row.impact_runs, 1)} runs · ${row.season - 1} season`;
}

// The trait panels of a card, in order.
export function cardPanels(pitcher: boolean): string[] {
  return pitcher ? ["arsenal", "results", "durability"] : ["batting", "fielding"];
}

// A panel's rows: graded inputs first. A trait with no grade that would not
// count toward the grade says nothing, so it is left out.
export function panelTraits<T extends { panel: string; trait: string; grade: number | null; in_grade: boolean }>(traits: T[], panel: string): T[] {
  return traits
    .filter((t) => t.panel === panel && (t.grade != null || t.in_grade))
    .sort((a, b) => Number(b.in_grade) - Number(a.in_grade) || a.trait.localeCompare(b.trait));
}

const SALARY_KINDS: Record<string, string> = { pre_arb: "min", arbitration: "arb", option: "opt", buyout: "buyout" };

// One season of the control-year outlook as its four lines. A season past his
// control reads as free agency and is drawn faded.
export function outlookLines(
  year: { season: number; age: number; war: number | null; salary_musd: number; salary_kind: string; surplus_musd: number | null; in_control: boolean },
  graded: boolean,
): { head: string; war: string; salary: string; surplus: string; faded: boolean; positive: boolean } {
  const faded = !year.in_control && year.salary_kind !== "buyout";
  return {
    head: `${year.season} · ${year.age}`,
    war: graded && year.war != null ? `${year.war.toFixed(1)} WAR` : "–",
    salary: faded ? "free agent" : `${formatMillions(year.salary_musd)} ${SALARY_KINDS[year.salary_kind] ?? ""}`.trim(),
    surplus: faded || !graded || year.surplus_musd == null ? "–" : `${signed(year.surplus_musd, 1).replace(/^([+-])/, "$1$")}M`,
    faded,
    positive: (year.surplus_musd ?? 0) >= 0,
  };
}
