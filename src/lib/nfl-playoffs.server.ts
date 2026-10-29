import "server-only";
import type { Tables } from "@/lib/database-schema";
import { tableCacheTag } from "./cache-tags";
import { parseNflPlayoffPayload } from "./nfl-playoffs";
export async function fetchNflPlayoffForecast() {
  try {
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
        revalidate: 3600,
        tags: ["nfl", tableCacheTag("nfl", "playoff_forecasts")],
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const rows: unknown = await response.json();
    if (!Array.isArray(rows) || rows.length !== 1) return null;
    const row = rows[0] as Pick<
      Tables<"nfl", "playoff_forecasts">,
      "payload"
    >;
    const payload = parseNflPlayoffPayload(row?.payload);
    return payload?.season === season ? payload : null;
  } catch {
    return null;
  }
}
