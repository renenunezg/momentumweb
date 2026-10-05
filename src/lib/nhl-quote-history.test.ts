import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import { quotesAtForecast } from "./nhl-quote-history.ts";
import type { NhlMarketSnapshot } from "./types";

test("both verified pregame prices survive kickoff without admitting unmatched or later quotes", () => {
  const fixture: {version: number; forecast: {game_id: string; start_date: string; as_of: string};
    snapshot: NhlMarketSnapshot; rejected_evidence: Record<string, string | number>[]} = JSON.parse(
      readFileSync(new URL("../../contracts/v1/nhl-quote.json", import.meta.url), "utf8"));
  assert.equal(fixture.version, 1);
  const { forecast, snapshot } = fixture;
  for (const mutation of fixture.rejected_evidence) {
    const rejected = { ...snapshot, quote_verifications: Object.fromEntries(
      Object.entries(snapshot.quote_verifications as Record<string, object>)
        .map(([key, evidence]) => [key, {...evidence, ...mutation}])) };
    assert.equal(quotesAtForecast(rejected, forecast), null);
  }
  const recorded = quotesAtForecast(snapshot, forecast);
  assert.equal(recorded?.home_price, -130);
  assert.equal(recorded?.away_price, 110);
  assert.equal(recorded?.total_line, 6.5);
  assert.equal(recorded?.home_puck_price, null);
  assert.equal(quotesAtForecast({ ...snapshot, quote_verifications: {} }, forecast), null);
  assert.equal(quotesAtForecast({ ...snapshot, away_price: 120 }, forecast)?.away_price, null);
  assert.equal(quotesAtForecast({ ...snapshot, total_line: 5.5 }, forecast)?.total_line, null);
  assert.equal(quotesAtForecast({ ...snapshot, provider_key: "fanduel" }, forecast), null);
  assert.equal(quotesAtForecast({ ...snapshot, fetched_at: "2026-09-29T18:09:00Z" }, forecast), null);
  assert.equal(quotesAtForecast(snapshot, { ...forecast, as_of: "2026-09-29T18:30:00Z" }), null);
  assert.equal(quotesAtForecast(snapshot, { ...forecast, as_of: "2026-09-29T22:00:00Z" }), null);
  assert.equal(quotesAtForecast(snapshot, { ...forecast, start_date: "2026-09-30T21:00:00Z" }), null);
  const fresh = quotesAtForecast({ ...snapshot, provider_last_update: "2026-09-29T18:00:00Z", quote_verifications: {} }, forecast);
  assert.equal(fresh?.home_price, -130);
  assert.equal(fresh?.away_price, 110);
});
