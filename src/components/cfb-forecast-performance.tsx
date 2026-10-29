import { Suspense } from "react";
import { fetchFullBacktest } from "@/lib/cfb";
import type { FootballLivePerformance } from "@/lib/football-performance";
import { metricsBySeason } from "@/lib/backtest-metrics";
import type { CfbBacktestPrediction } from "@/lib/types";
import {
  BacktestKpis,
  BacktestSeasonTable,
} from "@/components/backtest-summary";
import { FootballForecastPerformance } from "@/components/football-forecast-performance";

const COPY = {
  closingLine:
    "the closing spread from the CFBD lines feed (median across providers, the same definition as the backtest)",
  cadence: "Live grading runs after each Monday refresh",
  segments: [
    { kind: "week", title: "By week" },
    { kind: "opponent_classification", title: "By opponent classification" },
  ],
  diagnostics: {
    note:
      "These explain forecast error, not prediction results. Missing-input counts include unavailable injury data and other gaps in preseason sources. Projected winning margin is the absolute model margin: under 7 means the model expects either team to win by fewer than 7 points, regardless of the sportsbook line. Favorite, underdog, over and under prediction records are in Prediction results.",
    segments: [
      { kind: "missing_inputs", title: "By input completeness" },
      {
        kind: "model_favorite_size",
        title: "By projected winning margin (points)",
      },
    ],
  },
};

export default function ForecastPerformance({
  live,
}: {
  live: FootballLivePerformance;
}) {
  return (
    <FootballForecastPerformance
      live={live}
      copy={COPY}
      backtest={
        <Suspense
          fallback={
            <p role="status" className="text-sm text-muted-foreground">
              Loading historical comparison…
            </p>
          }
        >
          <HistoricalBacktest />
        </Suspense>
      }
    />
  );
}

async function HistoricalBacktest() {
  let backtest: CfbBacktestPrediction[] = [];
  try {
    backtest = await fetchFullBacktest();
  } catch {
    // The page degrades to its empty states when the cfb schema is
    // unreachable; it must never fail the build.
  }

  const { overall, bySeason, seasons } = metricsBySeason(backtest);
  return (
    <section className="space-y-section">
      <div className="flex items-start justify-between gap-4">
        <h2 className="type-section">
          Historical walk-forward backtest (pure model)
        </h2>
        {seasons.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Frozen, {seasons[0]}&ndash;{seasons[seasons.length - 1]}
          </div>
        )}
      </div>

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Every prediction below was made walking forward through each season with
        only the data available at the time, then frozen. They come from the
        pure model with no market blend, so they are historical stand-ins for
        the model&apos;s own skill, not for the published line. The market benchmark
        is the closing spread: the strongest public forecast of a game&apos;s
        margin. Beating it consistently is rare, and the model is measured
        against it, not against a naive baseline.
      </p>

      {!overall ? (
        <p className="text-sm text-muted-foreground">
          No backtest data published yet.
        </p>
      ) : (
        <>
          <BacktestKpis
            overall={overall}
            gamesTooltip="FBS-vs-FBS games with a model prediction, a closing spread, and a final score."
          />
          <BacktestSeasonTable bySeason={bySeason} overall={overall} />
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Bias is the mean signed error of the model&apos;s home margin: positive
        means the model leans toward home teams. The published line and the
        in-game projections lean on the market precisely because the closing
        line remains the better pregame forecast.
      </p>
    </section>
  );
}
