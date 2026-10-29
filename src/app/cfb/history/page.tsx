import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { Notice } from "@/components/notice";
import Link from "next/link";
import ForecastHistory from "@/components/cfb-forecast-history";
import { HistoryPager } from "@/components/graded-history";
import {
  PickCountNote,
  PickKpis,
  PickPolicy,
  PickTable,
} from "@/components/cfb-picks";
import {
  fetchCfbPickHistory,
  PICK_PAGE_SIZE,
  pickHistoryCount,
  pickQuery,
  selectedPickMetric,
} from "@/lib/cfb-picks";
import { historyFilters } from "@/lib/pick-history";
import { redirect } from "next/navigation";
import { PickFilters } from "@/components/cfb-pick-filters";
import { pageNumber } from "@/lib/utils";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "College Football Forecast and Prediction History",
  description:
    "Every graded college football forecast and backtest game against the closing line, plus each moneyline, spread and total prediction with the side, line, and odds recorded before kickoff.",
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
  if (params.view !== "picks")
    return <ForecastHistory searchParams={searchParams} />;
  const filters = historyFilters(params);
  const market = filters.market;
  const page = pageNumber(params.page);
  const history = await fetchCfbPickHistory(filters, page);
  const metric = selectedPickMetric(history.metrics, market);
  const count = pickHistoryCount(metric, market);
  const totalPages = Math.max(1, Math.ceil(count / PICK_PAGE_SIZE));
  function pageUrl(value: number) {
    const query = pickQuery(filters);
    query.set("page", String(value));
    query.set("view", "picks");
    return `/cfb/history?${query}`;
  }
  if (!history.unavailable && page > totalPages) redirect(pageUrl(totalPages));
  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>
            College Football Prediction History
          </PageTitle>
          <PageDescription>
            The side, line, and odds recorded before kickoff, with each
            prediction&apos;s result.
          </PageDescription>
        </div>
        <Link
          href="/cfb/history?view=accuracy"
          className="text-sm underline underline-offset-4"
        >
          Forecast &amp; backtest history
        </Link>
      </PageHeader>
      <PickFilters
        season={filters.season}
        latestSeason={new Date().getUTCFullYear()}
        market={market}
        period={filters.period}
        dateBasis="kickoff"
        view="picks"
      />
      <PickKpis metric={metric} unavailable={history.unavailable} />
      {history.unavailable ? (
        <Notice role="status">
          Prediction history is currently unavailable. Forecast history
          remains available.
        </Notice>
      ) : history.rows.length ? (
        <>
          <PickTable rows={history.rows} />
          <PickCountNote count={count} market={market} metric={metric} />
          <HistoryPager page={page} totalPages={totalPages} pageUrl={pageUrl} />
        </>
      ) : (
        <Notice>
          {market === "all"
            ? "No recorded decisions match this selection. Recommendations will appear here when the model next publishes qualifying predictions or No Play decisions."
            : "No recommended predictions match this selection. No Play decisions are listed under All markets."}
        </Notice>
      )}
      <PickPolicy firstDecision={metric?.first_decision_at} />
    </PageShell>
  );
}
