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
  seasonLabel: "live season",
  versions:
    "Weeks 1 and 2 were published by earlier model versions (joint_scoring_v3 and v8) and every week since by v14; each game is graded on the version published before its kickoff.",
  compositionKind: "opponent_classification",
  segments: [
    { kind: "week", title: "By week" },
    { kind: "opponent_classification", title: "By opponent classification" },
  ],
  diagnostics: {
    note:
      "These explain forecast error, not prediction results. Missing-input counts include unavailable injury data and other gaps in preseason sources. Projected winning margin is the absolute model margin: under 7 means the model expects either team to win by fewer than 7 points, regardless of the sportsbook line. Favorite, underdog, over and under prediction records are in the Predictions tab.",
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
  const versions = [...new Set(backtest.map((r) => r.model_version))].filter((v) => v != null);
  const classes = [...new Set(backtest.map((r) => r.classification))].filter((v) => v != null);
  return (
    <section className="space-y-section">
      <div className="flex items-start justify-between gap-4">
        <h2 className="type-section">
          Historical walk-forward backtest (model core{versions.length > 0 ? `, ${versions.join(", ")}` : ""})
        </h2>
        {seasons.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Frozen, {seasons[0]}&ndash;{seasons[seasons.length - 1]}
            {classes.length > 0 && `, ${classes.join(", ")}`}
          </div>
        )}
      </div>

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Every prediction below was made walking forward through each season with
        only the data available at the time, then frozen with the model version
        named above. They come from the pure model core with no market blend, so
        they are historical stand-ins for the core&apos;s own skill, not for the
        published line; regular season and postseason games are included. The
        live 2026 record above is a different population: its forecasts come
        from the versions named in its own section, which add a process margin
        adjustment and a total offset on top of this core. The
        market benchmark is the closing spread: the strongest public forecast of
        a game&apos;s margin. Beating it consistently is rare, and the model is
        measured against it, not against a naive baseline.
      </p>

      {!overall ? (
        <p className="text-sm text-muted-foreground">
          No backtest data published yet.
        </p>
      ) : (
        <>
          <BacktestKpis
            overall={overall}
            gamesTooltip="Games with a model prediction, a closing spread, and a final score, in the classes named above, regular season and postseason."
          />
          <BacktestSeasonTable bySeason={bySeason} overall={overall} />
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Bias is the mean signed error of the model&apos;s home margin: positive
        means the model leans toward home teams. The published line and the
        in-game projections lean on the market because the closing line has been
        the better pregame forecast in every season tested.
      </p>
    </section>
  );
}
