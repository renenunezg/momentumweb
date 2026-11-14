import { PageDescription, PageHeader, PageShell, PageTitle, PageMeta } from "@/components/page-layout";
import type { Metadata } from "next";
import { LastUpdated } from "@/components/last-updated";
import { HowGraded } from "@/components/how-graded";
import { NhlRatingsTable } from "@/components/nhl-ratings";
import { fetchLatestRatings, fetchTeams } from "@/lib/nhl";
import { formatDate } from "@/lib/utils";

// Every read here is expired by the revalidation webhook when its table is
// published, and nothing on the page depends on the clock, so the week is only
// a backstop.
export const revalidate = 604800;

export async function generateMetadata(): Promise<Metadata> {
  const { asOf } = await fetchLatestRatings();
  return {
    title: `NHL Model Ratings${asOf ? ` ${asOf.slice(0, 4)}` : ""}`,
    description:
      "NHL team ratings from each team's last 50 games of goals and expected goals: expected goals for and against at home and on the road, attack and defense strengths, and the overall rating.",
  };
}

export default async function RatingsPage() {
  const [{ ratings, asOf }, teams] = await Promise.all([
    fetchLatestRatings(),
    fetchTeams(),
  ]);

  if (ratings.length === 0) {
    return (
      <PageShell>
        <PageTitle>NHL Model Ratings</PageTitle>
        <p className="text-muted-foreground">
          No ratings published yet.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>NHL Model Ratings</PageTitle>
          <PageMeta>
            <PageDescription className="type-eyebrow">
              As of {formatDate(asOf)}
            </PageDescription>
            <LastUpdated timestamp={ratings[0]?.published_at ?? null} schedule="Updates every morning in season" />
          </PageMeta>
          <div className="mt-2">
            <HowGraded label="How this works"
              lead={<>Strengths are ratios to the league average: 1.000 is average, and a defense below 1.000 allows fewer goals.</>}
            >
              <p>
                Attack and defense strengths come from each team&apos;s last 50
                games, home and road together: goals and expected goals, each padded
                with ten games of league-average play. Expected goals for and against
                are those strengths against an average opponent at the league&apos;s
                home and road scoring rates. Rating is twice attack minus twice
                defense. The window column counts the home and road games behind the
                numbers.
              </p>
            </HowGraded>
          </div>
        </div>
      </PageHeader>
      <NhlRatingsTable ratings={ratings} teams={teams} />
    </PageShell>
  );
}
