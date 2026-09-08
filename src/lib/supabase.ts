import { createClient } from "@supabase/supabase-js";
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

// Query URLs include every filter, so cached pages never share different windows.
// Public football reads refresh within five minutes; mutations bypass the cache.
const cachedPublicFetch: typeof fetch = (input, init) => {
  const method = (init?.method ?? "GET").toUpperCase();
  const restRead =
    typeof window === "undefined" &&
    method === "GET" &&
    String(input).startsWith(`${url}/rest/v1/`);
  return fetch(input, restRead ? { ...init, next: { revalidate: 300 } } : init);
};

export const supabaseCfb = createClient<CfbDatabase, "cfb">(url, anonKey, {
  db: { schema: "cfb" },
  auth: anonAuth("cfb"),
  global: { fetch: cachedPublicFetch },
});

export const supabaseNfl = createClient<Database, "nfl">(url, anonKey, {
  db: { schema: "nfl" },
  auth: anonAuth("nfl"),
  global: { fetch: cachedPublicFetch },
});
