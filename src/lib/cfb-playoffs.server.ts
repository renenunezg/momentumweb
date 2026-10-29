import "server-only";
import { tableCacheTag } from "./cache-tags";
import { parseCfbPlayoffPayload, type CfbPlayoffPayload } from "./cfb-playoffs";
import type { Tables } from "@/lib/database-schema";

type ForecastRow = Tables<"cfb", "playoff_forecasts">;

export async function fetchCfbPlayoffForecast(): Promise<CfbPlayoffPayload | null> {
  try {
    const season = new Date().getFullYear();
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
        "Accept-Profile": "cfb",
      },
      next: {
        revalidate: 3600,
        tags: ["cfb", tableCacheTag("cfb", "playoff_forecasts")],
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const rows: Pick<ForecastRow, "payload">[] = await response.json();
    if (!Array.isArray(rows) || rows.length !== 1) return null;
    const payload = parseCfbPlayoffPayload(rows[0].payload);
    return payload?.season === season ? payload : null;
  } catch {
    return null;
  }
}
