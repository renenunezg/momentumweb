import { PageDescription, PageHeader, PageShell, PageTitle, PageMeta } from "@/components/page-layout";
import type { Metadata } from "next";
import { HowGraded } from "@/components/how-graded";
import { LastUpdated } from "@/components/last-updated";
import LmbPlayerRatings from "@/components/lmb-player-ratings";
import { parseRatingModel } from "@/lib/lmb";
import { fetchLmbPlayerRatings } from "@/lib/lmb-data";
import { formatNumber } from "@/lib/utils";

// Every read here is expired by the revalidation webhook when its table is
// published, and nothing on the page depends on the clock, so the week is only
// a backstop.
export const revalidate = 604800;

export async function generateMetadata(): Promise<Metadata> {
  const { rows } = await fetchLmbPlayerRatings();
  const year = rows[0]?.grade_season ?? new Date().getFullYear();
  return {
    title: `LMB Player Grades ${year}`,
    description:
      "A projected 20 to 80 grade and projected WAR for every Liga Mexicana de Béisbol player, with last season's wins above replacement from play-by-play.",
  };
}

export default async function LmbPlayersPage() {
  // A failed read throws so ISR keeps the last good page.
  const { model, rows } = await fetchLmbPlayerRatings();

  if (model == null || rows.length === 0) {
    return (
      <PageShell>
        <PageTitle>Player Grades</PageTitle>
        <p className="text-muted-foreground">No player grades have been published yet.</p>
      </PageShell>
    );
  }

  const { season, grade_season: gradeSeason } = rows[0];
  const fit = parseRatingModel(model.details, season);
  const updatedAt = rows.reduce((latest, row) => (row.updated_at > latest ? row.updated_at : latest), rows[0].updated_at);

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>Player Grades</PageTitle>
          <PageMeta>
            <PageDescription className="type-eyebrow">Projecting the {gradeSeason} season</PageDescription>
            <LastUpdated timestamp={updatedAt} schedule="Updates when the model is rescored" />
          </PageMeta>
        </div>
      </PageHeader>

      <HowGraded label="How this works" lead={<>Projected talent and last season&apos;s wins above replacement.</>}>
        <p>
          WAR counts each player&apos;s runs from LMB play-by-play, adjusted for park and month, with zone-based
          fielding and baserunning, a position adjustment and a replacement level, then divides them by the season&apos;s
          runs per win{fit.runsPerWin != null && <> ({formatNumber(fit.runsPerWin, 2)} in {season})</>}.
          {fit.reconciliation != null && (
            <>
              {" "}Team WAR plus replacement wins tracks actual wins at r {formatNumber(fit.reconciliation.r, 2)} over{" "}
              {fit.reconciliation.teams} team seasons from 2021 to {season}.
            </>
          )}
        </p>
        <p>
          The grade projects each player&apos;s {gradeSeason} talent on a 20 to 80 scale. It forecasts the next season
          about as well as a simple weighted average of his last three seasons.
        </p>
      </HowGraded>

      <LmbPlayerRatings rows={rows} model={fit} />
    </PageShell>
  );
}
