import type { Metadata } from "next";
import { Notice } from "@/components/notice";
import Link from "next/link";
import ForecastHistory from "@/components/nfl-forecast-history";
import { HistoryPager } from "@/components/graded-history";
import {
  PickCountNote,
  PickKpis,
  PickPolicy,
  PickTable,
} from "@/components/football-picks";
import {
  fetchNflPickHistory,
  PICK_PAGE_SIZE,
  pickFilters,
  pickHistoryCount,
  pickQuery,
  selectedPickMetric,
} from "@/lib/nfl-picks";
import { redirect } from "next/navigation";
import { PickFilters } from "@/components/football-pick-filters";
import { pageNumber } from "@/lib/utils";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "NFL Pick History",
  description:
    "Every NFL moneyline, spread and total pick with the side, line, and odds recorded before kickoff and how it graded, plus forecast and backtest history.",
};

type Params = {
  season?: string;
  market?: string;
  page?: string;
  view?: string;
  team?: string;
  period?: string;
  source?: string;
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  if (
    params.view === "accuracy" ||
    params.source ||
    (Number(params.season) >= 2016 && Number(params.season) < 2026)
  )
    return <ForecastHistory searchParams={searchParams} />;
  const filters = pickFilters(params, "7");
  const market = filters.market;
  const page = pageNumber(params.page);
  const history = await fetchNflPickHistory(filters, page);
  const metric = selectedPickMetric(history.metrics, market);
  const count = pickHistoryCount(metric, market);
  const totalPages = Math.max(1, Math.ceil(count / PICK_PAGE_SIZE));
  function pageUrl(value: number) {
    const query = pickQuery(filters);
    query.set("page", String(value));
    return `/nfl/history?${query}`;
  }
  if (!history.unavailable && page > totalPages) redirect(pageUrl(totalPages));
  return (
    <main
      id="main"
      className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 py-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">
            NFL Pick History
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The side, line, and odds recorded before kickoff, with each
            pick&apos;s result.
          </p>
        </div>
        <Link
          href="/nfl/history?view=accuracy"
          className="text-sm underline underline-offset-4"
        >
          Forecast &amp; backtest history
        </Link>
      </div>
      <PickFilters
        seasonOptions={history.seasons}
        season={filters.season}
        latestSeason={new Date().getUTCFullYear()}
        market={market}
        period={filters.period}
      />
      <PickKpis metric={metric} unavailable={history.unavailable} />
      {history.unavailable ? (
        <Notice role="status">
          Recommendation history is currently unavailable. Forecast history
          remains available.
        </Notice>
      ) : history.rows.length ? (
        <>
          <PickTable rows={history.rows} caption="Recorded NFL decisions" />
          <PickCountNote count={count} market={market} metric={metric} />
          <HistoryPager page={page} totalPages={totalPages} pageUrl={pageUrl} />
        </>
      ) : (
        <Notice>
          {market === "all"
            ? "No recorded decisions match this selection. Recommendations will appear here when the model next publishes qualifying picks or No Play decisions."
            : "No recommended picks match this selection. No Play decisions are listed under All markets."}
        </Notice>
      )}
      <PickPolicy sport="nfl" firstDecision={metric?.first_decision_at} />
    </main>
  );
}
