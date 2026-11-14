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
// The webhook refreshes the forecast; the day bounds the stale-results notice
// below, which is judged against the clock.
export const revalidate = 86400;
export const metadata: Metadata = {
  title: "NFL Playoff & Super Bowl Forecast",
  description:
    "The projected NFL bracket, division races, and each team's chance to reach and win the Super Bowl.",
};
// Judged on the server when the page regenerates, so the browser never reads
// the clock during render; the daily regeneration bounds the lag.
function isStale(resultsAsOf: string) {
  return Date.now() - Date.parse(resultsAsOf) > 48 * 3600 * 1000;
}
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
          <PageTitle>Playoff and Super Bowl Forecast</PageTitle>
          <PageDescription>
            The projected bracket, division races, and each team&apos;s chance to
            reach and win the Super Bowl.
          </PageDescription>
        </div>
      </PageHeader>
      {payload ? (
        <NflPlayoffViewer
          payload={payload}
          identities={identities}
          stale={isStale(payload.results_as_of)}
        />
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
