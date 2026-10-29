import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import {
  PageDescription,
  PageHeader,
  PageShell,
  PageTitle,
} from "@/components/page-layout";
import { CfbPlayoffViewer } from "@/components/cfb-playoff-viewer";
import { fetchCfbPlayoffForecast } from "@/lib/cfb-playoffs.server";
import { fetchTeams } from "@/lib/cfb";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "CFB Playoff & Conference Forecast",
  description:
    "Explore projected college football playoff matchups, conference races, and each team's chances to qualify, earn a bye, and win a championship.",
};

export default async function CfbPlayoffsPage() {
  const [payload, teams] = await Promise.all([
    fetchCfbPlayoffForecast(),
    fetchTeams(),
  ]);
  const identities = Object.fromEntries(
    [...teams]
      .filter(([id]) =>
        payload?.teams.some(
          (row) => row[payload.team_columns.indexOf("id")] === id,
        ),
      )
      .map(([id, t]) => [
        id,
        { logo_light: t.logo_light, logo_dark: t.logo_dark },
      ]),
  );
  return (
    <PageShell width="wide">
      <PageHeader>
        <div>
          <p className="type-eyebrow mb-2 text-muted-foreground">
            CFB / Playoff forecast
          </p>
          <PageTitle>The road to twelve</PageTitle>
          <PageDescription>
            Every remaining game. The playoff picture and the conference races
            that shape it.
          </PageDescription>
        </div>
        <Trophy
          className="hidden size-10 text-primary sm:block"
          aria-hidden="true"
        />
      </PageHeader>
      {payload ? (
        <CfbPlayoffViewer payload={payload} identities={identities} />
      ) : (
        <section className="rounded-xl border border-dashed border-border p-8 text-center sm:p-16">
          <h2 className="type-section">
            The playoff forecast is not available yet
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            The bracket and conference races will appear when a complete
            forecast is available.
          </p>
        </section>
      )}
    </PageShell>
  );
}
