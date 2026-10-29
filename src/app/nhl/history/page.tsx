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
import { NhlForecastAccuracy } from "@/components/nhl-forecast-accuracy";
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
  title: "NHL Forecast and Prediction History",
  description:
    "Every graded NHL forecast with its accuracy and calibration, plus each moneyline and total prediction with the side, line and price recorded before puck drop.",
};

type Params = {
  season?: string;
  market?: string;
  page?: string;
  view?: string;
  period?: string;
  source?: string;
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  if (params.view !== "picks") {
    const source = params.source === "backtest" ? "backtest" : "live";
    return (
      <PageShell>
        <PageHeader>
          <div>
            <PageTitle>NHL Forecast History</PageTitle>
            <PageDescription>
              Graded games with the pregame forecast each was judged by.
            </PageDescription>
          </div>
          <Link href="/nhl/history?view=picks" className="text-sm underline underline-offset-4">
            Prediction history
          </Link>
        </PageHeader>
        <NhlForecastAccuracy source={source} page="history" />
        {source === "live" && <NhlForecastHistory />}
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
          Forecast &amp; backtest history
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
