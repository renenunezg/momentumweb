import { Suspense } from "react";
import { fetchForecastAccuracy } from "@/lib/nfl";
import type { FootballLivePerformance } from "@/lib/football-performance";
import type { SliceMetrics } from "@/lib/backtest-metrics";
import { FootballForecastPerformance } from "@/components/football-forecast-performance";
import { KpiCard } from "@/components/kpi-card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber, formatSigned } from "@/lib/utils";

const COPY = {
  closingLine:
    "the closing spread from the nflverse schedule (the same definition as the backtest)",
  cadence: "Live grading runs after each refresh",
  seasonLabel: "first live season",
  versions:
    "Weeks 1 to 7 were published by five model versions, from nfl_preseason_v2_qb_v4 through nfl_joint_scoring_qb_v8_totals_v2; each game is graded on the version published before its kickoff.",
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
// request, rather than by paging every backtest row to the server. Its
// "published" margin blends the pure model half and half with the closing
// spread, so only the pure model is a forecast; the blend is shown beside it
// for reference and never compared with the close.
const SELECTION_SEASONS = new Set(["2016", "2017", "2018", "2019", "2020", "2021"]);

type BacktestSlice = SliceMetrics & { pureMae: number; closingBlendMae: number | null };

// A games-weighted mean of per-season MAEs is the pooled MAE exactly.
function pool(label: string, rows: BacktestSlice[]): BacktestSlice | null {
  const games = rows.reduce((sum, r) => sum + r.games, 0);
  if (games === 0) return null;
  const mean = (pick: (r: BacktestSlice) => number) =>
    rows.reduce((sum, r) => sum + pick(r) * r.games, 0) / games;
  return {
    label,
    games,
    modelMae: mean((r) => r.modelMae),
    pureMae: mean((r) => r.pureMae),
    closingBlendMae: rows.every((r) => r.closingBlendMae != null) ? mean((r) => r.closingBlendMae as number) : null,
    marketMae: mean((r) => r.marketMae),
    modelBeatsMarket: mean((r) => r.modelBeatsMarket),
    bias: mean((r) => r.bias),
  };
}

function PureRow({ m, strong }: { m: BacktestSlice; strong?: boolean }) {
  const cell = `text-right font-mono tabular-nums${strong ? " font-semibold" : ""}`;
  return (
    <TableRow className={strong ? "border-t-2" : undefined}>
      <TableCell className={strong ? "font-semibold" : "font-medium"}>{m.label}</TableCell>
      <TableCell className={cell}>{m.games}</TableCell>
      <TableCell className={cell}>{formatNumber(m.pureMae, 2)}</TableCell>
      <TableCell className={cell}>{formatNumber(m.marketMae, 2)}</TableCell>
      <TableCell className={cell}>{formatSigned(m.pureMae - m.marketMae, 2)}</TableCell>
      <TableCell className={`${cell} text-muted-foreground`}>{formatNumber(m.closingBlendMae, 2)}</TableCell>
    </TableRow>
  );
}

async function HistoricalBacktest() {
  let accuracy: Awaited<ReturnType<typeof fetchForecastAccuracy>> | null = null;
  try {
    accuracy = await fetchForecastAccuracy("backtest");
  } catch {
    // The page degrades to its empty state when the nfl schema is
    // unreachable; it must never fail the build.
  }
  const bySeason = accuracy?.bySeason ?? [];
  const seasons = bySeason.map((m) => m.label);
  const selection = pool("2016 to 2021, parameter selection", bySeason.filter((m) => SELECTION_SEASONS.has(m.label)));
  const evaluation = pool("2022 to 2025, retrospective evaluation", bySeason.filter((m) => !SELECTION_SEASONS.has(m.label)));
  const overall = accuracy?.overall ?? null;
  const stamp = accuracy?.modelVersion
    ? `${accuracy.modelVersion}${accuracy.generatedAt ? `, generated ${accuracy.generatedAt.slice(0, 10)}` : ""}`
    : "no version or generation date stored yet";

  return (
    <section className="space-y-section">
      <div className="flex items-start justify-between gap-4">
        <h2 className="type-section">
          Historical walk-forward backtest (pure model)
        </h2>
        {seasons.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {seasons[0]}&ndash;{seasons[seasons.length - 1]}, {stamp}
          </div>
        )}
      </div>

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Every prediction below was made walking forward through each season with
        only the data available at the time. The table is regenerated from the
        current model whenever the backtest is republished and is stamped with
        the version and date that produced it once the publish records them.
        Seasons 2016 through 2021
        chose the hyperparameters; 2022 through 2025 were not used for selection
        but have been examined repeatedly, so they are retrospective evaluation,
        not a clean holdout. The historical preseason prior uses each team&apos;s
        actual week 1 starter as its quarterback for 2016 to 2024, a small
        hindsight a live run would not have. The market benchmark is the closing
        spread: the strongest public forecast of a game&apos;s margin. In this
        backtest the published line blends the pure model half and half with that
        closing spread, so its error is not a forecast result; the pure model,
        which sees no market, is the headline here.
      </p>

      {!overall || !evaluation ? (
        <p className="text-sm text-muted-foreground">
          No backtest data published yet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 border-y border-rule-strong py-4 sm:grid-cols-4">
            <KpiCard
              label="Games graded"
              value={String(evaluation.games)}
              sub="2022 to 2025"
              tooltip="Games with a pure-model prediction, a closing spread, and a final score in the evaluation seasons."
            />
            <KpiCard
              label="Pure model MAE"
              value={formatNumber(evaluation.pureMae, 2)}
              sub="points"
              tooltip="Average distance between the pure model's home margin and the actual margin, in points. Lower is better."
            />
            <KpiCard
              label="Market MAE"
              value={formatNumber(evaluation.marketMae, 2)}
              sub="points"
              tooltip="Average distance between the closing spread and actual margin, in points. Lower is better."
            />
            <KpiCard
              label="Gap to market"
              value={formatSigned(evaluation.pureMae - evaluation.marketMae, 2)}
              sub="points (lower is better)"
              tooltip="Pure model error minus market error on the same games. Positive means the closing line was more accurate. No interval is published yet."
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableCaption className="sr-only">NFL backtest accuracy by season</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Season</TableHead>
                  <TableHead className="text-right">Games</TableHead>
                  <TableHead className="text-right">Pure model MAE</TableHead>
                  <TableHead className="text-right">Market MAE</TableHead>
                  <TableHead className="text-right">Gap</TableHead>
                  <TableHead className="text-right">Half-close blend MAE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bySeason.map((m) => (
                  <PureRow key={m.label} m={m} />
                ))}
                {selection && <PureRow m={selection} strong />}
                <PureRow m={evaluation} strong />
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Half-close blend is the backtest&apos;s published line, half pure model
        and half closing spread; it is listed for reference and is not a
        forecast. The live 2026 line blends toward the market as it stood when
        the forecast was published, hours before kickoff, and is graded above.
        The published line and the in-game projections lean on the market
        because the closing line has been the better pregame forecast in every
        season tested.
      </p>
    </section>
  );
}
