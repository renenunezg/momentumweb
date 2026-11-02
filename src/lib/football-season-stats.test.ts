import { test } from "node:test";
import assert from "node:assert/strict";
import { footballSeasonStats, footballStatsLine, passerRating, passingEfficiency, type FootballStatsLine } from "./football-season-stats.ts";
import type { SeasonStatsData } from "./season-stats.ts";

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

test("null entries blank one cell and keep the rest", () => {
  const cfb = footballSeasonStats("cfb", line("QB", QB.map((v, i) => (i === 14 ? null : v))));
  assert.equal(cell(cfb, "QBR")?.value, null);
  assert.equal(cell(cfb, "Pass yds")?.value, "250");
  const def = footballSeasonStats("cfb", line("DB", DEF));
  assert.equal(cell(def, "Rating allowed")?.value, null);
  assert.equal(cell(def, "Tackles")?.value, "50");
});

test("advanced tips name their source per sport", () => {
  assert.match(cell(footballSeasonStats("nfl", line("QB", QB)), "EPA/play")?.tip ?? "", /From nflfastR play-by-play\.$/);
  assert.match(cell(footballSeasonStats("cfb", line("QB", QB)), "EPA/play")?.tip ?? "", /Computed by our model\.$/);
  assert.match(cell(footballSeasonStats("cfb", line("QB", QB)), "QBR")?.tip ?? "", /ESPN's Total QBR\.$/);
});
