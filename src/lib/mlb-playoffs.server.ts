import "server-only";
import { parsePlayoffForecast } from "@/lib/mlb-playoffs";

export async function fetchPlayoffForecast() {
  const season = new Date().getFullYear();
  try {
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
        "Accept-Profile": "mlb",
      },
      next: { revalidate: 3600, tags: ["mlb"] },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const rows: { payload?: unknown }[] = await response.json();
    const forecast = parsePlayoffForecast(rows[0]?.payload);
    return forecast?.season === season ? forecast : null;
  } catch {
    return null;
  }
}
