import assert from "node:assert/strict";
import test from "node:test";
import { mlbGamePicks, zonedDayRange } from "./daily-picks.ts";

test("a Pacific calendar date spans local midnight to midnight in UTC", () => {
  assert.deepEqual(zonedDayRange("2026-09-09", "America/Los_Angeles"), {
    from: "2026-09-09T07:00:00.000Z",
    to: "2026-09-10T07:00:00.000Z",
  });
  assert.deepEqual(zonedDayRange("2026-12-15", "America/Los_Angeles"), {
    from: "2026-12-15T08:00:00.000Z",
    to: "2026-12-16T08:00:00.000Z",
  });
});

const row = (team: string, overrides = {}) => ({
  team,
  ev_flag: "No Play",
  run_line_ev_flag: "No Play",
  total_play: "No Play",
  moneyline: 120,
  spread: 1.5,
  spread_odds: -181,
  total: 8,
  total_over_odds: -115,
  total_under_odds: -105,
  win_prob: 0.4557,
  p_cover: 0.6982,
  p_over: 0.5317,
  p_under: 0.4683,
  ...overrides,
});

test("MLB team flags become one pick per market, ordered moneyline, run line, total", () => {
  const picks = mlbGamePicks([
    row("MIN", { run_line_ev_flag: "MIN", total_play: "Under" }),
    row("DET", {
      ev_flag: "DET",
      moneyline: -140,
      win_prob: 0.5443,
      spread: -1.5,
      total_play: "Under",
    }),
  ]);
  assert.deepEqual(picks, [
    { market: "h2h", label: "DET ML", price: -140, probability: 0.5443 },
    { market: "spreads", label: "MIN +1.5", price: -181, probability: 0.6982 },
    { market: "totals", label: "Under 8", price: -105, probability: 0.4683 },
  ]);
  assert.deepEqual(mlbGamePicks([row("MIN"), row("DET")]), []);
});
