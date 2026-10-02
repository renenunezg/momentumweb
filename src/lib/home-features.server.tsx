import "server-only";
import type { HomeFeature } from "@/components/home-feature-slot";
import { HomePlayoffBracket } from "@/components/home-playoff-bracket";
import { SITE_TIME_ZONE } from "@/lib/daily-picks";
import { fetchPlayoffEditions } from "@/lib/mlb-playoffs.server";

const features = {
  "mlb-playoffs": async (): Promise<HomeFeature> => {
    // The home card shows the latest round's snapshot.
    const forecast = (await fetchPlayoffEditions()).at(-1)?.forecast ?? null;
    const updated = forecast && new Date(forecast.generated_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: SITE_TIME_ZONE,
    });

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
        ? `Forecast before the current round, published ${updated} · Pure model forecast`
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
