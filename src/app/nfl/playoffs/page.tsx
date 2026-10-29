import type { Metadata } from "next";
import {
  PageDescription,
  PageHeader,
  PageShell,
  PageTitle,
} from "@/components/page-layout";
import { NflPlayoffViewer } from "@/components/nfl-playoff-viewer";
import { fetchNflPlayoffForecast } from "@/lib/nfl-playoffs.server";
import { fetchTeams } from "@/lib/nfl";
export const revalidate = 3600;
export const metadata: Metadata = {
  title: "NFL Playoff & Super Bowl Forecast",
  description:
    "The projected NFL bracket, division races, and each team's chance to reach and win the Super Bowl.",
};
export default async function NflPlayoffsPage() {
  const [payload, teams] = await Promise.all([
    fetchNflPlayoffForecast(),
    fetchTeams(),
  ]);
  const identities = Object.fromEntries(
    [...teams].map(([id, t]) => [
      id,
      { logo_light: t.logo_light, logo_dark: t.logo_dark },
    ]),
  );
  return (
    <PageShell width="wide">
      <PageHeader>
        <div>
          <p className="type-eyebrow mb-2 text-muted-foreground">
            NFL / Playoff forecast
          </p>
          <PageTitle>The road to the Super Bowl</PageTitle>
          <PageDescription>
            Two conferences. Fourteen teams. One champion.
          </PageDescription>
        </div>
      </PageHeader>
      {payload ? (
        <NflPlayoffViewer payload={payload} identities={identities} />
      ) : (
        <section className="rounded-xl border border-dashed border-border p-8 text-center sm:p-16">
          <h2 className="type-section">
            The playoff forecast is not available yet
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            The bracket and division races will appear when a complete forecast
            is published.
          </p>
        </section>
      )}
    </PageShell>
  );
}
