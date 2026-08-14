import { fetchLatestRatings, fetchTeams } from "@/lib/cfb";
import { LastUpdated } from "@/components/last-updated";
import CfbRatings from "@/components/cfb-ratings";

export const revalidate = 300;

export default async function RatingsPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; conf?: string }>;
}) {
  const params = await searchParams;
  const [{ ratings, season, week }, teams] = await Promise.all([
    fetchLatestRatings(),
    fetchTeams(),
  ]);

  if (ratings.length === 0) {
    return (
      <main className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8">
        <h1 className="font-heading text-2xl tracking-tight">Power Ratings</h1>
        <p className="mt-4 text-muted-foreground">
          No ratings published yet. Run the publish pipeline to load them.
        </p>
      </main>
    );
  }

  const lastUpdated = ratings[0]?.as_of ?? null;
  const weekLabel =
    season != null && week != null ? `${season} · Week ${week}` : "";

  return (
    <main className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">
            Power Ratings
          </h1>
          {weekLabel && (
            <p className="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {weekLabel}
            </p>
          )}
        </div>
        <LastUpdated
          timestamp={lastUpdated}
          schedule="Updates when a new forecast is published"
        />
      </div>

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        A team&apos;s power rating is its expected scoring margin against an
        average opponent on a neutral field, split into offense and defense
        points per game. Ratings are model output, not a poll.
      </p>

      <CfbRatings
        ratings={ratings}
        teams={[...teams.values()]}
        initialView={params.class}
        initialConference={params.conf}
      />

      <p className="text-xs text-muted-foreground">
        Off and Def are points per game above an average opponent; Rating is
        their sum. SD is the model&apos;s uncertainty about the rating.
      </p>
    </main>
  );
}
