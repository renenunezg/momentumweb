// Season stat lines beneath the player and prospect grades, from
// mlb.player_season_stats. The array order and scales are mlbmodel's
// (v2/season_stats.py BAT and PIT) and must stay in step with them. Pure, so
// the cards and the server reads share one definition.

import { levelLabel } from "@/lib/prospect-values";
import { EMPTY } from "@/lib/utils";

export interface SeasonStatsLine {
  season: number;
  levels: string | null;
  stats: (number | null)[];
}

export interface BaseballStat {
  label: string;
  value: string | null;
  tip: string;
}

export interface BaseballSeasonStatsData {
  season: number;
  level: string;
  sample: string;
  production: BaseballStat[];
  underlying: BaseballStat[];
  trackingNote: string;
}

const BAT = ["pa", "war", "avg", "obp", "slg", "ops", "hr", "rbi", "sb", "k", "bb", "xwoba", "barrel", "hard_hit", "ev", "la", "chase", "ev90", "bbe"] as const;
const PIT = ["bf", "outs", "war", "era", "fip", "whip", "k", "bb", "hr", "whiff", "fb_velo", "gb", "xwoba", "hard_hit", "bbe", "pitches"] as const;

type Raw = Record<string, number | null>;

// A line of the wrong length is a contract break: no stats rather than mislabeled ones.
export function seasonStatsLine(row: { season: number; levels: string | null; stats: unknown } | null | undefined): SeasonStatsLine | null {
  if (!row || !Array.isArray(row.stats)) return null;
  return { season: row.season, levels: row.levels, stats: row.stats as (number | null)[] };
}

function unpack(stats: (number | null)[], keys: readonly string[]): Raw | null {
  if (stats.length !== keys.length) return null;
  return Object.fromEntries(keys.map((key, i) => [key, stats[i] ?? null]));
}

const stat = (label: string, value: string | null, tip: string): BaseballStat => ({ label, value, tip });
const count = (v: number | null) => (v == null ? null : v.toLocaleString("en-US"));
const fixed = (v: number | null, scale: number, digits: number) => (v == null ? null : (v / scale).toFixed(digits));
// Batting-average style: .286, or 1.133 once past one.
const rate = (v: number | null) => (v == null ? null : v >= 1000 ? (v / 1000).toFixed(3) : `.${String(v).padStart(3, "0")}`);
const tenthsPct = (v: number | null) => (v == null ? null : `${(v / 10).toFixed(1)}%`);
const share = (num: number | null, den: number | null) => (num == null || !den ? null : (100 * num) / den);
const pct = (v: number | null) => (v == null ? null : `${v.toFixed(1)}%`);
const innings = (outs: number) => `${Math.floor(outs / 3)}.${outs % 3}`;

function levelText(line: SeasonStatsLine, prospect: boolean): string {
  if (!prospect) return "MLB";
  const levels = (line.levels ?? "").split(",").filter(Boolean);
  return levels.map((level) => levelLabel(level) ?? level.toUpperCase()).join(" · ") || "Minors";
}

function hitter(s: Raw, prospect: boolean): Pick<BaseballSeasonStatsData, "sample" | "production" | "underlying" | "trackingNote"> {
  const pa = s.pa ?? 0;
  return {
    sample: `${count(pa)} PA`,
    production: [
      prospect
        ? stat("PA", count(s.pa), "Plate appearances at the levels listed above.")
        : stat("fWAR", fixed(s.war, 10, 1), "FanGraphs wins above replacement for this season. Not the model's projected WAR."),
      stat("AVG", rate(s.avg), "Hits divided by at-bats."),
      stat("OBP", rate(s.obp), "How often he reaches base by hit, walk or hit by pitch."),
      stat("SLG", rate(s.slg), "Total bases per at-bat."),
      stat("OPS", rate(s.ops), "On-base percentage plus slugging percentage."),
      stat("HR", count(s.hr), "Home runs this season."),
      stat("RBI", count(s.rbi), "Runs batted in. Opportunity depends on teammates and lineup position."),
      stat("SB", count(s.sb), "Stolen bases this season."),
    ],
    underlying: [
      prospect
        ? stat("EV90", fixed(s.ev90, 10, 1), "90th percentile exit velocity in mph. Shows the harder end of his tracked contact. Needs 15 tracked batted balls.")
        : stat("xwOBA", rate(s.xwoba), "Expected offensive value using contact quality, strikeouts and walks. Not park-adjusted or a future projection."),
      stat("Barrel%", tenthsPct(s.barrel), "Share of tracked batted balls in Statcast's barrel combinations of exit speed and launch angle."),
      stat("Hard-hit%", tenthsPct(s.hard_hit), "Share of tracked batted balls hit at least 95 mph."),
      stat("Avg EV", fixed(s.ev, 10, 1), "Average exit velocity in mph across tracked batted balls."),
      stat("Avg LA", s.la == null ? null : `${(s.la / 10).toFixed(1)}°`, "Average launch angle across tracked batted balls. Higher is not always better."),
      stat("K%", pct(share(s.k, pa)), "Strikeouts divided by plate appearances."),
      stat("BB%", pct(share(s.bb, pa)), "Walks divided by plate appearances."),
      stat("Chase%", tenthsPct(s.chase), "Swings at pitches outside the strike zone divided by pitches seen outside the zone."),
    ],
    trackingNote: prospect
      ? s.bbe
        ? `Tracking sample: ${count(s.bbe)} batted balls. Tracking stats cover measured games only; unavailable metrics show ${EMPTY}.`
        : `No tracked games this season, so tracking stats show ${EMPTY}.`
      : "Exit velocity in mph; launch angle in degrees. Tracking stats are from Statcast.",
  };
}

function pitcher(s: Raw, prospect: boolean): Pick<BaseballSeasonStatsData, "sample" | "production" | "underlying" | "trackingNote"> {
  const bf = s.bf ?? 0;
  const k = share(s.k, bf);
  const bb = share(s.bb, bf);
  const tracked = [s.bbe ? `${count(s.bbe)} batted balls` : null, s.pitches ? `${count(s.pitches)} pitches` : null].filter(Boolean);
  return {
    sample: `${innings(s.outs ?? 0)} IP · ${count(bf)} BF`,
    production: [
      stat("fWAR", prospect ? null : fixed(s.war, 10, 1), "FanGraphs wins above replacement for this season. Not the model's projected WAR. Unavailable here for minor leaguers."),
      stat("ERA", fixed(s.era, 100, 2), "Earned runs allowed per nine innings."),
      stat("FIP", fixed(s.fip, 100, 2), "Pitching estimate based on strikeouts, walks, hit batters and home runs, on the league's ERA scale. Lower is better."),
      stat("WHIP", fixed(s.whip, 100, 2), "Walks plus hits allowed per inning."),
      stat("IP", s.outs == null ? null : innings(s.outs), "Innings pitched. The .2 means two outs, not two tenths of an inning."),
      stat("K", count(s.k), "Total strikeouts."),
      stat("BB", count(s.bb), "Total walks allowed."),
      stat("HR", count(s.hr), "Home runs allowed."),
    ],
    underlying: [
      stat("K%", pct(k), "Strikeouts divided by batters faced."),
      stat("BB%", pct(bb), "Walks divided by batters faced."),
      stat("K−BB%", k == null || bb == null ? null : pct(k - bb), "Strikeout rate minus walk rate, in percentage points. Higher means more strikeouts relative to walks."),
      stat("Whiff%", tenthsPct(s.whiff), prospect ? "Misses divided by swings, from games with a full pitch-by-pitch log." : "Misses divided by swings."),
      stat("FB velo", fixed(s.fb_velo, 10, 1), "Average fastball velocity in mph, from tracked pitches."),
      stat("GB%", tenthsPct(s.gb), "Ground balls as a share of batted balls."),
      stat("xwOBA", prospect ? null : rate(s.xwoba), "Expected wOBA allowed based on contact quality plus strikeouts and walks. Lower is better. Not a projection."),
      stat("Hard-hit%", tenthsPct(s.hard_hit), "Share of tracked batted balls allowed with exit velocity of at least 95 mph. Lower is better."),
    ],
    trackingNote: prospect
      ? tracked.length
        ? `Tracking sample: ${tracked.join(" · ")}. Tracking stats cover measured games only; unavailable metrics show ${EMPTY}.`
        : `No tracked games this season, so tracking stats show ${EMPTY}.`
      : "Fastball velocity in mph. Tracking stats are from Statcast.",
  };
}

export function seasonStats(line: SeasonStatsLine | null | undefined, isPitcher: boolean, prospect: boolean): BaseballSeasonStatsData | null {
  if (!line) return null;
  const raw = unpack(line.stats, isPitcher ? PIT : BAT);
  if (!raw) return null;
  return {
    season: line.season,
    level: levelText(line, prospect),
    ...(isPitcher ? pitcher(raw, prospect) : hitter(raw, prospect)),
  };
}
