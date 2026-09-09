import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateLedger } from "./betting-aggs.ts";
import type { BetLedgerRow } from "./types.ts";

function bet(overrides: Partial<BetLedgerRow>): BetLedgerRow {
  return {
    date: "2026-06-01",
    team: "NYY",
    game_pk: 1,
    bet_type: "ml",
    stake: 1,
    decimal_odds: 2,
    american_odds: 100,
    totals_side: null,
    won: true,
    edge: 0.05,
    payout: 2,
    push: false,
    ...overrides,
  };
}

test("an empty ledger yields null ratios and zero counts", () => {
  const k = aggregateLedger([]);
  assert.equal(k.roi, null);
  assert.equal(k.sharpe, null);
  assert.equal(k.max_drawdown, null);
  assert.equal(k.total_staked_units, 0);
  assert.equal(k.n_favorites, 0);
});

test("ROI and net units come from stakes and payouts, not from odds", () => {
  const k = aggregateLedger([
    bet({ stake: 1, payout: 2, won: true }),
    bet({ game_pk: 2, stake: 1, payout: 0, won: false }),
    bet({ game_pk: 3, stake: 2, payout: 0, won: false }),
  ]);
  assert.equal(k.total_staked_units, 4);
  assert.equal(k.net_profit_units, -2);
  assert.equal(k.roi, -0.5);
});

test("max drawdown is the worst peak-to-trough fall of daily equity", () => {
  const k = aggregateLedger([
    bet({ date: "2026-06-01", payout: 3, stake: 1 }),
    bet({ date: "2026-06-02", game_pk: 2, payout: 0, stake: 1, won: false }),
    bet({ date: "2026-06-03", game_pk: 3, payout: 0, stake: 1.5, won: false }),
    bet({ date: "2026-06-04", game_pk: 4, payout: 2, stake: 1 }),
  ]);
  assert.equal(k.max_drawdown, -2.5);
});

test("favorites and underdogs are split by the sign of the American line", () => {
  const k = aggregateLedger([
    bet({ american_odds: -150, won: true, payout: 1.6667, stake: 1 }),
    bet({ game_pk: 2, american_odds: 150, won: false, payout: 0, stake: 1 }),
    bet({ game_pk: 3, bet_type: "rl", american_odds: -110, won: true, payout: 1.9091, stake: 1 }),
  ]);
  assert.equal(k.n_favorites, 1);
  assert.equal(k.favorites_correct, 1);
  assert.equal(k.n_underdogs, 1);
  assert.equal(k.underdogs_correct, 0);
  assert.equal(k.n_run_line, 1);
  assert.equal(k.avg_ml_line, -100);
});

test("totals sides are counted from the ledger's own side column", () => {
  const k = aggregateLedger([
    bet({ bet_type: "total", totals_side: "over", won: true }),
    bet({ game_pk: 2, bet_type: "total", totals_side: "under", won: false, payout: 0 }),
  ]);
  assert.equal(k.overs_predictions, 1);
  assert.equal(k.overs_correct, 1);
  assert.equal(k.unders_predictions, 1);
  assert.equal(k.unders_roi, -1);
});
