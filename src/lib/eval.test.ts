import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcRunLinePick,
  calcTotalPick,
  computeBaseRow,
  computeSegmentRow,
  type EvalRow,
} from "./eval.ts";

function row(overrides: Partial<EvalRow> & { team: string; game_pk: number }): EvalRow {
  return {
    expected_runs: 4.5,
    win_prob: 0.5,
    ev_flag: "No Play",
    run_line_ev_flag: "No Play",
    spread: null,
    total: null,
    total_play: "No Play",
    actual_runs: 4,
    actual_win: 0,
    actual_margin: 0,
    game_total: 8,
    ...overrides,
  };
}

test("run line: a favorite must cover the spread, a dog wins outright or stays inside it", () => {
  const fav = row({ team: "A", game_pk: 1, spread: -1.5 });
  assert.equal(calcRunLinePick({ ...fav, actual_margin: 2 }), 1);
  assert.equal(calcRunLinePick({ ...fav, actual_margin: 1 }), 0);

  const dog = row({ team: "B", game_pk: 1, spread: 1.5 });
  assert.equal(calcRunLinePick({ ...dog, actual_win: 1, actual_margin: 1 }), 1);
  assert.equal(calcRunLinePick({ ...dog, actual_margin: -1 }), 1);
  assert.equal(calcRunLinePick({ ...dog, actual_margin: -2 }), 0);

  assert.equal(calcRunLinePick(row({ team: "C", game_pk: 2, spread: null })), null);
});

test("totals: a push is not graded", () => {
  const over = row({ team: "A", game_pk: 1, total: 8.5, total_play: "Over" });
  assert.equal(calcTotalPick({ ...over, game_total: 9 }), 1);
  assert.equal(calcTotalPick({ ...over, game_total: 8 }), 0);
  assert.equal(calcTotalPick({ ...over, total: 8, game_total: 8 }), null);
  assert.equal(calcTotalPick({ ...over, total_play: "Under", game_total: 7 }), 1);
});

test("pick accuracy is counted once per game, on the favored team only", () => {
  const rows: EvalRow[] = [
    row({ team: "HOME", game_pk: 1, win_prob: 0.6, actual_win: 1 }),
    row({ team: "AWAY", game_pk: 1, win_prob: 0.4, actual_win: 0 }),
    row({ team: "HOME", game_pk: 2, win_prob: 0.55, actual_win: 0 }),
    row({ team: "AWAY", game_pk: 2, win_prob: 0.45, actual_win: 1 }),
    // A coin flip is not a prediction and must not count either way.
    row({ team: "HOME", game_pk: 3, win_prob: 0.5, actual_win: 1 }),
    row({ team: "AWAY", game_pk: 3, win_prob: 0.5, actual_win: 0 }),
  ];
  const base = computeBaseRow(rows);
  assert.equal(base.total_predictions, 2);
  assert.equal(base.total_correct, 1);
  assert.equal(base.total_accuracy, 0.5);
});

test("moneyline plays are deduped per game and graded on the flagged team", () => {
  const rows: EvalRow[] = [
    row({ team: "HOME", game_pk: 1, ev_flag: "HOME", actual_win: 1 }),
    row({ team: "AWAY", game_pk: 1, ev_flag: "HOME", actual_win: 0 }),
    row({ team: "HOME", game_pk: 2, ev_flag: "AWAY", actual_win: 1 }),
    row({ team: "AWAY", game_pk: 2, ev_flag: "AWAY", actual_win: 0 }),
  ];
  const base = computeBaseRow(rows);
  assert.equal(base.ml_predictions, 2);
  assert.equal(base.ml_correct, 1);
});

test("segment ROI splits favorites from underdogs by the American line", () => {
  const rows: EvalRow[] = [
    row({ team: "FAV", game_pk: 1, ev_flag: "FAV", moneyline: -150, kelly_quarter_ml: 0.02, actual_win: 1 }),
    row({ team: "DOG", game_pk: 2, ev_flag: "DOG", moneyline: 150, kelly_quarter_ml: 0.02, actual_win: 0 }),
  ];
  const seg = computeSegmentRow(rows);
  assert.equal(seg.n_favorites, 1);
  assert.equal(seg.favorites_correct, 1);
  // -150 pays 1/1.5 of the stake on a win.
  assert.equal(seg.roi_favorites, 0.6667);
  assert.equal(seg.n_underdogs, 1);
  assert.equal(seg.roi_underdogs, -1);
  // Mean implied probability of -150 and +150 is exactly 0.5, which is even money.
  assert.equal(seg.avg_ml_line, -100);
});
