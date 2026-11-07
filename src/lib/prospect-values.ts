// Display vocabulary and list filters for the MLB prospect table. The trait
// order and input keys are mlbmodel's (v2/prospects/score.py TRAITS and
// features.py) and must stay in step with them. Pure, so the server page, the
// API route and the client list share one definition.

import { MLB_POSITION_ORDER, PITCHER_GROUPS } from "@/lib/player-values";

export const PROSPECT_LEVELS = [
  { key: "aaa", label: "AAA" },
  { key: "aa", label: "AA" },
  { key: "a+", label: "High-A" },
  { key: "a", label: "Single-A" },
  { key: "rk", label: "Rookie" },
  { key: "dsl", label: "DSL" },
] as const;

// Parent clubs as the table writes them: the Stats API abbreviations.
export const PROSPECT_ORGS = [
  "ATH", "ATL", "AZ", "BAL", "BOS", "CHC", "CIN", "CLE", "COL", "CWS",
  "DET", "HOU", "KC", "LAA", "LAD", "MIA", "MIL", "MIN", "NYM", "NYY",
  "PHI", "PIT", "SD", "SEA", "SF", "STL", "TB", "TEX", "TOR", "WSH",
] as const;

export const PROSPECT_SORTS = [
  { key: "value", label: "Trade value" },
  { key: "grade", label: "Peak grade" },
  { key: "regular", label: "Chance of a regular" },
  { key: "eta", label: "ETA" },
] as const;

export type ProspectSort = (typeof PROSPECT_SORTS)[number]["key"];

export const PROSPECT_ROLES = [
  { key: "hitter", label: "Batters" },
  { key: "pitcher", label: "Pitchers" },
] as const;

export type ProspectRole = (typeof PROSPECT_ROLES)[number]["key"];

export function rolePositions(role: ProspectRole): readonly string[] {
  return MLB_POSITION_ORDER.filter((position) => PITCHER_GROUPS.has(position) === (role === "pitcher"));
}

export interface ProspectFilters {
  // The list always shows one role; null (both) is the comparison picker's name search.
  role: ProspectRole | null;
  org: string | null;
  level: string | null;
  position: string | null;
  gradedOnly: boolean;
  sort: ProspectSort;
  // A trimmed, lowercased name fragment, or null for no search.
  search: string | null;
}

export const DEFAULT_PROSPECT_FILTERS: ProspectFilters = { role: "hitter", org: null, level: null, position: null, gradedOnly: false, sort: "value", search: null };
export const PROSPECT_PAGE = 40;
// Past the last row of the largest pool; anything further is a malformed request.
export const MAX_PROSPECT_OFFSET = 20_000;

const ORG_SET: ReadonlySet<string> = new Set(PROSPECT_ORGS);
const LEVEL_SET: ReadonlySet<string> = new Set(PROSPECT_LEVELS.map((l) => l.key));
const POSITION_SET: ReadonlySet<string> = new Set(MLB_POSITION_ORDER);
const SORT_SET: ReadonlySet<string> = new Set(PROSPECT_SORTS.map((s) => s.key));
const ROLE_SET: ReadonlySet<string> = new Set(PROSPECT_ROLES.map((r) => r.key));
// Two to forty letters (any script), spaces, apostrophes, hyphens and periods:
// everything a name holds, and nothing that is regex or PostgREST filter syntax
// but the period.
const SEARCH_PATTERN = /^[\p{L} '.-]{2,40}$/u;

// The raw search box text as a filter value: null until it is long enough to
// narrow the list, or when it holds characters no name has.
export function prospectSearch(text: string): string | null {
  const search = text.trim().replace(/\s+/g, " ").toLowerCase();
  return SEARCH_PATTERN.test(search) ? search : null;
}

// Names are stored with their accents ("Moisés Gómez"), and people type
// without them, so each base letter matches its accented forms.
const ACCENTED: Record<string, string> = {
  a: "aáàâäãÁÀÂÄÃ", e: "eéèêëÉÈÊË", i: "iíìîïÍÌÎÏ", o: "oóòôöõÓÒÔÖÕ", u: "uúùûüÚÙÛÜ", n: "nñÑ", c: "cçÇ", y: "yýÿÝ",
};

// A case-insensitive POSIX regex for the name column.
export function prospectSearchRegex(search: string): string {
  return Array.from(search.normalize("NFD").replace(/\p{M}/gu, ""))
    .map((ch) => (ch === "." ? "\\." : ACCENTED[ch] ? `[${ACCENTED[ch]}]` : ch))
    .join("");
}

// Canonical query string: fixed key order and defaults omitted, so one filter
// set is one URL and one CDN entry.
export function prospectQuery(filters: ProspectFilters, offset = 0): string {
  const params = new URLSearchParams();
  if (filters.role) params.set("role", filters.role);
  if (filters.org) params.set("org", filters.org);
  if (filters.level) params.set("level", filters.level);
  if (filters.position) params.set("pos", filters.position);
  if (filters.gradedOnly) params.set("graded", "1");
  if (filters.sort !== "value") params.set("sort", filters.sort);
  if (filters.search) params.set("q", filters.search);
  if (offset > 0) params.set("offset", String(offset));
  return params.toString();
}

// Every value is checked against its whitelist; null means the request is malformed.
export function parseProspectQuery(params: URLSearchParams): { filters: ProspectFilters; offset: number } | null {
  const allowed = new Set(["role", "org", "level", "pos", "graded", "sort", "q", "offset"]);
  for (const key of params.keys()) if (!allowed.has(key)) return null;
  const role = params.get("role");
  const org = params.get("org");
  const level = params.get("level");
  const position = params.get("pos");
  const graded = params.get("graded");
  const sort = params.get("sort") ?? "value";
  const search = params.get("q");
  const offsetText = params.get("offset") ?? "0";
  if (role != null && !ROLE_SET.has(role)) return null;
  if (org != null && !ORG_SET.has(org)) return null;
  if (level != null && !LEVEL_SET.has(level)) return null;
  if (position != null && !POSITION_SET.has(position)) return null;
  if (role != null && position != null && !rolePositions(role as ProspectRole).includes(position)) return null;
  if (graded != null && graded !== "1") return null;
  if (!SORT_SET.has(sort)) return null;
  // Only the canonical form, so one search is one CDN entry.
  if (search != null && prospectSearch(search) !== search) return null;
  if (!/^\d{1,5}$/.test(offsetText)) return null;
  const offset = Number(offsetText);
  if (offset % PROSPECT_PAGE !== 0 || offset > MAX_PROSPECT_OFFSET) return null;
  return {
    filters: { role: role as ProspectRole | null, org, level, position, gradedOnly: graded === "1", sort: sort as ProspectSort, search },
    offset,
  };
}

export function levelLabel(level: string | null): string | null {
  return PROSPECT_LEVELS.find((l) => l.key === level)?.label ?? null;
}

export function isPitcherGroup(position: string): boolean {
  return PITCHER_GROUPS.has(position);
}

export const PEAK_GRADE_TIP =
  "His expected peak, the best three-season stretch of WAR, on the same 20 to 80 scale as the MLB player grades: a 60 projects like today's 60 MLB player at his peak. It is risk-adjusted, so most prospects sit at 35 to 44 and only a few dozen reach 50 or better. The range reflects uncertainty.";

export const P_REGULAR_TIP = "Chance of at least one 2.0-WAR season within seven years.";

export const P_MLB_TIP = "Chance of a season of 100 plate appearances or 40 innings within seven years.";

export const PROSPECT_TRADE_VALUE_TIP =
  "Expected surplus over six control years starting at his ETA, priced at the player model's price of a win and discounted 8 percent a year. Same dollar scale as the player values.";

export const RISK_TIP =
  "Banded on his chance of never reaching the majors, cut at the quartiles of past prospects: safe, medium, high, or extreme.";

export const ETA_TIP = "The season he is expected to reach the majors.";

export const CONTROL_TIP =
  "Six control seasons from his ETA, with his expected control-year WAR spread evenly across them. This is what the trade value prices.";

export const TRAITS_TIP =
  "Relative to other prospects in his pool: 50 is an average prospect, not an average major leaguer. The bar is his percentile.";

export const INPUTS_TIP = "The inputs that moved his peak grade most, as wins above replacement at his peak.";

export const SAMPLE_TIP =
  "Plate appearances or batters faced in the last three seasons, and the share of them with pitch and batted-ball tracking.";

const UNGRADED_REASONS: Record<string, string> = {
  insufficient_sample: "Too little playing time in the last three seasons to grade.",
};

export function ungradedReason(reason: string | null, position: string): string {
  if (reason === "model_not_validated") {
    return `The ${isPitcherGroup(position) ? "pitcher" : "hitter"} model has not passed its validation check yet.`;
  }
  return (reason && UNGRADED_REASONS[reason]) ?? "No grade is published for this player.";
}

const HITTER_TRAITS = ["contact", "discipline", "power", "batted_ball", "speed", "defense", "age_level", "track_record", "pedigree"] as const;
const PITCHER_TRAITS = ["bat_missing", "control", "ground_balls", "contact_quality", "stuff", "role", "age_level", "track_record", "pedigree"] as const;

const TRAIT_TEXT: Record<string, { label: string; tip: string }> = {
  contact: { label: "Contact", tip: "Contact rate, swinging strikes, and strikeouts, each also against his level." },
  discipline: { label: "Discipline", tip: "Walks, how often he swings, and called plus swinging strikes." },
  power: { label: "Power", tip: "Isolated power, home runs, extra-base hits, hard contact, and exit velocity where tracked." },
  batted_ball: { label: "Batted ball", tip: "Ground ball, line drive, fly ball, and popup shares, soft contact, BABIP, and launch angle." },
  speed: { label: "Speed", tip: "Stolen bases and caught stealing." },
  defense: { label: "Defense", tip: "Where he plays: the share of games at each position." },
  age_level: { label: "Age for level", tip: "His age, and how young he is for the levels he played." },
  track_record: { label: "Track record", tip: "Highest level, promotions, playing time, and years as a pro." },
  pedigree: { label: "Pedigree", tip: "Draft round and pick, school type, and handedness." },
  bat_missing: { label: "Bat-missing", tip: "Strikeouts, swinging strikes, called plus swinging strikes, and contact allowed." },
  control: { label: "Control", tip: "Walk rate, overall and against his level." },
  ground_balls: { label: "Ground balls", tip: "Ground ball and fly ball shares." },
  contact_quality: { label: "Contact quality", tip: "Hard and soft contact, BABIP, and home runs allowed, plus exit velocity where tracked." },
  stuff: { label: "Stuff", tip: "Fastball velocity, movement, spin, and extension. Tracked games only." },
  role: { label: "Role", tip: "Share of games started and outs per game." },
};

export function prospectTraits(position: string): { key: string; label: string; tip: string }[] {
  return (isPitcherGroup(position) ? PITCHER_TRAITS : HITTER_TRAITS).map((key) => ({ key, ...TRAIT_TEXT[key] }));
}

const RATE_LABELS: Record<string, string> = {
  k_rate: "Strikeout rate",
  bb_rate: "Walk rate",
  hr_rate: "Home run rate",
  xbh_rate: "Extra-base hit rate",
  swing_rate: "Swing rate",
  contact_rate: "Contact rate",
  swstr_rate: "Swinging-strike rate",
  csw_rate: "Called plus swinging strikes",
  gb_share: "Ground ball share",
  ld_share: "Line drive share",
  fb_share: "Fly ball share",
  pu_share: "Popup share",
  hard_share: "Hard contact share",
  soft_share: "Soft contact share",
  sb_rate: "Stolen base rate",
  cs_rate: "Caught stealing rate",
  babip: "BABIP",
  iso: "Isolated power",
  hbp_rate: "Hit-by-pitch rate",
  foul_share: "Foul share",
  called_rate: "Called-strike rate",
  strike_rate: "Strike rate",
  pitches_per_pa: "Pitches per plate appearance",
  start_share: "Share of games started",
  outs_per_game: "Outs per game",
  k_minus_bb: "Strikeout minus walk rate",
};

const INPUT_LABELS: Record<string, string> = {
  age: "Age",
  age_rel: "Age for level",
  sample_w: "Weighted playing time",
  season_sample: "Playing time this season",
  n_levels: "Levels played",
  top_level_rank: "Highest level",
  top_level_share: "Time at highest level",
  promoted: "Promoted this season",
  career_max_level_rank: "Highest level reached",
  draft_round: "Draft round",
  log_draft_pick: "Draft pick",
  drafted: "Drafted",
  years_pro: "Years as a pro",
  bats_left: "Bats left",
  bats_switch: "Switch hitter",
  throws_left: "Throws left",
  school_high_school: "High school draftee",
  school_college: "College draftee",
  school_international: "International signing",
  school_undrafted: "Undrafted",
  ev90: "90th percentile exit velocity",
  ev_mean: "Average exit velocity",
  hard_hit: "Hard-hit rate",
  la_mean: "Average launch angle",
  fb_velo: "Fastball velocity",
  fb_velo_max: "Peak fastball velocity",
  fb_ivb: "Fastball vertical break",
  fb_hb: "Fastball horizontal break",
  fb_spin: "Fastball spin",
  extension: "Extension",
  whiff_tracked: "Whiff rate (tracked)",
  ev_mean_allowed: "Exit velocity allowed",
  hard_hit_allowed: "Hard-hit rate allowed",
  tracked_bip: "Tracked balls in play",
  tracked_pitches: "Tracked pitches",
};

// Rates arrive raw, against the level ("_rel") or as a trend ("_trend"), and
// positions as "pos_SS": label the stem and say which.
export function inputLabel(input: string): string {
  const direct = INPUT_LABELS[input];
  if (direct) return direct;
  if (input.startsWith("pos_")) return `Games at ${input.slice(4)}`;
  const match = /^(.*?)(_rel|_trend)?$/.exec(input);
  const stem = match?.[1] ?? input;
  const base = RATE_LABELS[stem];
  if (!base) return input.replaceAll("_", " ");
  if (match?.[2] === "_rel") return `${base} vs level`;
  if (match?.[2] === "_trend") return `${base} trend`;
  return base;
}
