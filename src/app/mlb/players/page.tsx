import { PageDescription, PageHeader, PageShell, PageTitle, PageMeta } from "@/components/page-layout";
import type { Metadata } from "next";
import { fetchPlayerValues } from "@/lib/mlb-players";
import { fetchBattingValueListing } from "@/lib/mlb-batting-value";
import { fetchPitchValueListing } from "@/lib/mlb-pitch-value";
import { LastUpdated } from "@/components/last-updated";
import MlbPlayerValues from "@/components/mlb-player-values";
import { MLB_PLAYER_SECTIONS, PlayerSectionTabs } from "@/components/player-section-tabs";

// Every read here is expired by the revalidation webhook when its table is
// published, and nothing on the page depends on the clock, so the week is only
// a backstop.
export const revalidate = 604800;

export async function generateMetadata(): Promise<Metadata> {
  const values = await fetchPlayerValues();
  const year = values.season ?? new Date().getFullYear();
  return {
    title: `MLB Player Grades ${year}`,
    description: `A projected 20 to 80 grade, a trade value in dollars over control years, and last season's wins above replacement for every MLB 40-man player, built from skill measurements.`,
  };
}

export default async function MlbPlayersPage() {
  // A failed read throws so ISR keeps the last good page.
  const [{ season, index, updatedAt }, batting, pitching] = await Promise.all([
    fetchPlayerValues(),
    fetchBattingValueListing(),
    fetchPitchValueListing(),
  ]);

  if (season == null || index.length === 0) {
    return (
      <PageShell>
        <PageTitle>Player Grades</PageTitle>
        <p className="text-muted-foreground">No player grades have been published yet.</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>Player Grades</PageTitle>
          <PageMeta>
            <PageDescription className="type-eyebrow">
              Projecting the {season} season
            </PageDescription>
            <LastUpdated timestamp={updatedAt} schedule="Updates nightly" />
          </PageMeta>
        </div>
      </PageHeader>
      <PlayerSectionTabs sections={MLB_PLAYER_SECTIONS} label="Player pages" />

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Projected talent, trade value, and on-field impact.
      </p>

      <MlbPlayerValues index={index} runValues={{ batting, pitching }} />
    </PageShell>
  );
}
