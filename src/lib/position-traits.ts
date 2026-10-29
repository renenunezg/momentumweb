// Display vocabulary for the position_traits tables of both football sports.
// The names are what a fan reads on the card; the one-sentence explanations
// open from the info icon. The trait keys are the backends' and must stay in
// step with momentumcfb's and momentumnfl's position_traits_v1 reports.

export type GradeSport = "cfb" | "nfl";

export const POSITION_ORDER = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "P"] as const;
export type PositionGroup = (typeof POSITION_ORDER)[number];

export const GRADE_TIP =
  "Projected talent on a 20 to 80 scale among qualified FBS players at the position this week. 50 is average; 10 points is one standard deviation. ± shows uncertainty.";

export const WAR_TIP =
  "Estimated wins above a replacement-level player at the position: points above replacement from opponent-adjusted play credit, at the league rate of about 50 points per win. Defensive value is understated because only tagged disruptions count.";

const NFL_GRADE_TIP =
  "Talent on a 20 to 80 scale among qualified NFL players at the position this week. 50 is average; 10 points is one standard deviation. ± shows uncertainty.";

const NFL_WAR_TIP =
  "Estimated wins above a replacement-level player at the position, using opponent-adjusted credit on competitive plays and game leverage. Defensive value excludes coverage and is understated.";

// Copy that differs between the sports: who the percentile pool is, and how
// the grade and WAR explain themselves.
export const SPORT_COPY: Record<GradeSport, { pool: string; gradeTip: string; warTip: string; apiPath: string; groupLabel: string }> = {
  cfb: { pool: "qualified FBS players", gradeTip: GRADE_TIP, warTip: WAR_TIP, apiPath: "/cfb/api/player-traits", groupLabel: "Conference" },
  nfl: { pool: "qualified NFL players", gradeTip: NFL_GRADE_TIP, warTip: NFL_WAR_TIP, apiPath: "/nfl/api/player-traits", groupLabel: "Division" },
};

export const TRAIT_LABELS: Record<string, { label: string; tip: string }> = {
  "epa.credit": {
    label: "EPA credit",
    tip: "Opponent-adjusted expected points added (EPA) credited to the player per game, with small samples pulled toward the position average.",
  },
  "qb.drive_engine": {
    label: "Late-down conversions",
    tip: "Conversions above expectation on third/fourth down and inside two minutes, adjusted for the defense.",
  },
  "qb.explosive": {
    label: "Deep completions",
    tip: "Completions of 20+ yards per dropback, adjusted for the defense.",
  },
  "qb.ball_security": {
    label: "Ball security",
    tip: "Win probability lost to interceptions and fumbles per dropback. Zero is best.",
  },
  "qb.floor": {
    label: "Bad-game floor",
    tip: "20th-percentile game in adjusted EPA per dropback: performance on a bad day.",
  },
  "qb.legs": {
    label: "Rushing",
    tip: "Rushing success above situational expectation, adjusted for the defense.",
  },
  "qb.pressure_handling": {
    label: "Sack avoidance",
    tip: "Sack rate relative to teammates behind the same line, or the league if no teammate is available. Inferred.",
  },
  "qb.receiver_independence": {
    label: "Beyond his receivers",
    tip: "Value per target above the same receivers with other passers. Inferred; requires shared receivers.",
  },
  "rb.yards_over_expected": {
    label: "Yards over expected",
    tip: "Yards per carry above expectation for the situation and run defense.",
  },
  "rb.stuff_avoidance": {
    label: "Stuff avoidance",
    tip: "No-gain carries compared with teammates behind the same line in the same games. Inferred.",
  },
  "rb.breakaway": {
    label: "Breakaway runs",
    tip: "Share of carries gaining 10+ yards, adjusted for the defense.",
  },
  "rb.short_yardage": {
    label: "Short yardage",
    tip: "Conversions above expectation on third/fourth-and-2 or shorter, or inside the three-yard line.",
  },
  "rb.receiving": { label: "Receiving", tip: "Adjusted EPA per target when thrown to." },
  "rb.ball_security": {
    label: "Ball security",
    tip: "Win probability lost to fumbles per touch. Zero is best.",
  },
  "rb.line_independence": {
    label: "Beyond his line",
    tip: "EPA per carry compared with teammates in the same games. Inferred; helps account for blocking and scheme.",
  },
  "rec.target_share": {
    label: "Target share",
    tip: "Share of team targets in games played. Uses reception share when target data is incomplete.",
  },
  "rec.value_per_target": {
    label: "Value per target",
    tip: "Opponent-adjusted EPA per target; per catch when only receptions are available.",
  },
  "rec.explosive": {
    label: "Big catches",
    tip: "Catches of 20+ yards per target, adjusted for the defense.",
  },
  "rec.late_down": {
    label: "Late-down conversions",
    tip: "Third/fourth-down conversions per target above expectation, adjusted for the defense.",
  },
  "rec.qb_independence": {
    label: "Beyond his quarterback",
    tip: "Value per target compared with the same passer’s other targets in the same games. Inferred.",
  },
  "def.havoc": {
    label: "Havoc",
    tip: "Tackles for loss, forced fumbles, breakups and interceptions per game, adjusted for the offense.",
  },
  "def.pass_rush": {
    label: "Pass rush",
    tip: "Win-probability value of sacks plus league-priced hurries, per game.",
  },
  "def.finishing": {
    label: "Finishing",
    tip: "Sacks divided by sacks plus hurries: how often pressure becomes a sack.",
  },
  "def.run_stop": {
    label: "Run stops",
    tip: "Non-sack tackles for loss per game, adjusted for the offense.",
  },
  "def.every_week": {
    label: "Every week",
    tip: "Share of games with a tackle for loss, sack, breakup, interception or forced fumble.",
  },
  "def.tackle_share": {
    label: "Tackle share",
    tip: "Share of team tackles in games played.",
  },
  "def.coverage": {
    label: "Coverage plays",
    tip: "Pass breakups and interceptions per game, adjusted for the offense.",
  },
  "def.ball_production": {
    label: "Ball production",
    tip: "Interceptions and pass breakups per game, adjusted for the offense.",
  },
  "def.run_support": {
    label: "Run support tackles",
    tip: "Solo tackles per game. More can mean more catches allowed; higher is not necessarily better.",
  },
  "def.impact": {
    label: "With vs without",
    tip: "Opponent-adjusted points allowed per play with vs without him, pulled toward zero. Inferred; requires a missed game.",
  },
  "def.pass_impact": {
    label: "Pass defense with vs without",
    tip: "Opponent-adjusted points allowed per pass play with vs without him. Inferred; requires a missed game.",
  },
  "ol.protection": {
    label: "Protection",
    tip: "Sacks allowed relative to league expectation for the unit’s dropbacks, adjusted for the defense. Unit measure.",
  },
  "ol.stuff_rate": {
    label: "Stuffs allowed",
    tip: "Opponent-adjusted share of carries held to no gain. Unit measure; higher means fewer stops.",
  },
  "ol.short_yardage": {
    label: "Short yardage",
    tip: "Short-yardage carries converted above expectation. Unit rating.",
  },
  "ol.line_yards": {
    label: "Line yards",
    tip: "Blocking’s estimated share of yards per carry, adjusted for the defense. Unit measure.",
  },
  "p.punt_average": {
    label: "Punt distance",
    tip: "Yards per punt above the league average through the previous week.",
  },
  "p.net": {
    label: "Net punting",
    tip: "Gross yards less return yards and 20 for each touchback, per punt.",
  },
  "p.fair_catch_share": {
    label: "Fair catches",
    tip: "Share of punts fair caught; a rough proxy for hang time.",
  },
  "p.no_return_share": {
    label: "No return",
    tip: "Share of punts with no return, including fair catches, downed punts, out-of-bounds punts and touchbacks.",
  },
};

// NFL-only traits, and NFL wording where the same trait is built from a
// different feed (quarterback hits rather than hurries, no player value v4).
const NFL_TRAIT_LABELS: Record<string, { label: string; tip: string }> = {
  "epa.credit": {
    label: "EPA credit",
    tip: "Opponent-adjusted EPA credited per game on competitive plays. Passers and receivers split passes; rushers own carries; tagged defenders share defensive credit.",
  },
  "qb.accuracy": {
    label: "Accuracy",
    tip: "Completion percentage above expectation for each throw, adjusted for the defense.",
  },
  "qb.legs": {
    label: "Rushing",
    tip: "Rushing success above situational expectation, adjusted for the defense.",
  },
  "rec.yac_over_expected": {
    label: "Yards after catch",
    tip: "Yards after catch above expectation per reception, adjusted for the defense.",
  },
  "rec.target_share": {
    label: "Target share",
    tip: "Share of team targets on competitive plays in games played.",
  },
  "rec.value_per_target": { label: "Value per target", tip: "Adjusted EPA per target." },
  "def.havoc": {
    label: "Havoc",
    tip: "Tackles for loss, forced fumbles, passes defended and interceptions per game, adjusted for the offense.",
  },
  "def.pass_rush": {
    label: "Pass rush",
    tip: "Win-probability value of sacks plus quarterback hits valued at the median sack, per game.",
  },
  "def.finishing": {
    label: "Finishing",
    tip: "Sacks divided by sacks plus quarterback hits: how often pressure becomes a sack.",
  },
  "def.stops": {
    label: "Stops",
    tip: "Tackles, tackles for loss and sacks on plays that cost the offense expected points, per game. Opponent-adjusted.",
  },
  "def.coverage": {
    label: "Coverage plays",
    tip: "Passes defended and interceptions per game, adjusted for the offense.",
  },
  "def.ball_production": {
    label: "Ball production",
    tip: "Interceptions and passes defended per game, adjusted for the offense.",
  },
  "def.impact": {
    label: "With vs without",
    tip: "Expected points allowed per play with vs without him, pulled toward zero. Inferred; requires a missed game.",
  },
  "ol.protection": {
    label: "Protection",
    tip: "Sacks and QB hits allowed relative to league expectation for the unit’s dropbacks, adjusted for the defense. Unit measure.",
  },
  "p.punt_epa": {
    label: "Punt value",
    tip: "Expected points added per punt above the league average through the previous week. Credits pinning the opponent and charges return yards.",
  },
};

// The fitted ratings (NFL quarterbacks and running backs, version 2). Each
// measure's tip says how it is calculated; the card adds its measured
// reliability. Kinds: quality predicts future production, processing is what
// the passer does when the first read, the blitz or the pocket goes wrong,
// role is how much the coaching staff uses him, style repeats season to
// season but says nothing about production, noise does not repeat.
export const KIND_ORDER = ["quality", "processing", "role", "style", "noise"] as const;
export type MeasureKind = (typeof KIND_ORDER)[number];

export const KIND_LABELS: Record<MeasureKind, { label: string; tip: string }> = {
  quality: {
    label: "Quality",
    tip: "Repeatable measures that predict future production. Those marked grade contribute to the rating.",
  },
  processing: {
    label: "Processing",
    tip: "How the quarterback handles later reads, checkdowns and blitzes, from charted throws.",
  },
  role: {
    label: "Role",
    tip: "How much the player is used. Workload drives most of the running back rating.",
  },
  style: {
    label: "Style",
    tip: "How a player plays, not how well. A higher percentile does not mean better performance.",
  },
  noise: {
    label: "Noise",
    tip: "Measures that vary too much between games to reliably grade the player.",
  },
};

// CFB publishes whether a trait contributes to the grade, but does not publish
// the NFL charting-based quality, processing, role, style and noise taxonomy.
export const CFB_SECTION_ORDER = ["grade_inputs", "context"] as const;
export type TraitSection = MeasureKind | (typeof CFB_SECTION_ORDER)[number];

export const TRAIT_SECTION_LABELS: Record<TraitSection, { label: string; tip: string }> = {
  ...KIND_LABELS,
  grade_inputs: {
    label: "Grade inputs",
    tip: "Traits used in this position’s published grade.",
  },
  context: {
    label: "More context",
    tip: "Additional stats that do not contribute to this position’s grade. Not being graded does not by itself mean a stat is unreliable.",
  },
};

export const RATING_LABELS: Record<string, { label: string; unit: string; tip: string }> = {
  QB: {
    label: "Forecast",
    unit: "EPA per dropback",
    tip: "Projected EPA per dropback for the rest of the season. Grade ranks that forecast among qualified QBs. Grade ± measures rating uncertainty; the wider forecast range reflects future performance uncertainty.",
  },
  RB: {
    label: "Forecast",
    unit: "EPA per game",
    tip: "Projected EPA per game for the rest of the season. Mostly driven by workload because efficiency is less repeatable; the wide range reflects that uncertainty.",
  },
};

const RATED_MEASURE_LABELS: Record<string, { label: string; tip: string }> = {
  // Quarterback quality
  epa_db: { label: "EPA per dropback", tip: "Expected points added per competitive dropback, including passes, sacks and scrambles." },
  success_db: { label: "Success rate", tip: "Share of dropbacks that gain expected points." },
  cpoe: { label: "Completion over expected", tip: "Completion percentage above nflfastR’s expectation for each throw’s distance, location and situation." },
  anya: { label: "Adjusted net yards per attempt", tip: "Pass yards plus 20 per touchdown minus 45 per interception, divided by pass plays including sacks." },
  sack_rate: { label: "Sack rate", tip: "Sacks taken per dropback. Reflects both the passer and his protection." },
  pfr_pressure_to_sack: { label: "Pressure to sack", tip: "Share of pressured dropbacks ending in a sack, from Pro Football Reference charting." },
  late_down_conv: { label: "Late-down conversions", tip: "Conversions above situational expectation on third/fourth down and inside two minutes." },
  epa_in_pocket: { label: "EPA in the pocket", tip: "EPA per dropback on plays FTN charts as thrown from the pocket." },
  epa_no_play_action: { label: "EPA without play action", tip: "EPA per dropback without a play fake." },
  catchable_rate: { label: "Catchable ball rate", tip: "Share of his attempts FTN charts as catchable." },
  // Quarterback processing
  beyond_first_read_rate: { label: "Throws past the first read", tip: "Share of charted throws to later reads, checkdowns or scramble drills. Higher is not necessarily better." },
  success_beyond_first: { label: "Success past the first read", tip: "Share of throws past the first read that gain expected points." },
  epa_beyond_first: { label: "EPA past the first read", tip: "EPA per throw past the first read." },
  checkdown_rate: { label: "Checkdown rate", tip: "Share of his charted throws that were checkdowns. Lower is better in the rating." },
  blitz_sack_rate: { label: "Sacked when blitzed", tip: "Share of blitzed dropbacks ending in a sack, from FTN charting." },
  blitz_success: { label: "Success when blitzed", tip: "Success rate on dropbacks against a blitz." },
  int_worthy_beyond_first: { label: "Int-worthy past the first read", tip: "Interception-worthy throws (FTN) per throw past the first read." },
  // Quarterback style
  ngs_time_to_throw: { label: "Time to throw", tip: "Average seconds from snap to throw, from Next Gen tracking." },
  scramble_rate: { label: "Scramble rate", tip: "Scrambles per dropback." },
  out_of_pocket_rate: { label: "Out of pocket", tip: "Share of dropbacks FTN charts as out of the pocket." },
  play_action_rate: { label: "Play-action rate", tip: "Share of dropbacks with a play fake. Mostly the scheme's choice." },
  adot: { label: "Depth of target", tip: "Average air yards per attempt." },
  deep_rate: { label: "Deep throw rate", tip: "Attempts of 20 or more air yards per attempt." },
  ngs_aggressiveness: { label: "Aggressiveness", tip: "Share of throws with a defender within one yard of the receiver, from Next Gen tracking." },
  throwaway_rate: { label: "Throwaway rate", tip: "Throwaways per attempt (FTN)." },
  motion_rate: { label: "Motion rate", tip: "Share of dropbacks with pre-snap motion. Reflects scheme, not quarterback quality." },
  rpo_rate: { label: "RPO rate", tip: "Share of dropbacks that were run-pass options (FTN)." },
  screen_rate: { label: "Screen rate", tip: "Share of dropbacks that were screens (FTN)." },
  pfr_pressure_rate: { label: "Pressure rate faced", tip: "Share of dropbacks under pressure, from Pro Football Reference charting." },
  // Quarterback noise
  int_rate: { label: "Interception rate", tip: "Interceptions per attempt. Highly variable between games." },
  int_worthy_rate: { label: "Int-worthy throw rate", tip: "Share of throws charted as interception-worthy by FTN. Highly variable between games." },
  turnover_wpa_db: { label: "Turnover cost", tip: "Win probability given away on his interceptions and fumbles, per dropback." },
  explosive_rate: { label: "Explosive completions", tip: "Completions of 20 or more yards per dropback." },
  scramble_epa: { label: "Scramble EPA", tip: "EPA per scramble." },
  // Running back
  epa_game: { label: "EPA per game", tip: "His rushing EPA plus half the EPA of his targets, per game." },
  epa_touch: { label: "EPA per touch", tip: "Rushing EPA plus half the EPA on targets, divided by carries plus targets." },
  first_down_rate: { label: "First-down rate", tip: "Share of carries that gain a first down." },
  success_carry: { label: "Success rate", tip: "Carries that gained expected points, per carry." },
  stuff_rate: { label: "Stuff rate", tip: "Carries held to no gain or a loss, per carry. Lower is better." },
  yac_rec: { label: "Yards after catch", tip: "Yards after the catch per reception." },
  ngs_ryoe_att: { label: "Rush yards over expected", tip: "Yards per carry above Next Gen’s expectation from defender positions at handoff. Highly variable within a season." },
  pfr_yac_carry: { label: "Yards after contact", tip: "Yards after first contact per carry (Pro Football Reference)." },
  pfr_broken_tackle_rate: { label: "Broken tackles", tip: "Broken tackles per touch (Pro Football Reference)." },
  carry_share: { label: "Carry share", tip: "Share of team running back carries in games played." },
  touches_game: { label: "Touches per game", tip: "Carries plus targets per game." },
  target_rate: { label: "Target rate", tip: "Targets divided by carries plus targets." },
  ngs_eight_box_rate: { label: "Stacked boxes faced", tip: "Share of carries against eight or more defenders in the box (Next Gen)." },
  pfr_ybc_carry: { label: "Yards before contact", tip: "Yards before first contact per carry: mostly the line's work." },
  ngs_expected_ypc: { label: "Expected yards per carry", tip: "Expected yards per carry from defender positions at handoff, per Next Gen tracking." },
  epa_carry: { label: "EPA per carry", tip: "Expected points added per carry. Highly variable between games." },
  ypc: { label: "Yards per carry", tip: "Rushing yards per carry." },
  yoe_carry: { label: "Yards over expected", tip: "Yards per carry above what the down, distance and field position usually allow." },
  rec_epa_target: { label: "EPA per target", tip: "Half the play's EPA per target." },
  fumble_rate: { label: "Fumble rate", tip: "Fumbles per touch." },
  short_yardage_conv: { label: "Short-yardage conversions", tip: "Share of third/fourth-and-2 or shorter carries that convert." },
  ngs_efficiency: { label: "Efficiency", tip: "Next Gen's yards travelled per yard gained; lower means a straighter runner." },
};

export function traitLabel(trait: string, sport: GradeSport = "cfb"): { label: string; tip: string } {
  const base = TRAIT_LABELS[trait] ?? { label: trait, tip: "" };
  if (sport !== "nfl") return base;
  return RATED_MEASURE_LABELS[trait] ?? NFL_TRAIT_LABELS[trait] ?? base;
}

export function isMeasureKind(kind: string | null | undefined): kind is MeasureKind {
  return KIND_ORDER.includes(kind as MeasureKind);
}

export const UNIT_PREFIX = "unit:";

export function isUnitRow(athleteId: string): boolean {
  return athleteId.startsWith(UNIT_PREFIX);
}
