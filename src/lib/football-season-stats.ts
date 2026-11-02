// Season stat lines beneath the CFB and NFL grade cards, from each sport's
// player_season_stats. The key order and scales are the contract with the
// momentumcfb and momentumnfl publishers and must stay in step with them; a
// key marked ":10" is stored in tenths. Ratios of stored counts are derived
// here so a rate can never disagree with its own counts. Pure: the server
// passes each raw line through footballStatsLine, and the card decodes it.

import type { SeasonStat, SeasonStatsData } from "./season-stats.ts";
import type { GradeSport } from "./position-traits.ts";
import { formatSigned } from "./utils.ts";

export interface FootballStatsLine {
  season: number;
  week: number;
  positionGroup: string;
  stats: (number | null)[];
}

const KEYS = {
  QB: ["games", "att", "cmp", "pass_yds", "pass_td", "int", "sacks", "rush_att", "rush_yds", "rush_td", "epa_plays", "epa_total:10", "cpoe:10", "adot:10", "espn_qbr:10"],
  RB: ["games", "rush_att", "rush_yds", "rush_td", "fumbles_lost", "targets", "rec", "rec_yds", "rec_td", "rush_success", "rush_explosive", "ryoe_total:10", "rush_epa:10", "epa_total:10"],
  REC: ["games", "targets", "rec", "rec_yds", "rec_td", "yac", "target_share:10", "adot:10", "epa_total:10"],
  DEF: ["games", "tackles", "solo", "tfl:10", "sacks:10", "qb_hits", "pressures", "pbu", "int", "ff", "epa_credit:10", "cov_targets", "cov_cmp", "cov_yds", "cov_td", "cov_int"],
  OL: ["games", "rush_att", "stuffs", "line_yds:10", "dropbacks", "sacks_allowed", "pressures_allowed"],
  P: ["games", "punts", "punt_yds", "net_yds", "inside_20", "touchbacks", "punt_epa:10"],
} as const;

type StatGroup = keyof typeof KEYS;

const GROUP_OF: Record<string, StatGroup> = {
  QB: "QB", RB: "RB", WR: "REC", TE: "REC", DL: "DEF", LB: "DEF", DB: "DEF", OL: "OL", P: "P",
};

// Where each Advanced value comes from, named at the end of its tip. Values
// our own models compute say so (René's condition for showing them, 2026-11-02).
// A sport missing from an entry has no data for it, so its cells are left off
// rather than shown as a permanent blank. CFBD play-by-play has no air yards,
// completion probability, QB hits, coverage charting or punt EPA; CFB season
// QBR and pressures are not published yet.
type Source = "box" | "nflfastr" | "cfbd" | "model" | "espn" | "ngs" | "pfr";

const SOURCE_TEXT: Record<Source, string> = {
  box: "Computed from the box score.",
  nflfastr: "From nflfastR play-by-play.",
  model: "Computed by our model.",
  espn: "ESPN's Total QBR.",
  ngs: "From NFL Next Gen Stats.",
  pfr: "From Pro Football Reference.",
  cfbd: "From CollegeFootballData play-by-play.",
};

const SOURCES: Record<string, Partial<Record<GradeSport, Source>>> = {
  box: { cfb: "box", nfl: "box" },
  epa: { cfb: "cfbd", nfl: "nflfastr" },
  pbp: { cfb: "cfbd", nfl: "nflfastr" },
  ryoe: { cfb: "model", nfl: "ngs" },
  credit: { cfb: "model", nfl: "model" },
  cpoe: { nfl: "nflfastr" },
  air: { nfl: "nflfastr" },
  hits: { nfl: "nflfastr" },
  puntEpa: { nfl: "nflfastr" },
  qbr: { nfl: "espn" },
  pressure: { nfl: "pfr" },
  coverage: { nfl: "pfr" },
};

type Raw = Record<string, number | null>;

export function footballStatsLine(
  row: { season: number; week: number; position_group: string; stats: unknown } | null | undefined
): FootballStatsLine | null {
  if (!row || !Array.isArray(row.stats)) return null;
  return { season: row.season, week: row.week, positionGroup: row.position_group, stats: row.stats as (number | null)[] };
}

// NFL passer rating: four components, each clamped to 0..2.375.
export function passerRating(cmp: number, att: number, yds: number, td: number, int: number): number | null {
  if (!att) return null;
  const clamp = (v: number) => Math.min(Math.max(v, 0), 2.375);
  const parts = [(cmp / att - 0.3) * 5, (yds / att - 3) * 0.25, (td / att) * 20, 2.375 - (int / att) * 25];
  return (parts.reduce((sum, part) => sum + clamp(part), 0) / 6) * 100;
}

// NCAA passing efficiency.
export function passingEfficiency(cmp: number, att: number, yds: number, td: number, int: number): number | null {
  if (!att) return null;
  return (8.4 * yds + 330 * td + 100 * cmp - 200 * int) / att;
}

function unpack(stats: (number | null)[], keys: readonly string[]): Raw | null {
  if (stats.length !== keys.length) return null;
  return Object.fromEntries(
    keys.map((key, i) => {
      const [name, scale] = key.split(":");
      const value = stats[i] ?? null;
      return [name, value == null || !scale ? value : value / Number(scale)];
    })
  );
}

const count = (v: number | null) => (v == null ? null : v.toLocaleString("en-US"));
const fixed = (v: number | null, digits: number) =>
  v == null ? null : Number(v.toFixed(digits)) === 0 ? (0).toFixed(digits) : v.toFixed(digits);
const signed = (v: number | null, digits: number) => (v == null ? null : formatSigned(v, digits));
const ratio = (num: number | null, den: number | null) => (num == null || !den ? null : num / den);
const pct = (v: number | null, digits: number) => (v == null ? null : `${fixed(100 * v, digits)}%`);
const sum = (a: number | null, b: number | null) => (a == null || b == null ? null : a + b);

function rating(s: Raw, keys: [string, string, string, string, string], formula: typeof passerRating): number | null {
  const [cmp, att, yds, td, int] = keys.map((key) => s[key]);
  if (cmp == null || att == null || yds == null || td == null || int == null) return null;
  return formula(cmp, att, yds, td, int);
}

type Tiers = { box: (SeasonStat | null)[]; advanced: (SeasonStat | null)[] };

function build(group: StatGroup, s: Raw, sport: GradeSport): Tiers {
  // A box score cell that only some feeds carry names its source to be left
  // off where the sport lacks it; its tip stays plain.
  const stat = (label: string, value: string | null, tip: string, needs?: keyof typeof SOURCES): SeasonStat | null =>
    needs && !SOURCES[needs][sport] ? null : { label, value, tip };
  const adv = (label: string, value: string | null, tip: string, source: keyof typeof SOURCES): SeasonStat | null => {
    const from = SOURCES[source][sport];
    return from ? { label, value, tip: `${tip} ${SOURCE_TEXT[from]}` } : null;
  };

  switch (group) {
    case "QB": {
      const passRating = fixed(rating(s, ["cmp", "att", "pass_yds", "pass_td", "int"], sport === "nfl" ? passerRating : passingEfficiency), 1);
      return {
        box: [
          stat("Cmp/Att", s.cmp == null || s.att == null ? null : `${count(s.cmp)}/${count(s.att)}`, "Completions and pass attempts."),
          stat("Cmp%", pct(ratio(s.cmp, s.att), 1), "Completions divided by attempts."),
          stat("Pass yds", count(s.pass_yds), "Passing yards."),
          stat("Pass TD", count(s.pass_td), "Passing touchdowns."),
          stat("INT", count(s.int), "Interceptions thrown."),
          stat("Sacks", count(s.sacks), "Times sacked."),
          stat("Rush yds", count(s.rush_yds), "Rushing yards, including scrambles."),
          stat("Rush TD", count(s.rush_td), "Rushing touchdowns."),
        ],
        advanced: [
          sport === "nfl"
            ? adv("Passer rating", passRating, "The NFL passer rating, from completions, yards, touchdowns and interceptions per attempt. 158.3 is perfect.", "box")
            : adv("Pass efficiency", passRating, "The NCAA passing efficiency rating, from completions, yards, touchdowns and interceptions per attempt.", "box"),
          adv("QBR", fixed(s.espn_qbr, 1), "Quarterback rating on a 0 to 100 scale, adjusted for game situation.", "qbr"),
          adv("EPA/play", signed(ratio(s.epa_total, s.epa_plays), 2), "Expected points added per dropback or designed run, not adjusted for the defense.", "epa"),
          adv("Total EPA", signed(s.epa_total, 1), "Expected points added over the same plays.", "epa"),
          adv("CPOE", signed(s.cpoe, 1), "Completion percentage above what the throws' difficulty predicts, in percentage points.", "cpoe"),
          adv("aDOT", fixed(s.adot, 1), "Average depth of target: air yards per attempt.", "air"),
          adv("Y/A", fixed(ratio(s.pass_yds, s.att), 1), "Passing yards per attempt.", "box"),
          adv("Sack%", pct(ratio(s.sacks, sum(s.att, s.sacks)), 0), "Sacks divided by attempts plus sacks.", "box"),
        ],
      };
    }
    case "RB":
      return {
        box: [
          stat("Carries", count(s.rush_att), "Rushing attempts."),
          stat("Rush yds", count(s.rush_yds), "Rushing yards."),
          stat("YPC", fixed(ratio(s.rush_yds, s.rush_att), 1), "Rushing yards per carry."),
          stat("Rush TD", count(s.rush_td), "Rushing touchdowns."),
          stat("Rec", count(s.rec), "Receptions."),
          stat("Rec yds", count(s.rec_yds), "Receiving yards."),
          stat("Rec TD", count(s.rec_td), "Receiving touchdowns."),
          stat("Fum lost", count(s.fumbles_lost), "Fumbles lost."),
        ],
        advanced: [
          adv("EPA/carry", signed(ratio(s.rush_epa, s.rush_att), 2), "Expected points added per carry, not adjusted for the defense.", "epa"),
          adv("Total EPA", signed(s.epa_total, 1), "Expected points added rushing and receiving.", "epa"),
          adv("Success%", pct(ratio(s.rush_success, s.rush_att), 0), "Share of carries with positive expected points added.", "epa"),
          adv("Explosive%", pct(ratio(s.rush_explosive, s.rush_att), 0), "Share of carries gaining 10 or more yards.", "pbp"),
          adv(
            "RYOE/carry",
            signed(ratio(s.ryoe_total, s.rush_att), 1),
            sport === "nfl"
              ? "Rushing yards over what the blocking and defenders' positions predicted, per carry."
              : "Rushing yards over what the down, distance, field position and run defense predicted, per carry. No player tracking, so it can't see the blocking.",
            "ryoe"
          ),
          adv("Catch%", pct(ratio(s.rec, s.targets), 0), "Receptions divided by targets.", "box"),
        ],
      };
    case "REC":
      return {
        box: [
          stat("Targets", count(s.targets), "Passes thrown his way."),
          stat("Rec", count(s.rec), "Receptions."),
          stat("Rec yds", count(s.rec_yds), "Receiving yards."),
          stat("Rec TD", count(s.rec_td), "Receiving touchdowns."),
          stat("Catch%", pct(ratio(s.rec, s.targets), 0), "Receptions divided by targets."),
          stat("Y/Rec", fixed(ratio(s.rec_yds, s.rec), 1), "Receiving yards per reception."),
        ],
        advanced: [
          adv("Target share", s.target_share == null ? null : `${fixed(s.target_share, 1)}%`, "Share of team targets in games he played.", "pbp"),
          adv("aDOT", fixed(s.adot, 1), "Average depth of target: air yards per target.", "air"),
          adv("YAC/rec", fixed(ratio(s.yac, s.rec), 1), "Yards after the catch per reception.", "air"),
          adv("EPA/target", signed(ratio(s.epa_total, s.targets), 2), "Expected points added per target, not adjusted for the defense.", "epa"),
          adv("Total EPA", signed(s.epa_total, 1), "Expected points added on his targets.", "epa"),
        ],
      };
    case "DEF":
      return {
        box: [
          stat("Tackles", count(s.tackles), "Total tackles."),
          stat("Solo", count(s.solo), "Solo tackles."),
          stat("TFL", fixed(s.tfl, 1), "Tackles for loss; shared ones count half."),
          stat("Sacks", fixed(s.sacks, 1), "Sacks; shared ones count half."),
          stat("QB hits", count(s.qb_hits), "Hits on the quarterback as or after he throws.", "hits"),
          stat("PBU", count(s.pbu), "Passes broken up."),
          stat("INT", count(s.int), "Interceptions."),
          stat("FF", count(s.ff), "Forced fumbles."),
        ],
        advanced: [
          adv("Pressures", count(s.pressures), "Sacks, hits and hurries on the quarterback.", "pressure"),
          adv("EPA credit", signed(s.epa_credit, 1), "Expected points taken away from the offense on plays credited to him.", "credit"),
          adv("Targets allowed", count(s.cov_targets), "Passes thrown at the receiver he covered.", "coverage"),
          adv("Cmp% allowed", pct(ratio(s.cov_cmp, s.cov_targets), 1), "Completions allowed divided by targets.", "coverage"),
          adv("Yds allowed", count(s.cov_yds), "Receiving yards allowed in coverage.", "coverage"),
          adv("Rating allowed", fixed(rating(s, ["cov_cmp", "cov_targets", "cov_yds", "cov_td", "cov_int"], passerRating), 1), "NFL passer rating on throws into his coverage. Lower is better.", "coverage"),
        ],
      };
    case "OL":
      return {
        box: [
          stat("Carries", count(s.rush_att), "Team carries behind this line."),
          stat("Dropbacks", count(s.dropbacks), "Team dropbacks behind this line."),
          stat("Sacks allowed", count(s.sacks_allowed), "Sacks of the team's passers."),
          stat("Pressures allowed", count(s.pressures_allowed), "Sacks, hits and hurries allowed.", "pressure"),
        ],
        advanced: [
          adv("Stuff%", pct(ratio(s.stuffs, s.rush_att), 0), "Share of carries stopped at or behind the line.", "pbp"),
          adv("Line yds/carry", fixed(ratio(s.line_yds, s.rush_att), 1), "Rushing yards credited to the line per carry: losses count extra and gains past 10 yards don't count.", "pbp"),
          adv("Sack%", pct(ratio(s.sacks_allowed, s.dropbacks), 0), "Sacks allowed divided by dropbacks.", "box"),
        ],
      };
    case "P":
      return {
        box: [
          stat("Punts", count(s.punts), "Punts."),
          stat("Avg", fixed(ratio(s.punt_yds, s.punts), 1), "Gross yards per punt."),
          stat("Net avg", fixed(ratio(s.net_yds, s.punts), 1), "Yards per punt after returns and touchbacks."),
          stat("Inside 20", count(s.inside_20), "Punts downed inside the opponent's 20."),
          stat("Touchbacks", count(s.touchbacks), "Punts into the end zone."),
        ],
        advanced: [adv("EPA/punt", signed(ratio(s.punt_epa, s.punts), 2), "Expected points added per punt.", "puntEpa")],
      };
  }
}

export function footballSeasonStats(sport: GradeSport, line: FootballStatsLine | null | undefined): SeasonStatsData | null {
  if (!line) return null;
  const group = GROUP_OF[line.positionGroup];
  if (!group) return null;
  const raw = unpack(line.stats, KEYS[group]);
  if (!raw) return null;
  const { box, advanced } = build(group, raw, sport);
  const games = raw.games == null ? "" : ` · ${count(raw.games)} ${raw.games === 1 ? "game" : "games"}`;
  return {
    season: line.season,
    context: `Through week ${line.week}${games}`,
    tiers: [
      { label: "Box score", stats: box.filter((stat) => stat != null) },
      { label: "Advanced", stats: advanced.filter((stat) => stat != null) },
    ].filter((tier) => tier.stats.length > 0),
    note: "Raw season totals and rates. Traits above are opponent-adjusted unless their tip says otherwise.",
  };
}
