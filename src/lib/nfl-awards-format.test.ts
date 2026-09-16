import { test } from "node:test";
import assert from "node:assert/strict";
import { seasonLine, trajectorySeries } from "./nfl-awards-format.ts";

test("season lines follow the position's production and fall back to an en dash", () => {
  assert.equal(seasonLine({ position: "QB", games: 2, season_stats: { passing_yards: 612, passing_tds: 5, passing_interceptions: 1, rushing_yards: 44, rushing_tds: 1 } }),
    "612 pass yds, 5 TD, 1 INT · 44 rush yds, 1 TD");
  assert.equal(seasonLine({ position: "LB", games: 2, season_stats: { def_tackles_solo: 11, def_sacks: 2.5, def_interceptions: 0, def_fumbles_forced: 1, rushing_yards: 0 } }),
    "11 tkl, 2.5 sacks, 0 INT · 1 FF");
  assert.equal(seasonLine({ position: "HC", games: 3, season_stats: { wins: 2, ties: 0, point_margin: 7.33 } }), "2-1, +7.3 margin");
  assert.equal(seasonLine({ position: "HC", games: 3, season_stats: { wins: 1, ties: 1, point_margin: -2 } }), "1-1-1, -2.0 margin");
  assert.equal(seasonLine({ position: "WR", games: 1, season_stats: {} }), "–");
  assert.equal(seasonLine({ position: "WR", games: 1, season_stats: undefined }), "–");
});

test("trajectory pivots each leader's weekly rank and leaves unranked weeks empty", () => {
  const series = trajectorySeries([
    { week: 2, candidate_id: "a", candidate_name: "A", predicted_rank: 1 },
    { week: 1, candidate_id: "a", candidate_name: "A", predicted_rank: 3 },
    { week: 1, candidate_id: "b", candidate_name: "B", predicted_rank: 1 },
    { week: 2, candidate_id: "b", candidate_name: "B", predicted_rank: null },
  ], [{ candidate_id: "a", candidate_name: "A" }, { candidate_id: "b", candidate_name: "B" }]);
  assert.deepEqual(series.data, [{ week: 1, a: 3, b: 1 }, { week: 2, a: 1 }]);
  assert.deepEqual(series.players, [{ id: "a", name: "A" }, { id: "b", name: "B" }]);
});
