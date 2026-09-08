import { Suspense } from "react";
import { fetchFullBacktest, type CfbLivePerformance } from "@/lib/cfb";
import { metricsBySeason } from "@/lib/backtest-metrics";
import type {
  CfbBacktestPrediction,
  CfbPerformanceMetric,
  CfbPredictionSource,
} from "@/lib/types";
import { formatNumber, formatPct, formatSigned } from "@/lib/utils";
import {
  BacktestKpis,
  BacktestSeasonTable,
} from "@/components/backtest-summary";
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

function fmtDate(value: string | null): string {
  if (!value) return "unknown";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "unknown";
  return d.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

const SOURCE_LABELS: Record<CfbPredictionSource, string> = {
  pure_model: "Pure model",
  market_informed: "Market-informed blend",
  closing_market: "Closing line",
};

const SEGMENT_TITLES: Record<string, string> = {
  week: "By week",
  opponent_classification: "By opponent classification",
};

const numCell = "text-right font-mono tabular-nums";
const mutedNumCell = `${numCell} text-muted-foreground`;

function SegmentTable({
  title,
  rows,
}: {
  title: string;
  rows: CfbPerformanceMetric[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="font-heading text-base">{title}</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableCaption className="sr-only">{title}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Segment</TableHead>
              <TableHead className="text-right">Games</TableHead>
              <TableHead className="text-right">Model MAE</TableHead>
              <TableHead className="text-right">Market MAE</TableHead>
              <TableHead className="text-right">Gap</TableHead>
              <TableHead className="text-right">Model closer</TableHead>
              <TableHead className="text-right">Bias</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m) => (
              <TableRow key={`${m.segment_kind}-${m.segment}`}>
                <TableCell className="font-medium">
                  {m.segment_kind === "week" ? `Week ${m.segment}` : m.segment}
                  {m.thin_sample && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      thin
                    </span>
                  )}
                </TableCell>
                <TableCell className={numCell}>{m.games ?? "–"}</TableCell>
                <TableCell className={numCell}>
                  {formatNumber(m.margin_mae, 2)}
                </TableCell>
                <TableCell className={numCell}>
                  {formatNumber(m.market_mae, 2)}
                </TableCell>
                <TableCell className={numCell}>
                  {formatSigned(m.model_minus_market_mae, 2)}
                </TableCell>
                <TableCell className={numCell}>
                  {formatPct(m.closer_than_market_share)}
                </TableCell>
                <TableCell className={mutedNumCell}>
                  {formatSigned(m.margin_bias, 2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default async function ForecastPerformance({
  live,
}: {
  live: CfbLivePerformance;
}) {
  const overallBySource = new Map(
    live.metrics
      .filter((m) => m.segment_kind === "overall")
      .map((m) => [m.prediction_source, m]),
  );
  const livePure = overallBySource.get("pure_model") ?? null;
  const liveClosing = overallBySource.get("closing_market") ?? null;
  const liveSources = (
    ["pure_model", "market_informed", "closing_market"] as CfbPredictionSource[]
  )
    .map((source) => overallBySource.get(source))
    .filter((m): m is CfbPerformanceMetric => m != null);
  const pureSegments = live.metrics.filter(
    (m) => m.prediction_source === "pure_model" && m.segment_kind !== "overall",
  );
  const segmentKinds = Object.keys(SEGMENT_TITLES).filter((kind) =>
    pureSegments.some((m) => m.segment_kind === kind),
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-heading text-xl tracking-tight">
          Forecast accuracy
        </h2>
        <div className="text-right text-xs text-muted-foreground">
          <div>Live grading runs after each Monday refresh</div>
          <div>
            Last graded:{" "}
            {live.lastGradedAt ? fmtDate(live.lastGradedAt) : "no games yet"}
          </div>
        </div>
      </div>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-heading text-lg">
            {live.season ?? "Live"} season, graded as played
          </h2>
          <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
            Every row is a frozen record: the projection published before
            kickoff, the closing spread from the CFBD lines feed (median across
            providers, the same definition as the backtest), and the final
            score. Nothing is re-fit or re-priced after a result is known. The
            closing line is the bar the model is measured against, not an input
            to it.
          </p>
        </div>

        {!livePure ? (
          <p className="text-sm text-muted-foreground">
            No completed {live.season ?? "2026"} games have been graded yet.
            Live performance appears here once the first week is final.
          </p>
        ) : (
          <>
            {livePure.thin_sample && (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {livePure.games} games graded through{" "}
                {fmtDate(live.latestKickoff)}. Fewer than 30 games describe the
                season so far, not model skill. Read these as status, not
                evidence.
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 border-y border-rule-strong py-4 sm:grid-cols-3 lg:grid-cols-6">
              <KpiCard
                label="Games graded"
                value={String(livePure.games ?? 0)}
                sub={`${livePure.games_with_market ?? 0} with a closing line`}
                tooltip="Completed games with a projection published before kickoff and a final score. The second number is how many also have a CFBD closing spread."
              />
              <KpiCard
                label="Model MAE"
                value={formatNumber(livePure.margin_mae, 2)}
                sub="points"
                tooltip="Mean absolute error of the pure model's projected home margin against the actual margin."
              />
              <KpiCard
                label="Market MAE"
                value={formatNumber(liveClosing?.margin_mae, 2)}
                sub="points"
                tooltip="Mean absolute error of the closing spread against the actual margin, on the games that have one."
              />
              <KpiCard
                label="Gap to market"
                value={formatSigned(livePure.model_minus_market_mae, 2)}
                sub="points (lower is better)"
                tooltip="Model MAE minus market MAE on the games that have a closing spread. Positive means the closing line is more accurate than the model."
              />
              <KpiCard
                label="Model closer"
                value={formatPct(livePure.closer_than_market_share)}
                tooltip="Share of games with a closing spread where the model's margin was strictly closer to the result."
              />
              <KpiCard
                label="80% coverage"
                value={formatPct(livePure.coverage_80, 0)}
                sub="target 80%"
                tooltip="Share of actual margins that landed inside the model's frozen 80% interval. Well above 80% means the model's uncertainty is too wide; well below means too narrow."
              />
            </div>

            <div className="space-y-2">
              <h3 className="font-heading text-base">By prediction source</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableCaption className="sr-only">
                    Live season accuracy by prediction source
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Games</TableHead>
                      <TableHead className="text-right">MAE</TableHead>
                      <TableHead className="text-right">RMSE</TableHead>
                      <TableHead className="text-right">Bias</TableHead>
                      <TableHead className="text-right">Total MAE</TableHead>
                      <TableHead className="text-right">50 / 80 / 90</TableHead>
                      <TableHead className="text-right">Gap</TableHead>
                      <TableHead className="text-right">Closer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liveSources.map((m) => (
                      <TableRow key={m.prediction_source}>
                        <TableCell className="font-medium">
                          {SOURCE_LABELS[m.prediction_source]}
                        </TableCell>
                        <TableCell className={numCell}>{m.games}</TableCell>
                        <TableCell className={numCell}>
                          {formatNumber(m.margin_mae, 2)}
                        </TableCell>
                        <TableCell className={numCell}>
                          {formatNumber(m.margin_rmse, 2)}
                        </TableCell>
                        <TableCell className={mutedNumCell}>
                          {formatSigned(m.margin_bias, 2)}
                        </TableCell>
                        <TableCell className={numCell}>
                          {m.total_games ? formatNumber(m.total_mae, 2) : "–"}
                        </TableCell>
                        <TableCell className={mutedNumCell}>
                          {m.coverage_80 == null
                            ? "–"
                            : `${formatPct(m.coverage_50, 0)} / ${formatPct(m.coverage_80, 0)} / ${formatPct(m.coverage_90, 0)}`}
                        </TableCell>
                        <TableCell className={numCell}>
                          {formatSigned(m.model_minus_market_mae, 2)}
                        </TableCell>
                        <TableCell className={numCell}>
                          {formatPct(m.closer_than_market_share)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                Pure model is the independent projection. The market-informed
                blend mixes the pure margin with the pregame market spread the
                model saw when it published, so it is a product line, not model
                skill. Closing line is the benchmark graded on its own. Coverage
                is the share of results inside the pure model&apos;s frozen 50,
                80, and 90 percent intervals.
                {livePure.probability_games ? (
                  <>
                    {" "}
                    Home win probability, taken from the frozen pregame margin
                    distribution before kickoff, scores Brier{" "}
                    {formatNumber(livePure.brier_score, 3)} and log loss{" "}
                    {formatNumber(livePure.log_loss, 3)} over{" "}
                    {livePure.probability_games} games.
                  </>
                ) : null}
              </p>
            </div>

            {segmentKinds.map((kind) => (
              <SegmentTable
                key={kind}
                title={SEGMENT_TITLES[kind]}
                rows={pureSegments.filter((m) => m.segment_kind === kind)}
              />
            ))}
            <details className="space-y-4 rounded-md border border-border p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Data and model diagnostics
              </summary>
              <p className="text-xs text-muted-foreground">
                These explain forecast error, not betting records. Missing-input
                counts include unavailable injury data and other gaps in
                preseason sources. Projected winning margin is the absolute
                model margin: under 7 means the model expects either team to win
                by fewer than 7 points, regardless of the sportsbook line.
                Favorite, underdog, over and under pick records are in
                Recommendations.
              </p>
              <SegmentTable
                title="By input completeness"
                rows={pureSegments.filter(
                  (m) => m.segment_kind === "missing_inputs",
                )}
              />
              <SegmentTable
                title="By projected winning margin (points)"
                rows={pureSegments.filter(
                  (m) => m.segment_kind === "model_favorite_size",
                )}
              />
            </details>
            <p className="text-xs text-muted-foreground">
              Segments are pure model rows. Market columns use only the games in
              that segment with a closing spread. A segment marked thin has
              fewer than 30 games.
            </p>
          </>
        )}
      </section>

      <Suspense
        fallback={
          <p role="status" className="text-sm text-muted-foreground">
            Loading historical comparison…
          </p>
        }
      >
        <HistoricalBacktest />
      </Suspense>
    </div>
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
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-heading text-lg">
          Historical walk-forward backtest
        </h2>
        {seasons.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Frozen, {seasons[0]}&ndash;{seasons[seasons.length - 1]}
          </div>
        )}
      </div>

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Every prediction below was made walking forward through each season with
        only the data available at the time, then frozen. These are historical
        stand-ins for live performance, not live results. The market benchmark
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
        means the model leans toward home teams. In-game projections anchor on
        the market closing line precisely because the closing line remains the
        better pregame forecast.
      </p>
    </section>
  );
}
