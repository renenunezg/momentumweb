import "server-only";
import {
  PLAYOFF_STAGES,
  parsePlayoffForecast,
  type PlayoffEdition,
  type PlayoffStage,
} from "@/lib/mlb-playoffs";

// Every round's stored snapshot for the current season, in bracket order.
export async function fetchPlayoffEditions(): Promise<PlayoffEdition[]> {
  const season = new Date().getFullYear();
  try {
    const url = new URL(
      "/rest/v1/playoff_forecasts",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
    url.search = new URLSearchParams({
      select: "stage,payload",
      season: `eq.${season}`,
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
    if (!response.ok) return [];
    const rows: { stage?: string; payload?: unknown }[] = await response.json();
    return rows
      .flatMap((row) => {
        const stage = PLAYOFF_STAGES.find((s) => s === row.stage);
        const forecast = parsePlayoffForecast(row.payload);
        return stage && forecast?.season === season
          ? [{ stage, forecast }]
          : [];
      })
      .sort(
        (a, b) =>
          PLAYOFF_STAGES.indexOf(a.stage as PlayoffStage) -
          PLAYOFF_STAGES.indexOf(b.stage as PlayoffStage),
      );
  } catch {
    return [];
  }
}
