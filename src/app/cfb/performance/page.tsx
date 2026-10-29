import { formatSiteTimestamp } from "@/lib/site-time";
import { PlayerModelPerformance } from "@/components/player-model-performance";
import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { Notice } from "@/components/notice";
import Link from "next/link";
import { fetchLivePerformance } from "@/lib/cfb";
import {
  fetchCfbPickSummary,
  pickFilters,
  pickQuery,
  MARKET_LABELS,
  selectedPickMetric,
} from "@/lib/cfb-picks";
import { PickBreakdown, PickKpis, PickPolicy } from "@/components/cfb-picks";
import { PickFilters } from "@/components/cfb-pick-filters";
import { CfbPerformanceTabs } from "@/components/cfb-performance-tabs";
import ForecastPerformance from "@/components/cfb-forecast-performance";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "College Football Model Performance",
  description:
    "Forecast accuracy of the college football model against the closing line, plus the record, ROI, and recorded prices of its recommended moneyline, spread and total predictions.",
};

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{
    season?: string;
    market?: string;
    period?: string;
    view?: string;
  }>;
}) {
  const params = await searchParams;
  const filters = pickFilters(params);
  const query = pickQuery(filters).toString();
  if (params.view === "players") {
    return (
      <PageShell>
        <PageTitle>College Football Model Performance</PageTitle>
        <CfbPerformanceTabs active="players" query={query}>
          <PlayerModelPerformance sport="cfb" />
        </CfbPerformanceTabs>
      </PageShell>
    );
  }
  if (params.view !== "picks") {
    const live = await fetchLivePerformance();
    return (
      <PageShell>
        <PageTitle>
          College Football Model Performance
        </PageTitle>
        <CfbPerformanceTabs active="accuracy" query={query}>
          <ForecastPerformance live={live} />
        </CfbPerformanceTabs>
      </PageShell>
    );
  }
  const summary = await fetchCfbPickSummary(filters);
  const market = filters.market;
  const metric = selectedPickMetric(summary.metrics, market);
  const settled =
    (metric?.wins ?? 0) + (metric?.losses ?? 0) + (metric?.pushes ?? 0);
  const historyUrl = `/cfb/history?${query}&view=picks`;

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>
            College Football Model Performance
          </PageTitle>
          <PageDescription className="max-w-2xl">
            How the college football model&apos;s moneyline, spread and total
            predictions have done: recommended predictions, the prices recorded at the time,
            and graded results.
          </PageDescription>
        </div>
        <Link
          href={historyUrl}
          className="text-sm underline underline-offset-4"
        >
          View prediction history
        </Link>
      </PageHeader>
      <CfbPerformanceTabs active="picks" query={query}>
        <div className="space-y-section">
          <PickFilters
            season={filters.season}
            latestSeason={summary.latestSeason}
            market={market}
            period={filters.period}
            view="picks"
          />
          <PickKpis metric={metric} unavailable={summary.unavailable} />
          {summary.unavailable ? (
            <Notice role="status">
              Prediction results are currently unavailable. Forecast
              accuracy remains available in its tab.
            </Notice>
          ) : !metric?.picks ? (
            <Notice>
              No recommendations recorded for this selection yet.
              {metric?.no_plays
                ? ` ${metric.no_plays} market decisions were No Play.`
                : ""}{" "}
              Past forecast accuracy is available in the Forecast accuracy tab.
            </Notice>
          ) : (
            <p className="text-sm text-muted-foreground">
              {metric.picks} recommendations · {metric.no_plays} No Play
              decisions · {settled} settled.{" "}
              {settled < 30
                ? "The sample is too small to establish a reliable edge."
                : "These are observed results, not a guarantee of future returns."}
              {metric.last_graded_at && (
                <span className="block mt-1 text-xs">
                  Last graded:{" "}
                  {formatSiteTimestamp(metric.last_graded_at)}
                </span>
              )}
            </p>
          )}
          <PickBreakdown
            title="Edge-qualified and exploratory"
            rows={summary.metrics.filter((m) => m.segment_kind === "qualification")}
          />
          <p className="text-xs text-muted-foreground">
            Overall results include every recorded recommendation at one unit per prediction.
            Exploratory predictions fall below the standard edge threshold and contribute toward the weekly research target.
          </p>
          {(["h2h", "spreads", "totals"] as const)
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
                      (m) =>
                        m.segment_kind === "side" &&
                        m.segment?.startsWith(`${value}:`),
                    )
                    .sort((a, b) =>
                      (a.segment ?? "").localeCompare(b.segment ?? ""),
                    ),
                ]}
              />
            ))}
          <p className="text-xs text-muted-foreground">
            Spread favorites give points (for example -3); underdogs receive
            points (+3). Totals split by Over and Under. Moneyline favorites
            have negative odds; odds of +100 or -100 are shown as even money.
            Each segment uses the frozen recommended side and price.
          </p>
          <>
            <PickBreakdown
              title="By week"
              rows={summary.metrics
                .filter((m) => m.segment_kind === "week")
                .sort((a, b) =>
                  (a.segment ?? "").localeCompare(b.segment ?? "", undefined, {
                    numeric: true,
                  }),
                )}
            />
            <PickBreakdown
              title="By probability edge"
              rows={summary.metrics
                .filter((m) => m.segment_kind === "edge" && (m.picks ?? 0) > 0)
                .sort(
                  (a, b) =>
                    parseFloat(a.segment ?? "0") - parseFloat(b.segment ?? "0"),
                )}
            />
          </>
          <PickPolicy firstDecision={metric?.first_decision_at} />
        </div>
      </CfbPerformanceTabs>
    </PageShell>
  );
}
