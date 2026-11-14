import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { tableCacheTag } from "@/lib/cache-tags";

// Called by a Postgres statement trigger (public.site_revalidate) whenever a
// pipeline writes a table the site reads. Expiring a source tag also expires
// pages that consumed it, without invalidating unrelated pages or data.

const SPORTS = new Set(["mlb", "cfb", "nfl", "nhl"]);

// MLB's uncached Supabase client also serves live games, so its static pages
// need explicit paths. Include consumers of the season-unified and ledger views.
const MLB_PATHS: Record<string, string[]> = {
  games: ["/", "/mlb/history", "/mlb/performance", "/mlb/methodology"],
  model_outputs: ["/", "/mlb/history", "/mlb/performance", "/mlb/methodology"],
  model_outputs_season: ["/mlb/history", "/mlb/performance"],
  model_outputs_season_v1_archive: ["/mlb/history", "/mlb/performance"],
  model_evaluation: ["/mlb/performance"],
  model_calibration: ["/mlb/performance"],
  model_edge_buckets: ["/mlb/performance"],
  posterior_sigmas: ["/mlb/performance"],
  player_values: ["/mlb/players", "/mlb/performance"], // The performance page checks the fitted model version.
  player_value_models: ["/", "/mlb/performance", "/mlb/methodology"], // The evaluation view reads this row.
  player_traits: [], // Details use their API route's CDN window.
  prospect_values: ["/mlb/prospects"], // Filtered pages use their API route's CDN window.
  player_season_stats: ["/mlb/prospects"], // Player cards read theirs through the details route's CDN window.
  playoff_forecasts: [], // Both consumers use the tagged REST read.
  pitch_value_study: ["/mlb/pitch-value"],
  pitch_values: ["/mlb/pitch-value"],
  pitch_type_values: ["/mlb/pitch-value"],
  batting_value_study: ["/mlb/batting-value"],
  batting_values: ["/mlb/batting-value"],
  batting_split_values: ["/mlb/batting-value"],
  award_boards: ["/mlb/awards"],
  award_models: ["/mlb/awards"],
};

function authorized(request: Request) {
  const expected = process.env.REVALIDATE_SECRET;
  const given = request.headers.get("x-revalidate-secret");
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    schema?: unknown;
    table?: unknown;
    path?: unknown;
  } | null;
  // The home page shows the site day's picks, so the daily rollover job
  // (sql/002_site_day_rollover.sql) refreshes it just after midnight.
  if (body?.path === "/") {
    revalidatePath("/");
    return NextResponse.json({ revalidated: "/" });
  }
  const sport = typeof body?.schema === "string" ? body.schema : "";
  if (!SPORTS.has(sport)) {
    return NextResponse.json({ error: "unknown schema" }, { status: 400 });
  }
  const table = typeof body?.table === "string" ? body.table : "";
  if (table && !/^[a-z_][a-z0-9_]*$/.test(table)) {
    return NextResponse.json({ error: "invalid table" }, { status: 400 });
  }
  // A published decision must be visible on the next visit, with no stale window.
  if (!table || (sport === "mlb" && !Object.hasOwn(MLB_PATHS, table))) {
    // Preserve schema-only refreshes and safely handle new untagged MLB tables.
    revalidateTag(sport, { expire: 0 });
    revalidatePath(`/${sport}`, "layout");
    revalidatePath("/");
  } else {
    revalidateTag(tableCacheTag(sport, table), { expire: 0 });
    revalidateTag(tableCacheTag(sport, "rpc"), { expire: 0 });
    if (sport === "mlb") {
      for (const path of MLB_PATHS[table]) revalidatePath(path);
    }
  }
  return NextResponse.json({ revalidated: sport });
}
