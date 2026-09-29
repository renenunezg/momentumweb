import "server-only";
import type { HomeFeature } from "@/components/home-feature-slot";
import { HomePlayoffBracket } from "@/components/home-playoff-bracket";
import { SITE_TIME_ZONE } from "@/lib/daily-picks";
import { fetchPlayoffForecast } from "@/lib/mlb-playoffs.server";

const features = {
  "mlb-playoffs": async (): Promise<HomeFeature> => {
    const forecast = await fetchPlayoffForecast();
    const updated = forecast && new Date(forecast.generated_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: SITE_TIME_ZONE,
    });
    const stale = forecast && Date.now() - Date.parse(forecast.generated_at) > 86400000;

    return {
      id: "mlb-playoffs",
      label: "MLB playoff bracket",
      title: "The road to the World Series",
      description: "Model-projected path and series scores",
      period: forecast ? String(forecast.season) : undefined,
      content: forecast
        ? <HomePlayoffBracket forecast={forecast} />
        : <p className="text-sm text-muted-foreground">Forecast temporarily unavailable.</p>,
      note: updated
        ? `Updated ${updated} · ${stale ? "Snapshot is more than a day old" : "Pure model forecast"}`
        : undefined,
      link: { href: "/mlb/playoffs", label: "Explore the full bracket" },
    };
  },
} satisfies Record<string, () => Promise<HomeFeature>>;

// Select one feature here; inactive features must not fetch data on home visits.
const activeFeature: keyof typeof features = "mlb-playoffs";

export function fetchHomeFeature() {
  return features[activeFeature]();
}
