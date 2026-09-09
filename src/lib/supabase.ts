import { createClient } from "@supabase/supabase-js";
import type { NflPicksDatabase } from "@/lib/nfl-picks.database.types";
import type { Database } from "@/lib/database.types";
import type { CfbPicksDatabase } from "@/lib/cfb-picks.database.types";

type CfbDatabase = Omit<Database, "cfb"> & {
  cfb: Omit<Database["cfb"], "Tables" | "Views" | "Functions"> & {
    Tables: Database["cfb"]["Tables"] & CfbPicksDatabase["cfb"]["Tables"];
    Views: Database["cfb"]["Views"] & CfbPicksDatabase["cfb"]["Views"];
    Functions: Database["cfb"]["Functions"] &
      CfbPicksDatabase["cfb"]["Functions"];
  };
};

type NflDatabase = Omit<Database, "nfl"> & {
  nfl: Omit<Database["nfl"], "Tables" | "Views" | "Functions"> & {
    Tables: Database["nfl"]["Tables"] & NflPicksDatabase["nfl"]["Tables"];
    Views: Database["nfl"]["Views"] & NflPicksDatabase["nfl"]["Views"];
    Functions: Database["nfl"]["Functions"] &
      NflPicksDatabase["nfl"]["Functions"];
  };
};

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
// windows. Public football reads are tagged by sport and cached for an hour;
// the revalidation webhook (/api/revalidate, fired by a Postgres trigger on
// every pipeline write) drops the tag, so the hour is only a safety net.
// Mutations bypass the cache.
export const CACHE_SECONDS = 3600;

function cachedPublicFetch(sport: string): typeof fetch {
  return (input, init) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const restRead =
      typeof window === "undefined" &&
      method === "GET" &&
      String(input).startsWith(`${url}/rest/v1/`);
    return fetch(
      input,
      restRead
        ? { ...init, next: { revalidate: CACHE_SECONDS, tags: [sport] } }
        : init,
    );
  };
}

export const supabaseCfb = createClient<CfbDatabase, "cfb">(url, anonKey, {
  db: { schema: "cfb" },
  auth: anonAuth("cfb"),
  global: { fetch: cachedPublicFetch("cfb") },
});

export const supabaseNfl = createClient<NflDatabase, "nfl">(url, anonKey, {
  db: { schema: "nfl" },
  auth: anonAuth("nfl"),
  global: { fetch: cachedPublicFetch("nfl") },
});
