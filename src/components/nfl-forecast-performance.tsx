import { Suspense } from "react";
import { fetchForecastAccuracy } from "@/lib/nfl";
import type { FootballLivePerformance } from "@/lib/football-performance";
import {
  BacktestKpis,
  BacktestSeasonTable,
} from "@/components/backtest-summary";
import { FootballForecastPerformance } from "@/components/football-forecast-performance";
import { formatNumber } from "@/lib/utils";

const COPY = {
  closingLine:
    "the closing spread from the nflverse schedule (the same definition as the backtest)",
  cadence: "Live grading runs after each refresh",
  segments: [
    { kind: "week", title: "By week" },
    { kind: "division_game", title: "By divisional game" },
  ],
  diagnostics: {
    note:
      "These explain forecast error, not prediction results. QB adjustment is the larger of the two teams' expected-starter adjustments the model applied before kickoff, so it separates games where the model priced a quarterback change from games where it did not. Projected winning margin is the absolute model margin: under 3 means the model expects either team to win by fewer than 3 points, regardless of the sportsbook line. Favorite, underdog, over and under prediction records are in Prediction results.",
    segments: [
      { kind: "qb_adjustment", title: "By QB adjustment (points)" },
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

// The backtest is aggregated by nfl.forecast_accuracy, one small result per
// request, rather than by paging every backtest row to the server.
async function HistoricalBacktest() {
  let accuracy: Awaited<ReturnType<typeof fetchForecastAccuracy>> | null = null;
  try {
    accuracy = await fetchForecastAccuracy("backtest");
  } catch {
    // The page degrades to its empty state when the nfl schema is
    // unreachable; it must never fail the build.
  }
  const overall = accuracy?.overall ?? null;
  const bySeason = accuracy?.bySeason ?? [];
  const seasons = bySeason.map((s) => s.label);
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
        only the data available at the time, then frozen. Seasons 2016&ndash;2021
        were used for parameter selection; later seasons are historical
        evaluations, not the live season record. The market benchmark is the
        closing spread: the strongest public forecast of a game&apos;s margin.
        Beating it consistently is rare, and the model is measured against it,
        not against a naive baseline.
      </p>

      {!overall ? (
        <p className="text-sm text-muted-foreground">
          No backtest data published yet.
        </p>
      ) : (
        <>
          <BacktestKpis
            overall={overall}
            gamesTooltip="Games with a pure-model prediction, a closing spread, and a final score."
          />
          <p className="text-sm text-muted-foreground">
            Pure-model MAE:{" "}
            <span className="font-mono text-foreground">
              {formatNumber(overall.pureMae, 2)}
            </span>{" "}
            points on the same {overall.games} games.
          </p>
          <BacktestSeasonTable
            bySeason={bySeason}
            overall={overall}
            caption="NFL backtest accuracy by season"
          />
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
