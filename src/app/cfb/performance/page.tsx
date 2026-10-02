import { PageDescription, PageHeader, PageSection, PageShell, PageTitle } from "@/components/page-layout";
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
import { KpiCard } from "@/components/kpi-card";
import { formatNumber, formatPct, formatSigned } from "@/lib/utils";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "College Football Model Performance",
  description:
    "Record, ROI, and closing-line results for the college football model's recommended moneyline, spread and total picks, plus forecast accuracy against the market.",
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
  if (params.view === "accuracy") {
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
  const [summary, live] = await Promise.all([
    fetchCfbPickSummary(filters),
    fetchLivePerformance(),
  ]);
  const market = filters.market;
  const metric = selectedPickMetric(summary.metrics, market);
  // Grade the published market-informed forecast; seasons recorded before it
  // existed fall back to the pure model.
  const overall =
    filters.season === null || live.season === filters.season
      ? live.metrics.filter((m) => m.segment_kind === "overall")
      : [];
  const published =
    overall.find((m) => m.prediction_source === "market_informed") ??
    overall.find((m) => m.prediction_source === "pure_model") ??
    null;
  const settled =
    (metric?.wins ?? 0) + (metric?.losses ?? 0) + (metric?.pushes ?? 0);
  const historyUrl = `/cfb/history?${query}`;

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>
            College Football Model Performance
          </PageTitle>
          <PageDescription className="max-w-2xl">
            How the college football model&apos;s moneyline, spread and total
            picks have done: recommended picks, the prices recorded at the time,
            and graded results.
          </PageDescription>
        </div>
        <Link
          href={historyUrl}
          className="text-sm underline underline-offset-4"
        >
          View pick history
        </Link>
      </PageHeader>
      <CfbPerformanceTabs active="picks" query={query}>
        <div className="space-y-section">
          <PickFilters
            season={filters.season}
            latestSeason={summary.latestSeason}
            market={market}
            period={filters.period}
          />
          <PickKpis metric={metric} unavailable={summary.unavailable} />
          {summary.unavailable ? (
            <Notice role="status">
              Recommendation results are currently unavailable. Forecast
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
                  {new Date(metric.last_graded_at)
                    .toISOString()
                    .replace("T", " ")
                    .slice(0, 16)}{" "}
                  UTC
                </span>
              )}
            </p>
          )}
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
          {published && (
            <PageSection>
              <h2 className="font-heading text-lg">
                Forecast accuracy at a glance
              </h2>
              <p className="text-xs text-muted-foreground">
                All {published.games} published forecasts graded in {live.season}, including
                games without a recommendation. Full comparisons and historical
                backtests are in the Forecast accuracy tab.
              </p>
              <div className="grid grid-cols-2 gap-4 border-y border-rule-strong py-4 sm:grid-cols-4">
                <KpiCard
                  label="Margin MAE"
                  value={formatNumber(published.margin_mae, 2)}
                  sub="points"
                />
                <KpiCard
                  label="Gap to market"
                  value={formatSigned(published.model_minus_market_mae, 2)}
                  sub="MAE difference; lower is better"
                />
                <KpiCard
                  label="Total MAE"
                  value={
                    published.total_games
                      ? formatNumber(published.total_mae, 2)
                      : "–"
                  }
                  sub={`points, ${published.total_games ?? 0} games`}
                />
                <KpiCard
                  label="80% coverage"
                  value={formatPct(published.coverage_80)}
                  sub="target 80%"
                />
              </div>
            </PageSection>
          )}
          <PickPolicy firstDecision={metric?.first_decision_at} />
        </div>
      </CfbPerformanceTabs>
    </PageShell>
  );
}
