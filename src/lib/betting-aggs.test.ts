import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateLedger } from "./betting-aggs.ts";
import type { BetLedgerRow } from "./types.ts";
import {
  fetchHistorySummary,
  historyFilters,
  type HistorySummaryRow,
} from "./pick-history.ts";

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

test("history date windows end after today and all-time removes both bounds", () => {
  const now = new Date("2026-09-25T19:00:00Z");
  const seven = historyFilters({}, now);
  assert.equal(seven.from, "2026-09-19T00:00:00.000Z");
  assert.equal(seven.to, "2026-09-26T00:00:00.000Z");
  const fourteen = historyFilters({ period: "14" }, now);
  assert.equal(fourteen.from, "2026-09-12T00:00:00.000Z");
  const all = historyFilters({ period: "all" }, now);
  assert.equal(all.from, null);
  assert.equal(all.to, null);
});

test("history totals span query pages and exclude pending, void and No Play stakes", async () => {
  const filters = historyFilters({ market: "spreads" }, new Date("2026-09-25"));
  const base: HistorySummaryRow = {
    game_id: 1, season: 2026, status: "recommended", outcome: "win",
    stake_units: 1, profit_units: 2, expected_value_per_unit: 0.1,
    decision_at: "2026-09-14T12:00:00Z", graded_at: "2026-09-20T00:00:00Z",
  };
  const rows: HistorySummaryRow[] = [
    ...Array.from({ length: 999 }, (_, game_id) => ({
      ...base, game_id, status: "no_play", outcome: "no_play",
    })),
    base,
    { ...base, game_id: 2, outcome: "loss", profit_units: -1 },
    { ...base, game_id: 3, outcome: "push", profit_units: 0 },
    { ...base, game_id: 4, outcome: "void", profit_units: 0 },
    { ...base, game_id: 5, outcome: "pending", profit_units: null, graded_at: null },
  ];
  const summary = await fetchHistorySummary(filters, async (from, to) => ({
    data: rows.slice(from, to + 1), error: null,
  }));
  const metric = summary.metrics[0];
  assert.equal(summary.unavailable, false);
  assert.equal(metric.segment, "spreads");
  assert.equal(metric.picks, 5);
  assert.equal(metric.no_plays, 999);
  assert.equal(metric.unique_games, 5);
  assert.deepEqual([metric.wins, metric.losses, metric.pushes, metric.voids, metric.pending], [1, 1, 1, 1, 1]);
  assert.equal(metric.staked_units, 3);
  assert.equal(metric.profit_units, 1);
  assert.equal(metric.roi, 1 / 3);
  assert.equal(metric.win_rate, 0.5);
  assert.equal(metric.average_ev, 0.1);
  const failed = await fetchHistorySummary(filters, async (from) => ({
    data: from ? null : rows.slice(0, 1000), error: from ? new Error("read failed") : null,
  }));
  assert.equal(failed.unavailable, true);
  assert.deepEqual(failed.metrics, []);
});
