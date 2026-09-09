import type { Metadata } from "next";
import { Notice } from "@/components/notice";
import Link from "next/link";
import {
  fetchNflPickSummary,
  pickFilters,
  pickQuery,
  MARKET_LABELS,
  selectedPickMetric,
} from "@/lib/nfl-picks";
import {
  PickBreakdown,
  PickKpis,
  PickPolicy,
} from "@/components/football-picks";
import { PickFilters } from "@/components/football-pick-filters";
import { FootballPerformanceTabs } from "@/components/football-performance-tabs";
import ForecastPerformance from "@/components/nfl-forecast-performance";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "NFL Model Performance",
  description:
    "Record, ROI, and frozen-price results for the NFL model's recommended moneyline, spread and total picks, plus forecast accuracy against the market.",
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
  if (params.view === "accuracy" || params.source) {
    return (
      <main
        id="main"
        className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 py-8"
      >
        <h1 className="font-heading text-2xl tracking-tight">
          NFL Model Performance
        </h1>
        <FootballPerformanceTabs sport="nfl" active="accuracy" query={query}>
          <ForecastPerformance searchParams={Promise.resolve(params)} />
        </FootballPerformanceTabs>
      </main>
    );
  }
  const summary = await fetchNflPickSummary(filters);
  const market = filters.market;
  const metric = selectedPickMetric(summary.metrics, market);
  const settled =
    (metric?.wins ?? 0) + (metric?.losses ?? 0) + (metric?.pushes ?? 0);
  const historyUrl = `/nfl/history?${query}`;

  return (
    <main
      id="main"
      className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 py-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">
            NFL Model Performance
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            How the NFL model&apos;s moneyline, spread and total picks have
            done: recommended picks, the prices recorded at the time, and graded
            results.
          </p>
        </div>
        <Link
          href={historyUrl}
          className="text-sm underline underline-offset-4"
        >
          View pick history
        </Link>
      </div>
      <FootballPerformanceTabs sport="nfl" active="picks" query={query}>
        <div className="space-y-7">
          <PickFilters
            seasonOptions={summary.seasons}
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
              {metric.picks} recommendations across {metric.unique_games ?? 0}{" "}
              unique games · {metric.no_plays} No Play decisions · {settled}{" "}
              settled.{" "}
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
            have odds below -100; odds of +100 or -100 are shown as even money.
            A zero spread is pick’em. Each segment uses the frozen recommended
            side and price.
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
          <PickPolicy sport="nfl" firstDecision={metric?.first_decision_at} />
        </div>
      </FootballPerformanceTabs>
    </main>
  );
}
