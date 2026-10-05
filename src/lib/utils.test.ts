import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate, formatFairOdds, formatOdds } from "./utils.ts";

test("American odds carry an explicit sign, missing values render as an en dash", () => {
  assert.equal(formatOdds(150), "+150");
  assert.equal(formatOdds(-110), "-110");
  assert.equal(formatOdds(null), "–");
  assert.equal(formatFairOdds(0.6), "-150");
  assert.equal(formatFairOdds(0.4), "+150");
  assert.equal(formatFairOdds(0.5), "+100");
  assert.equal(formatFairOdds(0.999), "-99900");
  assert.equal(formatFairOdds(0.60051), "-150"); // Use unrounded probability.
  for (const value of [0, 1, -0.1, 1.1, Number.MIN_VALUE, NaN, Infinity, null, undefined]) {
    assert.equal(formatFairOdds(value), "–");
  }
});

test("dates are read from the ISO prefix so timestamps and plain dates agree", () => {
  assert.equal(formatDate("2026-05-12"), "May 12, 2026");
  assert.equal(formatDate("2026-05-12T23:30:00Z"), "May 12, 2026");
  assert.equal(formatDate("not a date"), "–");
  assert.equal(formatDate(null), "–");
});
