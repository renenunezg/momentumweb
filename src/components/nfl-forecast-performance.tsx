import { fetchForecastAccuracy } from "@/lib/nfl";
import {
  BacktestKpis,
  BacktestSeasonTable,
} from "@/components/backtest-summary";
import { NflForecastSource } from "@/components/nfl-forecast-source";
import { formatNumber } from "@/lib/utils";

export default async function NflForecastPerformance({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const source =
    (await searchParams).source === "backtest" ? "backtest" : "live";
  let accuracy: Awaited<ReturnType<typeof fetchForecastAccuracy>> = {
    overall: null,
    bySeason: [],
    completed: 0,
    missingForecast: 0,
    missingClose: 0,
  };
  let unavailable = false;
  try {
    accuracy = await fetchForecastAccuracy(source);
  } catch {
    unavailable = true;
  }
  const { overall, bySeason, completed, missingForecast, missingClose } =
    accuracy;

  return (
    <div className="space-y-6">
      <NflForecastSource source={source} page="performance" />
      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        {source === "live"
          ? "Actual published forecasts, preserved before kickoff and graded against final scores. Each game uses its last eligible pregame revision. Results and closing lines come from nflverse schedules and refresh automatically after games."
          : "Historical walk-forward backtest, kept separate from actual published forecasts. Each simulated forecast uses the data available at its historical cutoff."}{" "}
        Model MAE measures the published market-blended margin. Market MAE
        measures the closing line. Lower is better; both are scored on the same
        games.
      </p>
      {unavailable ? (
        <p className="text-sm text-destructive">
          Performance data is temporarily unavailable.
        </p>
      ) : (
        <>
          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer">
              Input coverage and margin diagnostics
            </summary>
            <p>
              {completed} completed games; {overall?.games ?? 0} with a
              forecast, pure-model margin, and closing line. Missing forecast:{" "}
              {missingForecast}. Missing close: {missingClose}. These counts can
              overlap.
            </p>
            <p>
              Coverage counts describe all completed forecasts; accuracy
              compares only games with both model variants and a closing line.
            </p>
          </details>
          {overall ? (
            <>
              <BacktestKpis
                overall={overall}
                gamesTooltip="Games with a frozen blended forecast, pure forecast, closing line, and final score."
              />
              <p className="text-sm text-muted-foreground">
                Pure-model MAE:{" "}
                <span className="font-mono text-foreground">
                  {formatNumber(overall.pureMae, 2)}
                </span>{" "}
                points on the same {overall?.games ?? 0} games. The blended
                forecast incorporates market information, so its error and the
                market&apos;s are correlated.
              </p>
              <BacktestSeasonTable
                bySeason={bySeason}
                overall={overall}
                caption={`NFL ${source} accuracy by season`}
              />
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
          : "Seasons 2016–2021 were used for parameter selection. Later seasons shown here are historical evaluations, not the live season record."}{" "}
        Bias is the mean signed error of the model&apos;s home margin: positive
        means the model leans toward home teams.
      </p>
    </div>
  );
}
