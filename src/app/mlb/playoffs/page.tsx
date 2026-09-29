import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { MlbPlayoffBracket } from "@/components/mlb-playoff-bracket";
import { fetchPlayoffForecast } from "@/lib/mlb-playoffs.server";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "MLB Playoff Simulator",
  description:
    "Explore model-derived MLB series scores, advancement probabilities and World Series chances in an interactive postseason bracket.",
};

export default async function PlayoffsPage() {
  const forecast = await fetchPlayoffForecast();
  return (
    <main id="main" className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-12">
      <div className="mb-7 flex items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            MLB / Postseason
          </p>
          <h1 className="font-heading text-4xl tracking-tight sm:text-5xl">
            The road to the World Series
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Every series. Every possible path. Powered by our plate-appearance
            model.
          </p>
        </div>
        <Trophy
          className="hidden size-12 shrink-0 text-amber-500 sm:block"
          aria-hidden="true"
        />
      </div>
      {forecast ? (
        <MlbPlayoffBracket
          forecast={forecast}
          stale={
            new Date().getTime() - Date.parse(forecast.generated_at) > 86400000
          }
        />
      ) : (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <Trophy
            className="mx-auto mb-4 size-9 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="font-heading text-2xl">
            The postseason forecast is not available yet
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            The bracket will appear when a complete model forecast is published
            with the official playoff field, matchup probabilities and current
            series results.
          </p>
        </div>
      )}
    </main>
  );
}
