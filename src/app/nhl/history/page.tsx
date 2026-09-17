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
  title: "NHL Pick History",
  description:
    "Every NHL moneyline and total pick with the side, line and price recorded before puck drop and how it graded, plus graded forecast history.",
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
  if (params.view === "accuracy" || params.source) {
    const source = params.source === "backtest" ? "backtest" : "live";
    return (
      <main id="main" className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl">NHL Forecast History</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Graded games with the pregame forecast each was judged by.
            </p>
          </div>
          <Link href="/nhl/history" className="text-sm underline underline-offset-4">
            Pick history
          </Link>
        </div>
        <NhlForecastAccuracy source={source} page="history" />
        {source === "live" && <NhlForecastHistory />}
      </main>
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
    return `/nhl/history?${query}`;
  }
  if (!history.unavailable && page > totalPages) redirect(pageUrl(totalPages));
  return (
    <main id="main" className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl">NHL Pick History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The side, line, and price recorded before puck drop, with each
            pick&apos;s result.
          </p>
        </div>
        <Link href="/nhl/history?view=accuracy" className="text-sm underline underline-offset-4">
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
          <PickTable rows={history.rows} caption="Recorded NHL decisions" />
          <PickCountNote count={count} market={market} metric={metric} />
          <HistoryPager page={page} totalPages={totalPages} pageUrl={pageUrl} />
        </>
      ) : (
        <Notice>
          {market === "all"
            ? "No recorded decisions match this selection. Decisions appear each game-day morning once the season starts."
            : "No recommended picks match this selection. No Play decisions are listed under All markets."}
        </Notice>
      )}
      <PickPolicy sport="nhl" firstDecision={metric?.first_decision_at} />
    </main>
  );
}
