// Tags describe source tables, so a publish expires only reads that depend on it.
// Keep the sport tag for explicit whole-sport refreshes from older callers.
export function tableCacheTag(sport: string, table: string) {
  return `${sport}:${table}`;
}

// A tagged read lives a week: the revalidation webhook expires it on every
// write to its source tables, so the window is only a backstop.
export const TAGGED_READ_SECONDS = 604800;

// Tables the site reads that carry no public.site_revalidate trigger. No
// publish expires a read of these, so such reads keep an hour.
const UNTRIGGERED = new Set([
  "mlb:grading_rules",
  "mlb:rewritten_forecast_days",
  "nhl:market_snapshots",
]);
const UNTRIGGERED_READ_SECONDS = 3600;

export function restCacheSeconds(tags: string[]): number {
  return tags.some((tag) => UNTRIGGERED.has(tag)) ? UNTRIGGERED_READ_SECONDS : TAGGED_READ_SECONDS;
}

// A view carries its base tables' tags, since the webhook fires on the tables.
const LIVE_PREDICTION_TABLES = ["forecast_snapshots", "game_results", "closing_lines"];
const SEASON_OUTPUT_TABLES = ["games", "model_outputs_season", "model_outputs_season_v1_archive"];
const VIEW_TABLES: Record<string, string[]> = {
  "cfb:current_recommendations": ["recommendation_decisions", "recommendations"],
  "mlb:bet_ledger_v": [...SEASON_OUTPUT_TABLES, "grading_rules", "rewritten_forecast_days"],
  "mlb:model_outputs_season_unified": SEASON_OUTPUT_TABLES,
  "nfl:live_predictions": LIVE_PREDICTION_TABLES,
  "nhl:live_predictions": LIVE_PREDICTION_TABLES,
};

export function restCacheTags(sport: string, url: URL): string[] {
  const resource = url.pathname.split("/rest/v1/")[1];
  const viewTables = VIEW_TABLES[tableCacheTag(sport, resource)];
  if (viewTables) {
    return [sport, ...viewTables.map((table) => tableCacheTag(sport, table))];
  }
  if (!resource.startsWith("rpc/")) {
    return [sport, tableCacheTag(sport, resource)];
  }

  const rpc = resource.slice(4);
  let tables: string[];
  switch (rpc) {
    case "recommendation_summary":
    case "recommendation_dashboard":
      tables = ["recommendations"];
      break;
    case "latest_market_snapshots":
      tables = ["market_snapshots"];
      break;
    case "forecast_accuracy":
      // The live side reads the live_predictions view.
      tables = url.searchParams.get("p_source") === "backtest" ? ["backtest_predictions"] : LIVE_PREDICTION_TABLES;
      break;
    default:
      // Unknown RPC dependencies stay conservative without expiring table reads.
      return [sport, tableCacheTag(sport, "rpc")];
  }
  return [sport, ...tables.map((table) => tableCacheTag(sport, table))];
}
