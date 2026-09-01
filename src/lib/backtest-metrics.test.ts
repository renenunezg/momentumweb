import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMetrics, metricsBySeason } from "./backtest-metrics.ts";

test("model and market are scored on the same home-margin axis", () => {
  const m = computeMetrics("x", [
    // Model says home by 7, market says home by 3 (spread -3), home wins by 5.
    { season: 2025, model_margin: 7, closing_spread: -3, actual_margin: 5 },
    // Model says home by 1, market says away by 4, away wins by 10.
    { season: 2025, model_margin: 1, closing_spread: 4, actual_margin: -10 },
  ]);
  assert.ok(m);
  assert.equal(m.games, 2);
  assert.equal(m.modelMae, (2 + 11) / 2);
  assert.equal(m.marketMae, (2 + 6) / 2);
  assert.equal(m.modelBeatsMarket, 0);
  assert.equal(m.bias, (2 + 11) / 2);
});

test("ungraded rows are skipped and an empty slice is null", () => {
  assert.equal(
    computeMetrics("x", [
      { season: 2025, model_margin: 3, closing_spread: null, actual_margin: 1 },
    ]),
    null
  );
});

test("seasons are ordered ascending and the overall row spans all of them", () => {
  const { overall, bySeason, seasons } = metricsBySeason([
    { season: 2024, model_margin: 3, closing_spread: -3, actual_margin: 3 },
    { season: 2023, model_margin: 0, closing_spread: 0, actual_margin: 7 },
  ]);
  assert.deepEqual(seasons, [2023, 2024]);
  assert.deepEqual(bySeason.map((m) => m.label), ["2023", "2024"]);
  assert.equal(overall?.games, 2);
});
