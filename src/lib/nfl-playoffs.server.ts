import "server-only";
import type { Tables } from "@/lib/database-schema";
import { TAGGED_READ_SECONDS, tableCacheTag } from "./cache-tags";
import { parseNflPlayoffPayload } from "./nfl-playoffs";
// A failed read throws so ISR keeps the last good page; null means nothing is
// published for the season.
export async function fetchNflPlayoffForecast() {
  const now = new Date();
  // January and February playoffs belong to the preceding NFL season.
  const season = now.getUTCFullYear() - (now.getUTCMonth() < 2 ? 1 : 0);
  const url = new URL(
    "/rest/v1/playoff_forecasts",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  url.search = new URLSearchParams({
    select: "payload",
    season: `eq.${season}`,
    limit: "1",
  }).toString();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const response = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Accept-Profile": "nfl",
    },
    next: {
      revalidate: TAGGED_READ_SECONDS,
      tags: ["nfl", tableCacheTag("nfl", "playoff_forecasts")],
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`NFL playoff forecast read failed (${response.status})`);
  const rows: unknown = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) return null;
  const row = rows[0] as Pick<
    Tables<"nfl", "playoff_forecasts">,
    "payload"
  >;
  const payload = parseNflPlayoffPayload(row?.payload);
  return payload?.season === season ? payload : null;
}
