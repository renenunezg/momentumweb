import type { NhlGameProjection, NhlMarketSnapshot } from "./types";

type Forecast = Pick<NhlGameProjection, "game_id" | "as_of" | "start_date">;
const PUBLIC_LISTING = "https://dknetwork.draftkings.com/draftkings-sportsbook-betting-splits/?tb_edate=n7days&tb_eg=42133&tb_emt=0";

// Validate at the forecast cutoff. An archived pregame observation remains
// evidence for that forecast after the game starts; it is not a live quote.
export function quotesAtForecast(
  snapshot: NhlMarketSnapshot,
  forecast: Forecast,
): NhlMarketSnapshot | null {
  const cutoff = Date.parse(forecast.as_of);
  const start = Date.parse(forecast.start_date);
  const fetched = Date.parse(snapshot.fetched_at);
  if (snapshot.game_id !== forecast.game_id || !(fetched <= cutoff && cutoff < start)) return null;
  const updated = Date.parse(snapshot.provider_last_update ?? "");
  const timestampFresh = updated <= fetched && cutoff - updated <= 24 * 60 * 60 * 1000;
  const evidence = snapshot.quote_verifications;

  function usable(market: "h2h" | "totals", side: string, price: number | null, point: number | null): boolean {
    if (price == null || !Number.isFinite(price) || Math.abs(price) < 100) return false;
    if (timestampFresh) return true;
    if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return false;
    const quote = evidence[`${market}_${side}`];
    if (!quote || typeof quote !== "object" || Array.isArray(quote)) return false;
    const observed = Date.parse(String(quote.observed_at ?? ""));
    const responseDate = Date.parse(String(quote.response_date ?? ""));
    const responseAge = quote.response_age_seconds;
    const sourceStart = Date.parse(String(quote.source_start_date ?? ""));
    return snapshot.provider_key === "draftkings" &&
      quote.method === "draftkings_public_listing_v1" &&
      quote.source_url === PUBLIC_LISTING &&
      quote.provider_key === snapshot.provider_key && quote.game_id === snapshot.game_id &&
      Date.parse(String(quote.start_date ?? "")) === start &&
      start <= sourceStart && sourceStart - start <= 15 * 60 * 1000 &&
      quote.market === market && quote.side === side && quote.price === price && quote.point === point &&
      /^[0-9a-f]{64}$/.test(String(quote.sha256 ?? "")) &&
      fetched <= observed && observed <= cutoff && cutoff - observed <= 15 * 60 * 1000 &&
      -5000 <= observed - responseDate && observed - responseDate <= 300000 &&
      typeof responseAge === "number" && responseAge >= 0 && responseAge <= 300;
  }

  const home = usable("h2h", "home", snapshot.home_price, null) ? snapshot.home_price : null;
  const away = usable("h2h", "away", snapshot.away_price, null) ? snapshot.away_price : null;
  const over = usable("totals", "over", snapshot.over_price, snapshot.total_line) ? snapshot.over_price : null;
  const under = usable("totals", "under", snapshot.under_price, snapshot.total_line) ? snapshot.under_price : null;
  if ([home, away, over, under].every((price) => price == null)) return null;
  return {
    ...snapshot,
    home_price: home, away_price: away, over_price: over, under_price: under,
    total_line: over != null || under != null ? snapshot.total_line : null,
    home_puck_price: timestampFresh ? snapshot.home_puck_price : null,
    away_puck_price: timestampFresh ? snapshot.away_puck_price : null,
    puck_line: timestampFresh ? snapshot.puck_line : null,
  };
}
