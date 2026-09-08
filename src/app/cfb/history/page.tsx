import type { Metadata } from "next";
import Link from "next/link";
import ForecastHistory from "@/components/cfb-forecast-history";
import { HistoryPager } from "@/components/graded-history";
import {
  PickFilters,
  PickKpis,
  PickPolicy,
  PickTable,
} from "@/components/cfb-picks";
import {
  fetchCfbPickHistory,
  fetchCfbPickSummary,
  PICK_PAGE_SIZE,
  pickMarket,
  selectedPickMetric,
} from "@/lib/cfb-picks";
import { pageNumber } from "@/lib/utils";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "College Football Pick History",
  description:
    "Every college football spread and total pick with the side, line, and odds recorded before kickoff and how it graded, plus forecast and backtest history.",
};

type Params = {
  season?: string;
  market?: string;
  page?: string;
  view?: string;
  team?: string;
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  if (params.view === "accuracy" || params.season === "backtest")
    return <ForecastHistory searchParams={searchParams} />;
  const summary = await fetchCfbPickSummary(params.season);
  const market = pickMarket(params.market);
  const page = pageNumber(params.page);
  const history = await fetchCfbPickHistory(summary.season, market, page);
  const metric = selectedPickMetric(summary.metrics, market);
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
        season={summary.season}
        latestSeason={summary.latestSeason}
        market={market}
      />
      <PickKpis metric={metric} unavailable={summary.unavailable} />
      {history.unavailable ? (
        <p
          role="status"
          className="rounded-md border border-border bg-muted/30 p-4 text-sm"
        >
          Recommendation history is currently unavailable. Forecast history
          remains available.
        </p>
      ) : history.rows.length ? (
        <>
          <PickTable rows={history.rows} />
          <p className="text-xs text-muted-foreground">
            {history.count} recorded market decisions. No Play decisions are
            shown for context and excluded from the pick record and ROI.
          </p>
          <HistoryPager
            page={page}
            totalPages={Math.max(1, Math.ceil(history.count / PICK_PAGE_SIZE))}
            pageUrl={(p) =>
              `/cfb/history?season=${summary.season}&market=${market}&page=${p}`
            }
          />
        </>
      ) : (
        <p className="rounded-md border border-border bg-muted/30 p-4 text-sm">
          No recorded decisions match this selection. Recommendations will
          appear here when the model next publishes qualifying picks or No Play
          decisions.
        </p>
      )}
      <PickPolicy firstDecision={metric?.first_decision_at} />
    </main>
  );
}
