import type { Metadata } from "next";
import { fetchGradedPredictions } from "@/lib/nfl";
import { computeMetrics, metricsBySeason } from "@/lib/backtest-metrics";
import type { NflBacktestPrediction } from "@/lib/types";
import { BacktestKpis, BacktestSeasonTable } from "@/components/backtest-summary";
import { NflForecastSource } from "@/components/nfl-forecast-source";
import { formatNumber } from "@/lib/utils";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "NFL Model Performance",
  description:
    "Mean absolute error of the NFL model's spreads against the closing line, on live published forecasts and a walk-forward backtest to 2016.",
};

export default async function PerformancePage({ searchParams }: {
  searchParams: Promise<{ source?: string }>;
}) {
  const source = (await searchParams).source === "backtest" ? "backtest" : "live";
  let predictions: NflBacktestPrediction[] = [];
  let unavailable = false;
  try {
    predictions = await fetchGradedPredictions(source);
  } catch {
    unavailable = true;
  }
  // All three MAEs use exactly the same games, including tied final scores.
  const paired = predictions.filter((r) => r.model_margin != null
    && r.pure_model_margin != null && r.closing_spread != null
    && r.actual_margin != null);
  const { overall, bySeason } = metricsBySeason(paired);
  const pure = computeMetrics("Pure model", paired.map((r) => ({
    ...r, model_margin: r.pure_model_margin,
  })));
  const missingForecast = predictions.filter((r) => r.model_margin == null
    || r.pure_model_margin == null).length;
  const missingClose = predictions.filter((r) => r.closing_spread == null).length;

  return (
    <main id="main" className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8 space-y-6">
      <h1 className="font-heading text-2xl tracking-tight">NFL Model Performance</h1>
      <NflForecastSource source={source} page="performance" />
      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        {source === "live"
          ? "Actual published forecasts, preserved before kickoff and graded against final scores. Each game uses its last eligible pregame revision. Results and closing lines come from nflverse schedules and refresh automatically after games."
          : "Historical walk-forward backtest, kept separate from actual published forecasts. Each simulated forecast uses the data available at its historical cutoff."}
        {" "}Model MAE measures the published market-blended margin. Market MAE
        measures the closing line. Lower is better; both are scored on the same games.
      </p>
      {unavailable ? (
        <p className="text-sm text-destructive">Performance data is temporarily unavailable.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {predictions.length} completed games; {paired.length} with a forecast,
            pure-model margin, and closing line. Missing forecast: {missingForecast}.
            Missing close: {missingClose}. These counts can overlap.
          </p>
          {overall && pure ? (
            <>
              <BacktestKpis overall={overall}
                gamesTooltip="Games with a frozen blended forecast, pure forecast, closing line, and final score." />
              <p className="text-sm text-muted-foreground">
                Pure-model MAE: <span className="font-mono text-foreground">{formatNumber(pure.modelMae, 2)}</span>
                {" "}points on the same {paired.length}{" "}games. The blended forecast
                incorporates market information, so its error and the market&apos;s are correlated.
              </p>
              <BacktestSeasonTable bySeason={bySeason} overall={overall}
                caption={`NFL ${source} accuracy by season`} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {source === "live"
                ? "No live games are ready for comparison yet. Pregame forecasts will be graded once final results and closing lines arrive."
                : "No backtest games are available for comparison."}
            </p>
          )}
        </>
      )}
      <p className="text-xs text-muted-foreground">
        {source === "live"
          ? "Live tracking starts in 2026. Games without a forecast received before kickoff remain visible in coverage counts and are excluded from accuracy comparisons. Earlier completed games are never backfilled with a retrospective forecast."
          : "Seasons 2016–2021 were used for parameter selection. Later seasons shown here are historical evaluations, not the live season record."}
        {" "}Bias is the mean signed error of the model&apos;s home margin:
        positive means the model leans toward home teams.
      </p>
    </main>
  );
}
