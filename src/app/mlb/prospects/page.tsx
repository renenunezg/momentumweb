import { PageDescription, PageHeader, PageShell, PageTitle, PageMeta } from "@/components/page-layout";
import type { Metadata } from "next";
import { fetchFarmSystems, fetchProspectPage, fetchProspectSummary, fetchTopProspects } from "@/lib/mlb-prospects";
import { LastUpdated } from "@/components/last-updated";
import MlbProspects from "@/components/mlb-prospects";
import { DEFAULT_PROSPECT_FILTERS } from "@/lib/prospect-values";

// Every read here is expired by the revalidation webhook when its table is
// published, and nothing on the page depends on the clock, so the week is only
// a backstop.
export const revalidate = 604800;

export const metadata: Metadata = {
  title: "MLB Prospect Values",
  description:
    "A peak grade on the MLB 20 to 80 scale, the chance of becoming a regular, an ETA, and a trade value in dollars for every rookie-eligible player in affiliated baseball.",
};

export default async function MlbProspectsPage() {
  // Both tabs' first pages are read here so switching costs no request; a
  // failure throws so ISR keeps the last good page.
  const [hitters, pitchers, summary, farms, top] = await Promise.all([
    fetchProspectPage({ ...DEFAULT_PROSPECT_FILTERS, role: "hitter" }, 0),
    fetchProspectPage({ ...DEFAULT_PROSPECT_FILTERS, role: "pitcher" }, 0),
    fetchProspectSummary(),
    fetchFarmSystems(),
    fetchTopProspects(),
  ]);
  const total = (hitters.total ?? hitters.rows.length) + (pitchers.total ?? pitchers.rows.length);

  if (total === 0) {
    return (
      <PageShell>
        <PageTitle>Prospects</PageTitle>
        <p className="text-muted-foreground">No prospect values have been published yet.</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>Prospects</PageTitle>
          <PageMeta>
            {summary.season != null && (
              <PageDescription className="type-eyebrow">
                Through the {summary.season} season
              </PageDescription>
            )}
            <LastUpdated timestamp={summary.updatedAt} schedule="Updates weekly" />
          </PageMeta>
        </div>
      </PageHeader>

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Expected peak, chance of sticking, and trade value for every rookie-eligible player in the minors, the top 100
        of them together, and every farm system ranked by its top 30.
      </p>

      <MlbProspects initial={{ hitter: hitters, pitcher: pitchers }} leaders={summary.leaders} farms={farms} top={top} />
    </PageShell>
  );
}
