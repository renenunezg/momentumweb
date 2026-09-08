import type { Metadata } from "next";
import { Notice } from "@/components/notice";
import Link from "next/link";
import ForecastHistory from "@/components/cfb-forecast-history";
import { HistoryPager } from "@/components/graded-history";
import { PickKpis, PickPolicy, PickTable } from "@/components/cfb-picks";
import {
  fetchCfbPickHistory,
  fetchCfbPickSummary,
  PICK_PAGE_SIZE,
  pickFilters,
  pickQuery,
  selectedPickMetric,
} from "@/lib/cfb-picks";
import { redirect } from "next/navigation";
import { PickFilters } from "@/components/cfb-pick-filters";
import { pageNumber } from "@/lib/utils";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "College Football Pick History",
  description:
    "Every college football moneyline, spread and total pick with the side, line, and odds recorded before kickoff and how it graded, plus forecast and backtest history.",
};

type Params = {
  season?: string;
  market?: string;
  page?: string;
  view?: string;
  team?: string;
  period?: string;
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  if (params.view === "accuracy" || params.season === "backtest")
    return <ForecastHistory searchParams={searchParams} />;
  const filters = pickFilters(params, "7");
  const market = filters.market;
  const page = pageNumber(params.page);
  const [summary, history] = await Promise.all([
    fetchCfbPickSummary(filters),
    fetchCfbPickHistory(filters, page),
  ]);
  const metric = selectedPickMetric(summary.metrics, market);
  const count = (metric?.picks ?? 0) + (metric?.no_plays ?? 0);
  const totalPages = Math.max(1, Math.ceil(count / PICK_PAGE_SIZE));
  function pageUrl(value: number) {
    const query = pickQuery(filters);
    query.set("page", String(value));
    return `/cfb/history?${query}`;
  }
  if (!summary.unavailable && page > totalPages) redirect(pageUrl(totalPages));
  return (
    <main
      id="main"
      className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 py-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">
            College Football Pick History
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The side, line, and odds recorded before kickoff, with each
            pick&apos;s result.
          </p>
        </div>
        <Link
          href="/cfb/history?view=accuracy"
          className="text-sm underline underline-offset-4"
        >
          Forecast &amp; backtest history
        </Link>
      </div>
      <PickFilters
        season={filters.season}
        latestSeason={summary.latestSeason}
        market={market}
        period={filters.period}
      />
      <PickKpis metric={metric} unavailable={summary.unavailable} />
      {history.unavailable || summary.unavailable ? (
        <Notice role="status">
          Recommendation history is currently unavailable. Forecast history
          remains available.
        </Notice>
      ) : history.rows.length ? (
        <>
          <PickTable rows={history.rows} />
          <p className="text-xs text-muted-foreground">
            {count} recorded market decisions. No Play decisions are shown for
            context and excluded from the pick record and ROI.
          </p>
          <HistoryPager page={page} totalPages={totalPages} pageUrl={pageUrl} />
        </>
      ) : (
        <Notice>
          No recorded decisions match this selection. Recommendations will
          appear here when the model next publishes qualifying picks or No Play
          decisions.
        </Notice>
      )}
      <PickPolicy firstDecision={metric?.first_decision_at} />
    </main>
  );
}
