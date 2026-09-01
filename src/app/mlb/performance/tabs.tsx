"use client";

import type {
  ModelEvaluation,
  CalibrationBin,
  EdgeBucket,
  PosteriorSkill,
  PosteriorSigma,
  LiveKpis,
} from "@/lib/types";
import { EMPTY, formatNumber, formatOdds, formatPct, formatSigned } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WindowPager, usePagedWindow } from "@/components/window-pager";
import { KpiCard } from "@/components/kpi-card";
import { AccuracyChart } from "@/components/accuracy-chart";
import { MetricLineChart } from "@/components/metric-line-chart";
import { CalibrationChart } from "@/components/calibration-chart";
import { EquityCurveChart } from "@/components/equity-curve-chart";
import { ResidualsChart } from "@/components/residuals-chart";
import { TopSkillsLeaderboard } from "@/components/top-skills-leaderboard";
import { VarianceDecompositionChart } from "@/components/variance-decomposition-chart";
import { V2Badge } from "@/components/v2-badge";
import { getV2BoundaryDate } from "@/lib/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const REWRITTEN_NOTE =
  "Predictions for this day were overwritten by a later hand-run with a different model. Eval is computed against the rewritten predictions, not what was live on the day.";

interface PerformanceTabsProps {
  evaluations: ModelEvaluation[];
  calibration: CalibrationBin[];
  edgeBuckets: EdgeBucket[];
  residuals: number[];
  posteriorSkills: PosteriorSkill[];
  posteriorSigmas: PosteriorSigma[];
  liveKpis: LiveKpis;
}

export function PerformanceTabs({
  evaluations,
  calibration,
  edgeBuckets,
  residuals,
  posteriorSkills,
  posteriorSigmas,
  liveKpis,
}: PerformanceTabsProps) {
  const dailyEvals = evaluations.filter(
    (e) => !e.eval_window || e.eval_window === "day"
  );
  const seasonEvals = evaluations.filter((e) => e.eval_window === "season");

  // Latest season row for headline KPIs. Skip rows where the headline metrics
  // are all null (happens when today's eval runs before any games have graded).
  const isPopulated = (e: ModelEvaluation) =>
    e.brier_score != null || e.mae != null;
  const findLastPopulated = (rows: ModelEvaluation[]) => {
    for (let i = rows.length - 1; i >= 0; i--) {
      if (isPopulated(rows[i])) return rows[i];
    }
    return rows[rows.length - 1];
  };
  const latest =
    seasonEvals.length > 0
      ? findLastPopulated(seasonEvals)
      : findLastPopulated(dailyEvals);

  const latestCalDate =
    calibration.length > 0 ? calibration[0].date : null;
  const latestCalibration = latestCalDate
    ? calibration
        .filter((c) => c.date === latestCalDate)
        .sort((a, b) => a.bin_mid - b.bin_mid)
    : [];

  const seasonBuckets = edgeBuckets.filter((b) => b.eval_window === "season");
  const latestBucketDate =
    seasonBuckets.length > 0 ? seasonBuckets[0].date : null;
  const latestBuckets = latestBucketDate
    ? seasonBuckets.filter((b) => b.date === latestBucketDate)
    : [];

  return (
    <Tabs defaultValue="overview">
      <div className="mb-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="regression">Regression</TabsTrigger>
          <TabsTrigger value="probabilistic">Probabilistic</TabsTrigger>
          <TabsTrigger value="betting">Betting</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="space-y-8">
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-baseline gap-x-4 gap-y-3 font-mono text-sm">
          <KpiCard
            label="ROI"
            value={formatPct(liveKpis.roi)}
            tooltip="Profit per dollar risked. ROI = total P&L ÷ total stakes. 13% ROI means 13¢ profit per $1 staked, on average - not 13% of your bankroll."
          />
          <KpiCard
            label="Sharpe"
            value={formatNumber(liveKpis.sharpe, 2)}
            tooltip="Risk-adjusted return: mean daily P&L ÷ std dev of daily P&L. >1 is good, >2 excellent."
          />
          <KpiCard
            label="Max DD"
            value={liveKpis.max_drawdown != null ? `${formatSigned(liveKpis.max_drawdown, 2)}u` : EMPTY}
            tooltip="Worst peak-to-trough decline of cumulative P&L, in units. With flat 1u stake sizing (no compounding), drawdown is reported in absolute units rather than as a % of equity - a Kelly-style % would misrepresent a non-compounding strategy."
          />
          <KpiCard
            label="Brier"
            value={formatNumber(latest?.brier_score, 3)}
            tooltip="Mean squared error of probabilistic predictions vs binary outcomes. Lower is better; 0.25 is the coin-flip baseline."
          />
          <KpiCard
            label="MAE"
            value={formatNumber(latest?.mae, 3)}
            tooltip="Mean absolute error of expected runs vs actual runs. Lower is better; ~2.5 is typical for MLB run prediction."
          />
          <KpiCard
            label="Pick Acc"
            value={formatPct(latest?.total_accuracy)}
            sub={`model picks winner (${latest?.total_correct ?? 0}/${latest?.total_predictions ?? 0})`}
          />
        </div>

        <div className="border-t border-border pt-6">
          <h2 className="font-heading text-lg mb-4">Accuracy Over Time</h2>
          <AccuracyChart data={dailyEvals.filter((d) => d.date >= "2026-04-12")} />
        </div>

        <div className="border-t border-border pt-6">
          <h2 className="font-heading text-lg mb-4">Evaluation History</h2>
          <EvalHistoryTable rows={dailyEvals} />
        </div>
      </TabsContent>

      <TabsContent value="regression" className="space-y-8">
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-baseline gap-x-4 gap-y-3 font-mono text-sm">
          <KpiCard label="MAE" value={formatNumber(latest?.mae, 3)} />
          <KpiCard label="RMSE" value={formatNumber(latest?.rmse, 3)} />
          <KpiCard label="R&#178;" value={formatNumber(latest?.r2, 3)} />
          <KpiCard label="MAPE" value={latest?.mape != null ? `${latest.mape.toFixed(1)}%` : "–"} />
        </div>

        <div className="border-t border-border pt-6">
          <h2 className="font-heading text-lg mb-4">MAE Over Time</h2>
          <MetricLineChart
            data={dailyEvals}
            dataKey="mae"
            name="MAE"
            token="chart-3"
          />
        </div>

        <div className="border-t border-border pt-6">
          <h2 className="font-heading text-lg mb-4">RMSE Over Time</h2>
          <MetricLineChart
            data={dailyEvals}
            dataKey="rmse"
            name="RMSE"
            token="chart-2"
          />
        </div>
      </TabsContent>

      <TabsContent value="probabilistic" className="space-y-8">
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-baseline gap-x-4 gap-y-3 font-mono text-sm">
          <KpiCard label="Brier Score" value={formatNumber(latest?.brier_score, 3)} sub="Lower is better (baseline: 0.250)" />
          <KpiCard label="Log Loss" value={formatNumber(latest?.log_loss, 3)} />
          <KpiCard label="Sharpness" value={formatNumber(latest?.sharpness, 4)} sub="Higher = more decisive" />
          <KpiCard label="80% Coverage" value={formatPct(latest?.interval_coverage_80)} sub="Target: 80%" />
        </div>

        <div className="border-t border-border pt-6">
          <h2 className="font-heading text-lg mb-4">Calibration Curve</h2>
          {latestCalibration.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                Season-to-date as of {latestCalDate}. Dashed = perfect calibration.
              </p>
              <CalibrationChart data={latestCalibration} />
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              No calibration data yet.
            </p>
          )}
        </div>

        <div className="border-t border-border pt-6">
          <h2 className="font-heading text-lg mb-4">Brier Score Over Time</h2>
          <MetricLineChart
            data={dailyEvals}
            dataKey="brier_score"
            name="Brier Score"
            token="chart-1"
          />
        </div>
      </TabsContent>

      <TabsContent value="betting" className="space-y-8">
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-baseline gap-x-4 gap-y-3 font-mono text-sm">
          <KpiCard
            label="ROI"
            value={formatPct(liveKpis.roi)}
            tooltip="Profit per dollar risked. ROI = total P&L ÷ total stakes. 13% ROI means the model returns 13¢ profit on every $1 staked, on average. Independent of bankroll size."
          />
          <KpiCard
            label="Sharpe"
            value={formatNumber(liveKpis.sharpe, 2)}
            tooltip="Risk-adjusted return: mean daily P&L ÷ std dev of daily P&L. Higher is better. >1 is good, >2 is excellent."
          />
          <KpiCard
            label="Sortino"
            value={formatNumber(liveKpis.sortino, 2)}
            tooltip="Like Sharpe but penalizes only downside volatility. Better metric for asymmetric strategies (gambling, where upside variance is fine)."
          />
          <KpiCard
            label="Max Drawdown"
            value={liveKpis.max_drawdown != null ? `${formatSigned(liveKpis.max_drawdown, 2)}u` : EMPTY}
            tooltip="Worst peak-to-trough decline of cumulative P&L, in units. Stakes are flat fractions of a fixed 1u base (no compounding), so reporting drawdown as a % of running equity (the Kelly-style metric) would be misleading."
          />
          <KpiCard
            label="P&L"
            value={`${formatSigned(liveKpis.net_profit_units, 2)}u`}
            sub={`${formatNumber(liveKpis.total_staked_units, 2)}u staked`}
            tooltip="Net profit in units. 1 unit = your chosen bankroll size - if your bankroll is $100, 1u = $100. Stakes shown below are TOTAL summed across all bets in the window, not a single bet. Bankroll never compounds; each bet is sized as a fraction of a fixed 1u."
          />
          <KpiCard
            label="Favorites"
            value={formatPct(liveKpis.roi_favorites)}
            sub={`(${liveKpis.favorites_correct}-${liveKpis.n_favorites - liveKpis.favorites_correct})`}
          />
          <KpiCard
            label="Underdogs"
            value={formatPct(liveKpis.roi_underdogs)}
            sub={`(${liveKpis.underdogs_correct}-${liveKpis.n_underdogs - liveKpis.underdogs_correct})`}
          />
          <KpiCard
            label="Run Line"
            value={formatPct(liveKpis.roi_run_line)}
            sub={`(${liveKpis.run_line_bets_correct}-${liveKpis.n_run_line - liveKpis.run_line_bets_correct})`}
            tooltip="Run-line bet ROI. Computed from the same ledger as the headline ROI; bets sized via quarter-Kelly on the model's cover probability vs. book spread odds."
          />
          <KpiCard label="Avg Line" value={formatOdds(liveKpis.avg_ml_line)} />
          <KpiCard
            label="Overs"
            value={formatPct(liveKpis.overs_roi)}
            sub={`(${liveKpis.overs_correct}-${liveKpis.overs_predictions - liveKpis.overs_correct})`}
          />
          <KpiCard
            label="Unders"
            value={formatPct(liveKpis.unders_roi)}
            sub={`(${liveKpis.unders_correct}-${liveKpis.unders_predictions - liveKpis.unders_correct})`}
          />
        </div>

        <div className="border-t border-border pt-6">
          <h2 className="font-heading text-lg mb-4">Equity Curve</h2>
          {dailyEvals.some((d) => d.equity_end_units != null) ? (
            <EquityCurveChart data={dailyEvals.filter((d) => d.equity_end_units != null)} />
          ) : (
            <p className="text-muted-foreground text-sm">
              No equity data yet.
            </p>
          )}
        </div>

        <div className="border-t border-border pt-6">
          <h2 className="font-heading text-lg mb-4">Daily History</h2>
          {dailyEvals.length > 0 ? (
            <DailyBettingHistory rows={dailyEvals} />
          ) : (
            <p className="text-muted-foreground text-sm">
              No daily history yet.
            </p>
          )}
        </div>

        <div className="border-t border-border pt-6">
          <h2 className="font-heading text-lg mb-4">Hit Rate by Edge Bucket</h2>
          {latestBuckets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Edge Bucket</TableHead>
                  <TableHead className="text-right">Bets</TableHead>
                  <TableHead className="text-right">Hit Rate</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestBuckets.map((b) => (
                  <TableRow key={b.bucket_label}>
                    <TableCell className="font-medium">{b.bucket_label}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {b.n_bets}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatPct(b.hit_rate)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatPct(b.roi)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">
              No edge bucket data yet.
            </p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="diagnostics" className="space-y-8">
        <div>
          <h2 className="font-heading text-lg mb-1">Posterior Skill Leaderboard</h2>
          <p className="text-muted-foreground text-xs mb-4">
            xwOBA from the hierarchical Bayesian skill model. Season-long posterior estimate, refreshed after each refit.
          </p>
          {posteriorSkills.length > 0 ? (
            <TopSkillsLeaderboard skills={posteriorSkills} />
          ) : (
            <p className="text-muted-foreground text-sm">
              No skill data yet. Runs after train-v2.yml completes.
            </p>
          )}
        </div>

        <div className="border-t border-border pt-6">
          <h2 className="font-heading text-lg mb-4">Variance Decomposition</h2>
          {posteriorSigmas.length > 0 ? (
            <VarianceDecompositionChart data={posteriorSigmas} />
          ) : (
            <p className="text-muted-foreground text-sm">
              No sigma data yet. Runs after train-v2.yml completes.
            </p>
          )}
        </div>

        <div className="border-t border-border pt-6">
          <h2 className="font-heading text-lg mb-4">Prediction Interval Coverage</h2>
          <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-baseline gap-x-4 gap-y-3 font-mono text-sm">
            <KpiCard
              label="50% Interval"
              value={formatPct(latest?.interval_coverage_50)}
              sub="Target: 50%"
            />
            <KpiCard
              label="80% Interval"
              value={formatPct(latest?.interval_coverage_80)}
              sub="Target: 80%"
            />
            <KpiCard
              label="90% Interval"
              value={formatPct(latest?.interval_coverage_90)}
              sub="Target: 90%"
            />
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <h2 className="font-heading text-lg mb-4">MAE Over Time</h2>
          <MetricLineChart data={dailyEvals} dataKey="mae" name="MAE" token="chart-3" />
        </div>

        <div className="border-t border-border pt-6">
          <h2 className="font-heading text-lg mb-4">Residual Distribution</h2>
          {residuals.length > 0 ? (
            <ResidualsChart residuals={residuals} />
          ) : (
            <p className="text-muted-foreground text-sm">
              No graded games yet.
            </p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function EvalHistoryTable({ rows }: { rows: ModelEvaluation[] }) {
  const paged = usePagedWindow(rows);
  const firstV2Date = getV2BoundaryDate(paged.visible);

  return (
    <div>
      <WindowPager
        label="Evaluation window"
        windowKey={paged.windowKey}
        onWindow={paged.setWindow}
        page={paged.page}
        totalPages={paged.totalPages}
        onPage={paged.setPage}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Pick Acc</TableHead>
            <TableHead>ML</TableHead>
            <TableHead>Run Line</TableHead>
            <TableHead>Totals</TableHead>
            <TableHead className="text-right">MAE</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paged.visible.map((row) => (
            <TableRow key={row.date}>
              <TableCell className="font-medium">
                {row.date}
                {row.date.slice(0, 10) === firstV2Date ? <V2Badge /> : null}
                {row.predictions_rewritten ? (
                  <span
                    className="ml-2 inline-block rounded-sm border border-amber-500/40 bg-amber-500/10 px-1.5 py-0 text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400"
                    title={REWRITTEN_NOTE}
                  >
                    recomputed<span className="sr-only">: {REWRITTEN_NOTE}</span>
                  </span>
                ) : null}
              </TableCell>
              <TableCell>
                {row.total_correct}/{row.total_predictions}{" "}
                <span className="text-muted-foreground">
                  ({formatPct(row.total_accuracy)})
                </span>
              </TableCell>
              <TableCell>
                {row.ml_correct}/{row.ml_predictions}{" "}
                <span className="text-muted-foreground">
                  ({formatPct(row.ml_accuracy)})
                </span>
              </TableCell>
              <TableCell>
                {row.run_line_correct}/{row.run_line_predictions}{" "}
                <span className="text-muted-foreground">
                  ({formatPct(row.run_line_accuracy)})
                </span>
              </TableCell>
              <TableCell>
                {row.totals_correct ?? EMPTY}/
                {row.totals_predictions ?? EMPTY}{" "}
                <span className="text-muted-foreground">
                  ({formatPct(row.totals_accuracy)})
                </span>
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatNumber(row.mae ?? row.average_total_diff, 3)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DailyBettingHistory({ rows }: { rows: ModelEvaluation[] }) {
  const paged = usePagedWindow(rows);
  const firstV2Date = getV2BoundaryDate(paged.visible);

  return (
    <div>
      <WindowPager
        label="Betting history window"
        windowKey={paged.windowKey}
        onWindow={paged.setWindow}
        page={paged.page}
        totalPages={paged.totalPages}
        onPage={paged.setPage}
      />
      <p className="text-xs text-muted-foreground mb-2 font-mono">
        Stakes = total units risked summed across all bets that day (not per-bet). 1u = your bankroll. ROI = P&amp;L ÷ Stakes.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Bets</TableHead>
            <TableHead className="text-right">Stakes</TableHead>
            <TableHead className="text-right">P&amp;L</TableHead>
            <TableHead className="text-right">ROI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paged.visible.map((d) => {
            const bets =
              (d.ml_predictions ?? 0) +
              (d.run_line_predictions ?? 0) +
              (d.totals_predictions ?? 0);
            const roiClass =
              d.roi == null
                ? ""
                : d.roi > 0
                ? "text-positive"
                : d.roi < 0
                ? "text-negative"
                : "";
            return (
              <TableRow key={d.date}>
                <TableCell className="font-medium">
                  {d.date}
                  {d.date.slice(0, 10) === firstV2Date ? <V2Badge /> : null}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {bets}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatNumber(d.total_staked_units, 2)}u
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatSigned(d.net_profit_units, 2)}u
                </TableCell>
                <TableCell className={`text-right font-mono tabular-nums ${roiClass}`}>
                  {formatPct(d.roi)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
