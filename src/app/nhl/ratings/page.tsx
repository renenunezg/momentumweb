import type { Metadata } from "next";
import { LastUpdated } from "@/components/last-updated";
import { NhlRatingsTable } from "@/components/nhl-ratings";
import { fetchLatestRatings, fetchTeams } from "@/lib/nhl";
import { formatDate } from "@/lib/utils";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { asOf } = await fetchLatestRatings();
  return {
    title: `NHL Model Ratings${asOf ? ` ${asOf.slice(0, 4)}` : ""}`,
    description:
      "NHL team ratings from last-25-game shot-quality windows: expected goals for and against at home and on the road, attack and defense strengths, and the overall rating.",
  };
}

export default async function RatingsPage() {
  const [{ ratings, asOf }, teams] = await Promise.all([
    fetchLatestRatings(),
    fetchTeams(),
  ]);

  if (ratings.length === 0) {
    return (
      <main id="main" className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8">
        <h1 className="font-heading text-2xl">NHL Model Ratings</h1>
        <p className="mt-4 text-muted-foreground">
          No ratings published yet. Run the daily pipeline to load them.
        </p>
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl">NHL Model Ratings</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            As of {formatDate(asOf)}
          </p>
        </div>
        <LastUpdated
          timestamp={ratings[0]?.published_at ?? null}
          schedule="Updates every morning in season"
        />
      </div>
      <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">
        Expected goals for and against per game come from each team&apos;s
        last 25 games at that venue, by situation. Attack and defense
        strengths are ratios to the league average at the venue (1.000 is
        average; a defense below 1.000 allows fewer goals). Rating is home
        attack plus away attack minus home defense minus away defense. The
        window column counts the home and away games behind the numbers.
      </p>
      <NhlRatingsTable ratings={ratings} teams={teams} />
    </main>
  );
}
