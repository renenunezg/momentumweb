import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { fetchProspectPage, fetchProspectSummary } from "@/lib/mlb-prospects";
import { DEFAULT_PROSPECT_FILTERS, PEAK_GRADE_TIP, PROSPECT_TRADE_VALUE_TIP } from "@/lib/prospect-values";
import { formatMillions } from "@/lib/player-values";
import { formatNumber } from "@/lib/utils";
import { KpiCard } from "@/components/kpi-card";
import { LastUpdated } from "@/components/last-updated";
import MlbProspects from "@/components/mlb-prospects";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "MLB Prospect Values",
  description:
    "A peak grade on the MLB 20 to 80 scale, the chance of becoming a regular, an ETA, and a trade value in dollars for every rookie-eligible player in affiliated baseball.",
};

export default async function MlbProspectsPage() {
  // Three small reads per regeneration; a failure throws so ISR keeps the last good page.
  const [first, summary] = await Promise.all([fetchProspectPage(DEFAULT_PROSPECT_FILTERS, 0), fetchProspectSummary()]);
  const total = first.total ?? first.rows.length;

  if (total === 0) {
    return (
      <PageShell>
        <PageTitle>Prospects</PageTitle>
        <p className="text-muted-foreground">No prospect values have been published yet.</p>
      </PageShell>
    );
  }

  const topValue = first.rows[0]?.trade_value_musd != null ? first.rows[0] : null;
  const top = summary.topGrade;

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>Prospects</PageTitle>
          {summary.season != null && (
            <PageDescription className="type-eyebrow">
              Through the {summary.season} season
            </PageDescription>
          )}
        </div>
        <LastUpdated timestamp={summary.updatedAt} schedule="Updates weekly" />
      </PageHeader>

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Expected peak, chance of sticking, and trade value for every rookie-eligible player in the minors. Open a player for traits and what moved his grade.
      </p>

      <div className="grid grid-cols-3 gap-3 border-y border-rule-strong [&>div]:py-3 sm:gap-4">
        <KpiCard
          compact
          label="Top peak grade"
          value={top?.player_name ?? "–"}
          sub={top ? `${top.org ?? "–"} · ${top.position_group} · ${formatNumber(top.peak_grade, 0)} grade` : "no graded prospects"}
          tooltip={PEAK_GRADE_TIP}
        />
        <KpiCard
          compact
          label="Trade value"
          value={topValue?.player_name ?? "–"}
          sub={topValue ? `${topValue.org ?? "–"} · ${topValue.position_group} · ${formatMillions(topValue.trade_value_musd)}` : "no graded prospects"}
          tooltip={PROSPECT_TRADE_VALUE_TIP}
        />
        <KpiCard
          compact
          label="Graded"
          value={formatNumber(summary.graded, 0)}
          sub={`of ${formatNumber(total, 0)} prospects`}
          tooltip="Prospects with enough playing time in the last three seasons. Pitcher grades come from a model that has not yet beaten its baseline on the validation check; read them as provisional."
        />
      </div>

      <MlbProspects initial={first} />
    </PageShell>
  );
}
