import { test } from "node:test";
import assert from "node:assert/strict";
import { footballSeasonStats, footballStatsLine, passerRating, passingEfficiency, type FootballStatsLine } from "./football-season-stats.ts";
import type { SeasonStatsData } from "./season-stats.ts";
import { buildGradedPlayers, type PlayerSeasonStatsRow, type PositionTraitRow } from "./position-grades.ts";

// QB order: games, att, cmp, pass_yds, pass_td, int, sacks, rush_att, rush_yds,
// rush_td, epa_plays, epa_total×10, cpoe×10, adot×10, espn_qbr×10.
const QB = [8, 30, 20, 250, 2, 1, 2, 5, 30, 1, 40, -153, -4, 89, 655];
// DEF order: games, tackles, solo, tfl×10, sacks×10, qb_hits, pressures, pbu,
// int, ff, epa_credit×10, cov_targets, cov_cmp, cov_yds, cov_td, cov_int.
const DEF = [8, 50, 30, 65, 45, 10, 25, 3, 1, 2, 120, null, null, null, null, null];

const line = (positionGroup: string, stats: (number | null)[]): FootballStatsLine => ({ season: 2026, week: 9, positionGroup, stats });
const cell = (data: SeasonStatsData | null, label: string) =>
  data?.tiers.flatMap((tier) => tier.stats).find((stat) => stat.label === label);

test("passerRating matches the NFL formula", () => {
  assert.equal(passerRating(20, 30, 250, 2, 1)?.toFixed(1), "100.7");
  assert.equal(passerRating(30, 30, 450, 5, 0)?.toFixed(1), "158.3");
  assert.equal(passerRating(0, 0, 0, 0, 0), null);
});

test("passingEfficiency matches the NCAA formula", () => {
  assert.equal(passingEfficiency(20, 30, 250, 2, 1), 152);
  assert.equal(passingEfficiency(0, 0, 0, 0, 0), null);
});

test("a line of the wrong length or unknown group decodes to null", () => {
  assert.equal(footballSeasonStats("nfl", line("QB", [1, 2])), null);
  assert.equal(footballSeasonStats("nfl", line("K", [1])), null);
  assert.equal(footballStatsLine({ season: 2026, week: 9, position_group: "QB", stats: "1,2" }), null);
});

test("a QB line decodes counts, scales and derived rates", () => {
  const nfl = footballSeasonStats("nfl", line("QB", QB));
  assert.deepEqual(nfl?.tiers.map((tier) => tier.label), ["Box score", "Advanced"]);
  assert.equal(nfl?.context, "Through week 9 · 8 games");
  assert.equal(cell(nfl, "Cmp/Att")?.value, "20/30");
  assert.equal(cell(nfl, "Cmp%")?.value, "66.7%");
  assert.equal(cell(nfl, "Passer rating")?.value, "100.7");
  assert.equal(cell(nfl, "EPA/play")?.value, "-0.38");
  assert.equal(cell(nfl, "Total EPA")?.value, "-15.3");
  assert.equal(cell(nfl, "CPOE")?.value, "-0.4");
  assert.equal(cell(nfl, "aDOT")?.value, "8.9");
  assert.equal(cell(nfl, "QBR")?.value, "65.5");
  assert.equal(cell(nfl, "Y/A")?.value, "8.3");
  assert.equal(cell(nfl, "Sack%")?.value, "6%");
});

test("CFB QBs get Pass efficiency, NFL QBs get Passer rating", () => {
  const cfb = footballSeasonStats("cfb", line("QB", QB));
  assert.equal(cell(cfb, "Pass efficiency")?.value, "152.0");
  assert.equal(cell(cfb, "Passer rating"), undefined);
});

test("zero denominators show as null cells, not NaN", () => {
  const empty = footballSeasonStats("nfl", line("QB", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, null, null, null]));
  for (const label of ["Cmp%", "Y/A", "EPA/play", "Sack%", "Passer rating"]) {
    assert.equal(cell(empty, label)?.value, null, label);
  }
});

test("scaled negatives keep their sign and never print -0.0", () => {
  const zero = footballSeasonStats("nfl", line("QB", QB.map((v, i) => (i === 12 ? 0 : i === 11 ? -4 : i === 10 ? 1000 : v))));
  assert.equal(cell(zero, "CPOE")?.value, "0.0");
  assert.equal(cell(zero, "EPA/play")?.value, "0.00");
});

test("half sacks and tackles for loss decode from tenths", () => {
  const def = footballSeasonStats("nfl", line("LB", DEF));
  assert.equal(cell(def, "Sacks")?.value, "4.5");
  assert.equal(cell(def, "TFL")?.value, "6.5");
});

test("a null blanks its cell, except from sources that skip players, which leave it off", () => {
  const qb = footballSeasonStats("nfl", line("QB", QB.map((v, i) => (i === 14 || i === 8 ? null : v))));
  assert.equal(cell(qb, "Rush yds")?.value, null);
  assert.equal(cell(qb, "QBR"), undefined);
  assert.equal(cell(qb, "Pass yds")?.value, "250");
  const def = footballSeasonStats("nfl", line("DB", DEF));
  assert.equal(cell(def, "Rating allowed"), undefined);
  assert.equal(cell(def, "Tackles")?.value, "50");
});

test("advanced tips name their source per sport", () => {
  assert.match(cell(footballSeasonStats("nfl", line("QB", QB)), "EPA/play")?.tip ?? "", /From nflfastR play-by-play\.$/);
  assert.match(cell(footballSeasonStats("cfb", line("QB", QB)), "EPA/play")?.tip ?? "", /From CollegeFootballData play-by-play\.$/);
  assert.match(cell(footballSeasonStats("nfl", line("QB", QB)), "QBR")?.tip ?? "", /ESPN's Total QBR\.$/);
});

test("buildGradedPlayers attaches each player's stat line and ignores strays", () => {
  const trait = (athlete_id: string): PositionTraitRow => ({
    season: 2026, week: 9, as_of: "2026-11-01T00:00:00Z", model_version: "v1", athlete_id, athlete_name: athlete_id,
    team: "BUF", position_group: "QB", games: 8, trait: "grade", value: 60, percentile: 80, kind: "quality",
    in_grade: true, uncertainty: 3, points_above_replacement: null,
  });
  const stats = (athlete_id: string): PlayerSeasonStatsRow => ({ athlete_id, season: 2026, week: 9, position_group: "QB", stats: QB });
  const players = buildGradedPlayers([trait("A"), trait("B")], [stats("A"), stats("C")]);
  assert.deepEqual(players.A.seasonStats, { season: 2026, week: 9, positionGroup: "QB", stats: QB });
  assert.equal(players.B.seasonStats, null);
  assert.equal("C" in players, false);
});

test("play-by-play counts name play-by-play, not the box score, as their source", () => {
  const rb = [8, 140, 650, 6, 1, 30, 24, 190, 1, 62, 14, -73, 31, 58];
  const ol = [8, 210, 38, 8170, 290, 14, 81];
  const rec = [8, 80, 55, 720, 5, 280, 256, 112, 95];
  for (const [sport, source] of [["nfl", /From nflfastR play-by-play\.$/], ["cfb", /From CollegeFootballData play-by-play\.$/]] as const) {
    assert.match(cell(footballSeasonStats(sport, line("RB", rb)), "Explosive%")?.tip ?? "", source);
    assert.match(cell(footballSeasonStats(sport, line("OL", ol)), "Stuff%")?.tip ?? "", source);
    assert.match(cell(footballSeasonStats(sport, line("WR", rec)), "Target share")?.tip ?? "", source);
  }
});

test("CFB cards drop coverage cells and label their RYOE as ours", () => {
  const rb = [8, 140, 650, 6, 1, 30, 24, 190, 1, 62, 14, -73, 31, 58];
  const covered = [...DEF.slice(0, 11), 30, 21, 230, 2, 1];
  const labels = (data: SeasonStatsData | null) => data?.tiers[1].stats.map((stat) => stat.label);
  assert.match(cell(footballSeasonStats("cfb", line("RB", rb)), "RYOE/carry")?.tip ?? "", /No player tracking.*Computed by our model\.$/);
  assert.match(cell(footballSeasonStats("nfl", line("RB", rb)), "RYOE/carry")?.tip ?? "", /From NFL Next Gen Stats\.$/);
  assert.deepEqual(labels(footballSeasonStats("cfb", line("DB", covered))), ["Sacks + hurries", "EPA credit"]);
  assert.equal(labels(footballSeasonStats("nfl", line("DB", covered)))?.length, 6);
});

const LINES: Record<string, (number | null)[]> = {
  QB, DL: DEF, LB: DEF, DB: DEF,
  RB: [8, 140, 650, 6, 1, 30, 24, 190, 1, 62, 14, -73, 31, 58],
  WR: [8, 80, 55, 720, 5, 280, 256, 112, 95],
  TE: [8, 50, 38, 410, 3, 210, 165, 71, 40],
  OL: [8, 210, 38, 8170, 290, 14, 81],
  P: [8, 32, 1520, 1340, 14, 3, -12],
};
const labelsOf = (data: SeasonStatsData | null) => data?.tiers.flatMap((tier) => tier.stats.map((stat) => stat.label)) ?? [];

test("CFB cards leave off what college data does not record", () => {
  const cfb = (group: string) => labelsOf(footballSeasonStats("cfb", line(group, LINES[group])));
  for (const label of ["CPOE", "aDOT"]) assert.equal(cfb("QB").includes(label), false, label);
  assert.equal(cfb("QB").includes("QBR"), true);
  for (const label of ["aDOT", "YAC/rec"]) assert.equal(cfb("WR").includes(label), false, label);
  for (const label of ["QB hits", "Pressures"]) assert.equal(cfb("LB").includes(label), false, label);
  assert.equal(cfb("LB").includes("Sacks + hurries"), true);
  assert.equal(cfb("OL").includes("Pressures allowed"), false);
  assert.equal(cfb("OL").includes("Sacks + hurries allowed"), true);
  assert.match(cell(footballSeasonStats("cfb", line("LB", DEF)), "Sacks + hurries")?.tip ?? "", /hits.*From ESPN box scores\.$/);
  assert.deepEqual(footballSeasonStats("cfb", line("P", LINES.P))?.tiers.map((tier) => tier.label), ["Box score"]);
  for (const label of ["CPOE", "aDOT", "QBR"]) assert.equal(labelsOf(footballSeasonStats("nfl", line("QB", QB))).includes(label), true, label);
});

test("every Advanced cell shown names a source", () => {
  for (const sport of ["cfb", "nfl"] as const) {
    for (const [group, stats] of Object.entries(LINES)) {
      for (const stat of footballSeasonStats(sport, line(group, stats))?.tiers[1]?.stats ?? []) {
        assert.match(stat.tip, /(Computed from the box score|From nflfastR play-by-play|From CollegeFootballData play-by-play|Computed by our model|ESPN's Total QBR|From NFL Next Gen Stats|From Pro Football Reference|From ESPN box scores)\.$/, `${sport} ${group} ${stat.label}`);
      }
    }
  }
});
