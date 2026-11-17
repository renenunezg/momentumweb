import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  PickCountNote,
  PickKpis,
  PickPolicy,
  PickTable,
} from "@/components/football-picks";
import { PickFilters } from "@/components/football-pick-filters";
import { HistoryPager } from "@/components/graded-history";
import { NhlForecastHistory } from "@/components/nhl-forecast-history";
import { Notice } from "@/components/notice";
import {
  fetchNhlPickHistory,
  PICK_PAGE_SIZE,
  pickFilters,
  pickHistoryCount,
  pickQuery,
  selectedPickMetric,
} from "@/lib/nhl-picks";
import { pageNumber } from "@/lib/utils";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "NHL Prediction History",
  description:
    "Each NHL moneyline and total prediction with the side, line and price recorded before puck drop and its result, plus the graded games with the pregame forecast each was judged by.",
};

type Params = {
  season?: string;
  market?: string;
  page?: string;
  view?: string;
  period?: string;
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  // Accuracy figures live on the Performance page; this view is only the
  // game-by-game list behind them.
  if (params.view === "accuracy") {
    return (
      <PageShell>
        <PageHeader>
          <div>
            <PageTitle>NHL Graded Forecasts</PageTitle>
            <PageDescription>
              The most recent graded games with the pregame forecast each was
              judged by.
            </PageDescription>
          </div>
          <Link href="/nhl/history" className="text-sm underline underline-offset-4">
            Prediction history
          </Link>
        </PageHeader>
        <NhlForecastHistory />
        <p className="text-sm text-muted-foreground">
          Accuracy, calibration and the comparison with the closing line are
          on the{" "}
          <Link href="/nhl/performance" className="underline underline-offset-4">
            Performance page
          </Link>
          .
        </p>
      </PageShell>
    );
  }
  const filters = pickFilters(params, "7");
  const market = filters.market;
  const page = pageNumber(params.page);
  const history = await fetchNhlPickHistory(filters, page);
  const metric = selectedPickMetric(history.metrics, market);
  const count = pickHistoryCount(metric, market);
  const totalPages = Math.max(1, Math.ceil(count / PICK_PAGE_SIZE));
  function pageUrl(value: number) {
    const query = pickQuery(filters);
    query.set("page", String(value));
    query.set("view", "picks");
    return `/nhl/history?${query}`;
  }
  if (!history.unavailable && page > totalPages) redirect(pageUrl(totalPages));
  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>NHL Prediction History</PageTitle>
          <PageDescription>
            The side, line, and price recorded before puck drop, with each
            prediction&apos;s result.
          </PageDescription>
        </div>
        <Link href="/nhl/history?view=accuracy" className="text-sm underline underline-offset-4">
          Graded forecasts
        </Link>
      </PageHeader>
      <PickFilters
        seasonOptions={history.seasons}
        season={filters.season}
        latestSeason={new Date().getUTCFullYear()}
        market={market}
        period={filters.period}
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
          <PickTable rows={history.rows} caption="Recorded NHL decisions" />
          <PickCountNote count={count} market={market} metric={metric} />
          <HistoryPager page={page} totalPages={totalPages} pageUrl={pageUrl} />
        </>
      ) : (
        <Notice>
          {market === "all"
            ? "No recorded decisions match this selection. Decisions appear each game-day morning once the season starts."
            : "No predictions match this selection. No Play decisions are listed under All markets."}
        </Notice>
      )}
      <PickPolicy sport="nhl" firstDecision={metric?.first_decision_at} />
    </PageShell>
  );
}
