import assert from "node:assert/strict";
import test from "node:test";
import { quotesAtForecast } from "./nhl-quote-history.ts";
import type { NhlMarketSnapshot } from "./types";

test("both verified pregame prices survive kickoff without admitting unmatched or later quotes", () => {
  const forecast = { game_id: "2026020001", start_date: "2026-09-29T21:00:00Z", as_of: "2026-09-29T18:08:17Z" };
  const base = {
    method: "draftkings_public_listing_v1", provider_key: "draftkings",
    source_url: "https://dknetwork.draftkings.com/draftkings-sportsbook-betting-splits/?tb_edate=n7days&tb_eg=42133&tb_emt=0",
    game_id: forecast.game_id, start_date: forecast.start_date,
    source_start_date: "2026-09-29T21:10:00Z", observed_at: "2026-09-29T18:08:16Z",
    response_date: "2026-09-29T18:08:16Z", response_age_seconds: 0, sha256: "a".repeat(64),
  };
  const snapshot: NhlMarketSnapshot = {
    game_id: forecast.game_id, provider_key: "draftkings", fetched_at: "2026-09-29T18:08:15Z",
    provider_last_update: "2026-08-28T18:00:38Z", home_price: -130, away_price: 110,
    total_line: 6.5, over_price: 105, under_price: -125,
    puck_line: -1.5, home_puck_price: 190, away_puck_price: -230,
    quote_verifications: {
      h2h_home: { ...base, market: "h2h", side: "home", price: -130, point: null },
      h2h_away: { ...base, market: "h2h", side: "away", price: 110, point: null },
      totals_over: { ...base, market: "totals", side: "over", price: 105, point: 6.5 },
      totals_under: { ...base, market: "totals", side: "under", price: -125, point: 6.5 },
    },
  };
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
