import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { restCacheTags } from "./cache-tags.ts";

// These clients are anon and read-only: nothing here ever signs a user in, so
// there is no session to persist or refresh, and no auth timers are wanted.
//
// Each createClient also builds a GoTrueClient. GoTrueClient counts instances
// per storageKey and warns on the second one sharing a key, so three clients
// on one project URL all land on the same project-derived key and warn. Giving
// each its own key keeps the counters separate and makes it true that they
// cannot clobber one another. Realtime authenticates with the anon key rather
// than a user session, so none of this affects it.
function anonAuth(sport: string) {
  return {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: `momentum-${sport}-auth`,
  } as const;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// One client per sport schema: the schema is fixed at construction, so each
// sport section imports its own pinned client and table names are checked
// against the generated types at compile time.
export const supabase = createClient<Database, "mlb">(url, anonKey, {
  db: { schema: "mlb" },
  auth: anonAuth("mlb"),
});

// Query URLs include every filter, so cached pages never share different
// windows. Public reads are tagged by source table and cached for an hour;
// the revalidation webhook (/api/revalidate, fired by a Postgres trigger on
// every pipeline write) expires dependent reads, so the hour is a safety net.
// Mutations bypass the cache.
export const CACHE_SECONDS = 3600;
const RETRY_TIMEOUT_MS = 10_000;

// The football player grade pages change once a week, when the cron rewrites
// position_traits and player_season_stats, so their reads live a day and the
// webhook keeps them fresh. Their own clients keep that window from mixing
// with the hourly reads; no grade query URL is shared with an hourly page.
export const GRADES_CACHE_SECONDS = 86400;

function cachedPublicFetch(sport: string, seconds = CACHE_SECONDS): typeof fetch {
  return async (input, init) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const restRead =
      typeof window === "undefined" &&
      method === "GET" &&
      String(input).startsWith(`${url}/rest/v1/`);
    if (!restRead) return fetch(input, init);
    const options = { ...init, next: { revalidate: seconds, tags: restCacheTags(sport, new URL(String(input))) } };
    const response = await fetch(input, options);
    if (response.status < 500) return response;
    // A statement timeout on the Nano instance usually passes, so a read gets
    // one more try. The signal keeps React from answering the retry with the
    // failed response it memoized for this render.
    return fetch(input, { ...options, signal: AbortSignal.timeout(RETRY_TIMEOUT_MS) });
  };
}

// The CSV exports read MLB tables through the same hour-long tagged cache the
// football clients use, so a crawler cannot turn CDN misses into repeated
// full-table reads. The uncached client above stays for the live games page.
export const supabaseMlbCached = createClient<Database, "mlb">(url, anonKey, {
  db: { schema: "mlb" },
  auth: anonAuth("mlb-cached"),
  global: { fetch: cachedPublicFetch("mlb") },
});

export const supabaseCfb = createClient<Database, "cfb">(url, anonKey, {
  db: { schema: "cfb" },
  auth: anonAuth("cfb"),
  global: { fetch: cachedPublicFetch("cfb") },
});

export const supabaseNfl = createClient<Database, "nfl">(url, anonKey, {
  db: { schema: "nfl" },
  auth: anonAuth("nfl"),
  global: { fetch: cachedPublicFetch("nfl") },
});

export const supabaseCfbGrades = createClient<Database, "cfb">(url, anonKey, {
  db: { schema: "cfb" },
  auth: anonAuth("cfb-grades"),
  global: { fetch: cachedPublicFetch("cfb", GRADES_CACHE_SECONDS) },
});

export const supabaseNflGrades = createClient<Database, "nfl">(url, anonKey, {
  db: { schema: "nfl" },
  auth: anonAuth("nfl-grades"),
  global: { fetch: cachedPublicFetch("nfl", GRADES_CACHE_SECONDS) },
});

export const supabaseNhl = createClient<Database, "nhl">(url, anonKey, {
  db: { schema: "nhl" },
  auth: anonAuth("nhl"),
  global: { fetch: cachedPublicFetch("nhl") },
});
