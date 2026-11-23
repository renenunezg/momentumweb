import { PageDescription, PageHeader, PageShell, PageTitle, PageMeta } from "@/components/page-layout";
import type { Metadata } from "next";
import { LastUpdated } from "@/components/last-updated";
import LmbProspects from "@/components/lmb-prospects";
import { fetchLmbProspects } from "@/lib/lmb-data";

// Every read here is expired by the revalidation webhook when its table is
// published, and nothing on the page depends on the clock, so the week is only
// a backstop.
export const revalidate = 604800;

export const metadata: Metadata = {
  title: "LMB Prospect Rankings",
  description:
    "Young players in and around the Liga Mexicana de Béisbol, batters and pitchers ranked separately by the LMB prospect model.",
};

export default async function LmbProspectsPage() {
  const rows = await fetchLmbProspects();

  if (rows.length === 0) {
    return (
      <PageShell>
        <PageTitle>Prospects</PageTitle>
        <p className="text-muted-foreground">No prospect rankings have been published yet.</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>Prospects</PageTitle>
          <PageMeta>
            <PageDescription className="type-eyebrow">Through the {rows[0].snapshot_season} season</PageDescription>
            <LastUpdated timestamp={rows[0].scored_at} schedule="Updates when the model is rescored" />
          </PageMeta>
        </div>
      </PageHeader>

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Young players in the LMB and Mexican-born players in the Mexican Pacific League (LMP) and affiliated minors
        (MiLB), batters and pitchers ranked separately. Select a row for the player card and season stats; the model
        orders them without showing an uncalibrated probability.
      </p>

      <LmbProspects rows={rows} />
    </PageShell>
  );
}
