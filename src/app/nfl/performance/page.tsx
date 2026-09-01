import { fetchFullBacktest } from "@/lib/nfl";
import { metricsBySeason } from "@/lib/backtest-metrics";
import type { NflBacktestPrediction } from "@/lib/types";
import { BacktestKpis, BacktestSeasonTable } from "@/components/backtest-summary";

export const revalidate = 300;

export default async function PerformancePage() {
  let backtest: NflBacktestPrediction[] = [];
  try {
    backtest = await fetchFullBacktest();
  } catch {
    // The page degrades to its empty state when the nfl schema is
    // unreachable; it must never fail the build.
  }

  const { overall, bySeason, seasons } = metricsBySeason(backtest);

  if (!overall) {
    return (
      <main id="main" className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8">
        <h1 className="font-heading text-2xl tracking-tight">Model Performance</h1>
        <p className="mt-4 text-muted-foreground">
          No backtest data published yet. Run the publish pipeline to load it.
        </p>
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-heading text-2xl tracking-tight">Model Performance</h1>
        <div className="text-xs text-muted-foreground">
          Frozen walk-forward backtest, {seasons[0]}&ndash;
          {seasons[seasons.length - 1]}
        </div>
      </div>

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Every prediction below was made walking forward through each season
        with only the data available at the time, then frozen. The market
        benchmark is the closing spread: the strongest public forecast of a
        game&apos;s margin. Beating it consistently is rare, and the model is
        measured against it, not against a naive baseline. The published
        model line blends the pure model with the market at a capped weight,
        so the two are correlated by construction; the pure model&apos;s own
        error runs about half a point higher.
      </p>

      <BacktestKpis
        overall={overall}
        gamesTooltip="Games with a model prediction, a closing spread, and a final score."
      />
      <BacktestSeasonTable bySeason={bySeason} overall={overall} />

      <p className="text-xs text-muted-foreground">
        Bias is the mean signed error of the model&apos;s home margin: positive
        means the model leans toward home teams. Seasons 2016&ndash;2021 tuned
        the model&apos;s parameters; 2022 onward was never touched by
        selection and is the honest read on accuracy.
      </p>
    </main>
  );
}
