import type { Metadata } from "next";
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

export const revalidate = 300;
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
      <main
        id="main"
        className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 py-8"
      >
        <h1 className="font-heading text-2xl tracking-tight">
          College Football Model Performance
        </h1>
        <CfbPerformanceTabs active="accuracy" query={query}>
          <ForecastPerformance live={live} />
        </CfbPerformanceTabs>
      </main>
    );
  }
  const [summary, live] = await Promise.all([
    fetchCfbPickSummary(filters),
    fetchLivePerformance(),
  ]);
  const market = filters.market;
  const metric = selectedPickMetric(summary.metrics, market);
  const pure =
    filters.season === null || live.season === filters.season
      ? live.metrics.find(
          (m) =>
            m.segment_kind === "overall" &&
            m.prediction_source === "pure_model",
        )
      : null;
  const settled =
    (metric?.wins ?? 0) + (metric?.losses ?? 0) + (metric?.pushes ?? 0);
  const historyUrl = `/cfb/history?${query}`;

  return (
    <main
      id="main"
      className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 py-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">
            College Football Model Performance
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            How the college football model&apos;s moneyline, spread and total
            picks have done: recommended picks, the prices recorded at the time,
            and graded results.
          </p>
        </div>
        <Link
          href={historyUrl}
          className="text-sm underline underline-offset-4"
        >
          View pick history
        </Link>
      </div>
      <CfbPerformanceTabs active="picks" query={query}>
        <div className="space-y-7">
          <PickFilters
            season={filters.season}
            latestSeason={summary.latestSeason}
            market={market}
            period={filters.period}
          />
          <PickKpis metric={metric} unavailable={summary.unavailable} />
          {summary.unavailable ? (
            <p
              role="status"
              className="rounded-md border border-border bg-muted/30 p-4 text-sm"
            >
              Recommendation results are currently unavailable. Forecast
              accuracy remains available in its tab.
            </p>
          ) : !metric?.picks ? (
            <p className="rounded-md border border-border bg-muted/30 p-4 text-sm">
              No recommendations recorded for this selection yet.
              {metric?.no_plays
                ? ` ${metric.no_plays} market decisions were No Play.`
                : ""}{" "}
              Past forecast accuracy is available in the Forecast accuracy tab.
            </p>
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
          {pure && (
            <section className="space-y-3">
              <h2 className="font-heading text-lg">
                Forecast accuracy at a glance
              </h2>
              <p className="text-xs text-muted-foreground">
                All {pure.games} graded forecasts in {live.season}, including
                games without a recommendation. Full comparisons and historical
                backtests are in the Forecast accuracy tab.
              </p>
              <div className="grid grid-cols-2 gap-4 border-y border-rule-strong py-4 sm:grid-cols-4">
                <KpiCard
                  label="Margin MAE"
                  value={formatNumber(pure.margin_mae, 2)}
                  sub="points"
                />
                <KpiCard
                  label="Gap to market"
                  value={formatSigned(pure.model_minus_market_mae, 2)}
                  sub="MAE difference; lower is better"
                />
                <KpiCard
                  label="Total MAE"
                  value={formatNumber(pure.total_mae, 2)}
                  sub="points"
                />
                <KpiCard
                  label="80% coverage"
                  value={formatPct(pure.coverage_80)}
                  sub="target 80%"
                />
              </div>
            </section>
          )}
          <PickPolicy firstDecision={metric?.first_decision_at} />
        </div>
      </CfbPerformanceTabs>
    </main>
  );
}
