// Season stat lines beneath the NHL grade cards, from nhl.player_season_stats.
// The key order and scales are momentumnhl's (backend/players/season_stats.py
// SKATER_LINE and GOALIE_LINE) and must stay in step with it; a key marked
// ":10" is stored in tenths. Rates are derived here from the stored counts so a
// rate can never disagree with its own counts. Pure, like the football decoder.

import type { FootballStatsLine } from "./football-season-stats.ts";
import type { SeasonStat, SeasonStatsData } from "./season-stats.ts";
import { formatSigned } from "./utils.ts";

const SKATER = [
  "games", "goals", "assists", "points", "shots", "pim", "hits", "blocks",
  "toi:10", "toi_pp:10", "toi_pk:10", "ixg:10", "faceoffs_won", "faceoffs_lost",
  "cf_5v5", "ca_5v5", "xgf_5v5:10", "xga_5v5:10", "oz_starts", "dz_starts",
] as const;
const GOALIE = ["games", "toi:10", "shots_against", "ga", "xga:10", "hd_shots", "hd_ga"] as const;

// Fewer faceoffs than this and the percentage is left off: most defensemen and
// wingers take a handful.
const MIN_FACEOFFS = 20;

type Raw = Record<string, number>;

function unpack(stats: (number | null)[], keys: readonly string[]): Raw | null {
  if (stats.length !== keys.length || stats.some((v) => v == null)) return null;
  return Object.fromEntries(
    keys.map((key, i) => {
      const [name, scale] = key.split(":");
      return [name, (stats[i] as number) / (scale ? Number(scale) : 1)];
    })
  );
}

const stat = (label: string, value: string | null, tip: string | null): SeasonStat => ({ label, value, tip });
const count = (v: number) => v.toLocaleString("en-US");
const ratio = (num: number, den: number) => (den ? num / den : null);
const pct = (v: number | null) => (v == null ? null : `${(100 * v).toFixed(1)}%`);
const fixed = (v: number | null, digits: number) => (v == null ? null : v.toFixed(digits));
// Save percentage style: .912, or 1.000.
const savePct = (v: number | null) => (v == null ? null : v >= 1 ? "1.000" : v.toFixed(3).slice(1));
// Minutes as m:ss.
function clock(minutes: number | null): string | null {
  if (minutes == null) return null;
  const seconds = Math.round(minutes * 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function skater(s: Raw): { box: SeasonStat[]; advanced: SeasonStat[] } {
  const faceoffs = s.faceoffs_won + s.faceoffs_lost;
  return {
    box: [
      stat("Goals", count(s.goals), null),
      stat("Assists", count(s.assists), null),
      stat("Points", count(s.points), null),
      stat("Shots", count(s.shots), "Shots on goal, goals included."),
      stat("Shot%", pct(ratio(s.goals, s.shots)), "Goals divided by shots on goal."),
      stat("PIM", count(s.pim), "Penalty minutes."),
      stat("Hits", count(s.hits), null),
      stat("Blocks", count(s.blocks), "Opponent shots he blocked."),
    ],
    advanced: [
      stat("TOI/GP", clock(ratio(s.toi, s.games)), "Ice time per game in all situations."),
      stat("PP TOI/GP", clock(ratio(s.toi_pp, s.games)), "Ice time per game at 5 on 4."),
      stat("PK TOI/GP", clock(ratio(s.toi_pk, s.games)), "Ice time per game at 4 on 5."),
      stat("ixG", fixed(s.ixg, 1), "Expected goals from his own shots: what an average shooter scores from the same chances."),
      stat("5v5 xGF%", pct(ratio(s.xgf_5v5, s.xgf_5v5 + s.xga_5v5)), "His team's share of expected goals while he is on the ice at 5 on 5. Not adjusted for linemates or opponents."),
      stat("5v5 CF%", pct(ratio(s.cf_5v5, s.cf_5v5 + s.ca_5v5)), "His team's share of shot attempts while he is on the ice at 5 on 5."),
      stat("5v5 OZ start%", pct(ratio(s.oz_starts, s.oz_starts + s.dz_starts)), "Offensive-zone shift starts divided by offensive plus defensive-zone starts at 5 on 5. High means sheltered, offense-first usage."),
      ...(faceoffs >= MIN_FACEOFFS ? [stat("FO%", pct(s.faceoffs_won / faceoffs), "Faceoffs won divided by faceoffs taken.")] : []),
    ],
  };
}

function goalie(s: Raw): { box: SeasonStat[]; advanced: SeasonStat[] } {
  const saved = s.xga - s.ga;
  return {
    box: [
      stat("Shots against", count(s.shots_against), "Shots on goal he faced."),
      stat("Saves", count(s.shots_against - s.ga), null),
      stat("GA", count(s.ga), "Goals against."),
      stat("SV%", savePct(ratio(s.shots_against - s.ga, s.shots_against)), "Saves divided by shots on goal faced."),
      stat("GAA", fixed(ratio(60 * s.ga, s.toi), 2), "Goals against per 60 minutes."),
    ],
    advanced: [
      stat("xGA", fixed(s.xga, 1), "Goals an average goalie allows on the same unblocked shots, from where and how they were taken."),
      stat("GSAx", formatSigned(saved, 1), "Expected goals against less goals against: goals saved above an average goalie. The grade reads the same measure per 60 minutes, weighted toward recent games and shrunk toward average."),
      stat("xSV%", savePct(ratio(s.shots_against - s.xga, s.shots_against)), "The save percentage an average goalie would post on his shots."),
      stat("HD SV%", savePct(ratio(s.hd_shots - s.hd_ga, s.hd_shots)), "Save percentage on high-danger shots, the most likely to score by expected goals."),
    ],
  };
}

export function hockeySeasonStats(line: FootballStatsLine | null | undefined): SeasonStatsData | null {
  if (!line) return null;
  const isGoalie = line.positionGroup === "G";
  if (!isGoalie && line.positionGroup !== "F" && line.positionGroup !== "D") return null;
  const raw = unpack(line.stats, isGoalie ? GOALIE : SKATER);
  if (!raw) return null;
  const { box, advanced } = isGoalie ? goalie(raw) : skater(raw);
  return {
    season: `${line.season}-${String((line.season + 1) % 100).padStart(2, "0")}`,
    context: `Regular season · ${count(raw.games)} ${raw.games === 1 ? "game" : "games"}${isGoalie ? ` · ${count(Math.round(raw.toi))} min` : ""}`,
    tiers: [
      { label: "Box score", stats: box },
      { label: "Advanced", stats: advanced },
    ],
    note: "Raw season totals and rates from MoneyPuck game logs, all situations unless marked 5v5. The grade and bars above are ratings: linemates, opponents and usage are held constant there, not here.",
  };
}
