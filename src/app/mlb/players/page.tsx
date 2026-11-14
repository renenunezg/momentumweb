import { PageDescription, PageHeader, PageShell, PageTitle, PageMeta } from "@/components/page-layout";
import type { Metadata } from "next";
import { fetchPlayerValues } from "@/lib/mlb-players";
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
    title: `MLB Player Values ${year}`,
    description: `A projected 20 to 80 grade, a trade value in dollars over control years, and this season's wins above replacement for every MLB 40-man player, built from skill measurements rather than box score totals.`,
  };
}

export default async function MlbPlayersPage() {
  // A failed read throws so ISR keeps the last good page.
  const { season, index, updatedAt } = await fetchPlayerValues();

  if (season == null || index.length === 0) {
    return (
      <PageShell>
        <PageTitle>Player Values</PageTitle>
        <p className="text-muted-foreground">No player values have been published yet.</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>Player Values</PageTitle>
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

      <MlbPlayerValues index={index} />
    </PageShell>
  );
}
