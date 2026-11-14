import { formatSiteTimestamp } from "@/lib/site-time";
import { PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import Link from "next/link";
import {
  PickBreakdown,
  PickKpis,
  PickPolicy,
} from "@/components/football-picks";
import { PickFilters } from "@/components/football-pick-filters";
import { FootballPerformanceTabs } from "@/components/football-performance-tabs";
import { NhlForecastAccuracy } from "@/components/nhl-forecast-accuracy";
import { NhlPickTrends } from "@/components/nhl-pick-trends";
import { Notice } from "@/components/notice";
import {
  fetchNhlPickSummary,
  MARKET_LABELS,
  pickFilters,
  pickQuery,
  selectedPickMetric,
} from "@/lib/nhl-picks";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "NHL Model Performance",
  description:
    "Win-probability and total-goals accuracy of the NHL model against the closing line, on the live season and the backtest, plus the record, units over time, ROI, and closing-line value of its moneyline and total predictions.",
};

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{
    season?: string;
    market?: string;
    period?: string;
    view?: string;
    source?: string;
  }>;
}) {
  const params = await searchParams;
  const filters = pickFilters(params);
  const query = pickQuery(filters).toString();
  if (params.view !== "picks") {
    const source = params.source === "backtest" ? "backtest" : "live";
    return (
      <PageShell>
        <PageTitle>NHL Model Performance</PageTitle>
        <FootballPerformanceTabs sport="nhl" active="accuracy" query={query}>
          <NhlForecastAccuracy source={source} page="performance" />
        </FootballPerformanceTabs>
      </PageShell>
    );
  }
  const summary = await fetchNhlPickSummary(filters);
  const market = filters.market;
  const metric = selectedPickMetric(summary.metrics, market);
  const settled = (metric?.wins ?? 0) + (metric?.losses ?? 0) + (metric?.pushes ?? 0);
  // Oldest rule first, so the last row is the rule now making predictions.
  const rules = summary.byRule.filter((row) => row.market === market);

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>NHL Model Performance</PageTitle>
          <div className="mt-heading">
            <PickPolicy
              sport="nhl"
              firstDecision={metric?.first_decision_at}
              lead="Moneyline and total predictions, graded at the partner-book prices recorded when they were made."
            >
              <p>
                Moneyline favorites have odds below -100. Odds of +100 or -100 are
                shown as even money. Totals split by Over and Under. Each segment
                uses the frozen predicted side and price.
              </p>
            </PickPolicy>
          </div>
        </div>
        <Link href={`/nhl/history?${query}&view=picks`} className="text-sm underline underline-offset-4">
          View prediction history
        </Link>
      </PageHeader>
      <FootballPerformanceTabs sport="nhl" active="picks" query={query}>
        <div className="space-y-section">
          <PickFilters
            seasonOptions={summary.seasons}
            season={filters.season}
            latestSeason={summary.latestSeason}
            market={market}
            period={filters.period}
            view="picks"
          />
          <PickKpis
            metric={metric}
            unavailable={summary.unavailable}
            roiError={summary.roiError.find((row) => row.market === market)?.roi_se}
            ruleEv={rules.at(-1)}
          />
          {summary.unavailable ? (
            <Notice role="status">
              Prediction results are currently unavailable. Forecast
              accuracy remains available in its tab.
            </Notice>
          ) : !metric?.picks ? (
            <Notice>
              No predictions recorded for this selection yet.
              {metric?.no_plays ? ` ${metric.no_plays} market decisions were No Play.` : ""}{" "}
              The backtest is available in the Forecast accuracy tab.
            </Notice>
          ) : (
            <p className="text-sm text-muted-foreground">
              {metric.picks} predictions across {metric.unique_games ?? 0} unique
              games · {metric.no_plays} No Play decisions · {settled} settled.{" "}
              {settled < 30
                ? "The sample is too small to establish a reliable edge."
                : "Past results do not guarantee future returns."}
              {metric.last_graded_at && (
                <span className="block mt-1 text-xs">
                  Last graded: {formatSiteTimestamp(metric.last_graded_at)}
                </span>
              )}
            </p>
          )}
          <NhlPickTrends byDay={summary.byDay} closing={summary.closing} rules={rules} market={market} />
          {(["h2h", "totals"] as const)
            .filter((value) => market === "all" || value === market)
            .map((value) => (
              <PickBreakdown
                key={value}
                title={`${MARKET_LABELS[value]} record`}
                rows={[
                  ...summary.metrics.filter(
                    (m) => m.segment_kind === "market" && m.segment === value,
                  ),
                  ...summary.metrics
                    .filter(
                      (m) => m.segment_kind === "side" && m.segment?.startsWith(`${value}:`),
                    )
                    .sort((a, b) => (a.segment ?? "").localeCompare(b.segment ?? "")),
                ]}
              />
            ))}
          <PickBreakdown
            title="By month"
            rows={summary.metrics
              .filter((m) => m.segment_kind === "month")
              .sort((a, b) => (a.segment ?? "").localeCompare(b.segment ?? ""))}
          />
          <PickBreakdown
            title="By edge"
            rows={summary.metrics
              .filter((m) => m.segment_kind === "edge" && (m.picks ?? 0) > 0)
              .sort((a, b) => (a.segment ?? "").localeCompare(b.segment ?? "", undefined, { numeric: true }))}
          />
        </div>
      </FootballPerformanceTabs>
    </PageShell>
  );
}
