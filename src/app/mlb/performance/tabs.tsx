"use client";

import { useMemo, type ReactNode } from "react";
import type {
  ModelEvaluation,
  CalibrationBin,
  EdgeBucket,
  PosteriorSigma,
  LiveKpis,
} from "@/lib/types";
import { EMPTY, formatNumber, formatOdds, formatPct, formatSigned } from "@/lib/utils";
import { replaceLocation, useLocationSearch } from "@/lib/use-location-search";
import { ViewTabPanel, ViewTabs } from "@/components/view-tabs";
import { WindowPager, usePagedWindow } from "@/components/window-pager";
import { KpiCard } from "@/components/kpi-card";
import { AccuracyChart } from "@/components/accuracy-chart";
import { MetricLineChart } from "@/components/metric-line-chart";
import { CalibrationChart } from "@/components/calibration-chart";
import { EquityCurveChart } from "@/components/equity-curve-chart";
import { ResidualsChart } from "@/components/residuals-chart";
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

// The same three views, and the same ?view= values, as the football and
// hockey performance pages.
const VIEWS = [
  { key: "accuracy", label: "Forecast accuracy" },
  { key: "picks", label: "Prediction results" },
  { key: "players", label: "Player models" },
] as const;
type View = (typeof VIEWS)[number]["key"];

interface PerformanceTabsProps {
  evaluations: ModelEvaluation[];
  calibration: CalibrationBin[];
  edgeBuckets: EdgeBucket[];
  residuals: number[];
  posteriorSigmas: PosteriorSigma[];
  liveKpis: LiveKpis | null;
  players: ReactNode;
}

// A push is neither a win nor a loss; show it as a third number only when one
// exists so W-L stays compact for markets that cannot push.
function formatRecord(wins: number, total: number, pushes: number): string {
  const losses = total - wins - pushes;
  return pushes > 0 ? `${wins}-${losses}-${pushes}` : `${wins}-${losses}`;
}

function Section({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t border-border pt-6">
      <div className="space-y-1">
        <h2 className="type-section">{title}</h2>
        {note && <p className="max-w-3xl type-meta text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

const KPI_ROW = "grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-10";

// Observed coverage of each nominal interval as a dot against its target tick.
// Closer to the tick is better; neither side earns a color.
function CoverageTargets({ latest }: { latest: ModelEvaluation | undefined }) {
  const n = latest?.interval_coverage_predictions;
  const rows = [
    { nominal: 0.5, observed: latest?.interval_coverage_50 },
    { nominal: 0.8, observed: latest?.interval_coverage_80 },
    { nominal: 0.9, observed: latest?.interval_coverage_90 },
  ];
  if (!n) return <p className="type-label text-muted-foreground">Frozen distributions are not available yet.</p>;
  return (
    <div className="max-w-xl space-y-3">
      {rows.map((row) => (
        <div key={row.nominal} className="grid grid-cols-[3rem_minmax(0,1fr)_3.5rem] items-center gap-3">
          <span className="type-label font-semibold tabular-nums">{formatPct(row.nominal, 0)}</span>
          <span aria-hidden="true" className="relative h-4">
            <span className="absolute inset-x-0 top-1/2 h-px bg-grid" />
            <span
              className="absolute top-0 h-4 w-0 border-l border-dashed border-chart-comparison"
              style={{ left: `${row.nominal * 100}%` }}
            />
            {row.observed != null && (
              <span
                className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-primary"
                style={{ left: `${row.observed * 100}%` }}
              />
            )}
          </span>
          <span className="text-right type-label tabular-nums">{formatPct(row.observed, 0)}</span>
        </div>
      ))}
      <p className="type-meta text-muted-foreground">
        Dot: share of games whose actual total landed inside the interval. Dashed tick: the interval&apos;s nominal level.
        {" "}{n} frozen distributions.
      </p>
    </div>
  );
}

export function PerformanceTabs({
  evaluations,
  calibration,
  edgeBuckets,
  residuals,
  posteriorSigmas,
  liveKpis,
  players,
}: PerformanceTabsProps) {
  const search = useLocationSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const view: View = VIEWS.find((v) => v.key === params.get("view"))?.key ?? "accuracy";
  function select(next: View) {
    const url = new URL(window.location.href);
    if (next === "accuracy") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    replaceLocation(url);
  }

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
    <ViewTabs label="Performance view" options={VIEWS} value={view} onValueChange={select}>
      <ViewTabPanel value={view} className="space-y-8">
        {view !== "players" && latest?.evaluation_state === "provisional" && (
          <p className="type-meta text-muted-foreground">Live results are provisional until nightly reconciliation.</p>
        )}

        {view === "accuracy" && (
          <>
            <div className={KPI_ROW}>
              <KpiCard
                label="Brier"
                value={formatNumber(latest?.brier_score, 3)}
                sub="Coin flip 0.250; lower is better"
                tooltip="Average squared error of win probabilities. Lower is better; a coin flip scores 0.25."
              />
              <KpiCard label="Log loss" value={formatNumber(latest?.log_loss, 3)} sub="Coin flip 0.693" />
              <KpiCard
                label="Winner"
                value={formatPct(latest?.total_accuracy)}
                sub={`${latest?.total_correct ?? 0} of ${latest?.total_predictions ?? 0} correct`}
                tooltip="Share of predictions where the model's favored side won."
              />
              <KpiCard
                label="Runs MAE"
                value={formatNumber(latest?.mae, 2)}
                sub="Runs per team, lower is better"
                tooltip="Average distance between predicted and actual runs."
              />
            </div>

            <Section title="Accuracy by market">
              <AccuracyChart data={dailyEvals.filter((d) => d.date >= "2026-04-12")} />
            </Section>

            <Section
              title="Calibration"
              note={latestCalDate ? `Season to date as of ${latestCalDate}. Points on the dashed diagonal are perfectly calibrated.` : undefined}
            >
              {latestCalibration.length > 0 ? (
                <div className="max-w-xl">
                  <CalibrationChart data={latestCalibration} />
                </div>
              ) : (
                <p className="type-label text-muted-foreground">No calibration data yet.</p>
              )}
            </Section>

            <Section title="Error by day" note="Each point is one day's games, so single days swing widely; read the trend, not the spikes.">
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                <figure className="space-y-1">
                  <figcaption className="type-label font-semibold">Brier score <span className="font-normal text-muted-foreground">(dashed: coin flip)</span></figcaption>
                  <MetricLineChart data={dailyEvals} dataKey="brier_score" name="Brier score" baseline={0.25} />
                </figure>
                <figure className="space-y-1">
                  <figcaption className="type-label font-semibold">Runs MAE</figcaption>
                  <MetricLineChart data={dailyEvals} dataKey="mae" name="Runs MAE" formatter={(v) => v.toFixed(2)} />
                </figure>
              </div>
              <div className={KPI_ROW}>
                <KpiCard label="RMSE" value={formatNumber(latest?.rmse, 2)} />
                <KpiCard label="R²" value={formatNumber(latest?.r2, 3)} />
                <KpiCard label="MAPE" value={latest?.mape != null ? `${latest.mape.toFixed(1)}%` : EMPTY} />
                <KpiCard label="Sharpness" value={formatNumber(latest?.sharpness, 3)} sub="Higher is more decisive" />
              </div>
            </Section>

            <Section title="Interval coverage" note="How often the actual run total landed inside the model's 50%, 80% and 90% intervals. Coverage should match the target, not be maximized.">
              <CoverageTargets latest={latest} />
            </Section>

            <Section title="Model diagnostics">
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                <figure className="space-y-2">
                  <figcaption className="type-label font-semibold">Variance decomposition</figcaption>
                  {posteriorSigmas.length > 0 ? (
                    <VarianceDecompositionChart data={posteriorSigmas} />
                  ) : (
                    <p className="type-label text-muted-foreground">No variance estimates yet.</p>
                  )}
                </figure>
                <figure className="space-y-2">
                  <figcaption className="type-label font-semibold">Run residuals (actual minus predicted)</figcaption>
                  {residuals.length > 0 ? (
                    <ResidualsChart residuals={residuals} />
                  ) : (
                    <p className="type-label text-muted-foreground">No graded games yet.</p>
                  )}
                </figure>
              </div>
            </Section>

            <Section title="Daily evaluation">
              <EvalHistoryTable rows={dailyEvals} />
            </Section>
          </>
        )}

        {view === "picks" && (
          <>
            {liveKpis === null ? (
              <p role="status" className="type-label text-muted-foreground">Prediction results are temporarily unavailable.</p>
            ) : (
              <>
                <div className={KPI_ROW}>
                  <KpiCard
                    label="ROI"
                    value={formatPct(liveKpis.roi)}
                    tooltip="Net profit divided by total stakes. A 13% ROI means 13¢ profit per $1 risked."
                  />
                  <KpiCard
                    label="P&L"
                    value={`${formatSigned(liveKpis.net_profit_units, 2)}u`}
                    sub={`${formatNumber(liveKpis.total_staked_units, 2)}u staked`}
                    tooltip="Net profit in units of the fixed starting bankroll. Stakes sum every recommended prediction in the period; returns do not compound."
                  />
                  <KpiCard
                    label="Max drawdown"
                    value={liveKpis.max_drawdown != null ? `${formatSigned(liveKpis.max_drawdown, 2)}u` : EMPTY}
                    tooltip="Largest drop from a cumulative profit peak, in units. Stakes use a fixed base without compounding."
                  />
                  <KpiCard
                    label="Sharpe"
                    value={formatNumber(liveKpis.sharpe, 2)}
                    sub={`Sortino ${formatNumber(liveKpis.sortino, 2)}`}
                    tooltip="Average daily profit divided by its day-to-day variability. Sortino counts only downside variability."
                  />
                </div>
                <Section title="By market" note="ROI with the win-loss record behind it. Run line uses quarter-Kelly sizing.">
                  <MarketRoi
                    rows={[
                      { label: "Favorites", roi: liveKpis.roi_favorites, record: formatRecord(liveKpis.favorites_correct, liveKpis.n_favorites, 0) },
                      { label: "Underdogs", roi: liveKpis.roi_underdogs, record: formatRecord(liveKpis.underdogs_correct, liveKpis.n_underdogs, 0) },
                      { label: "Run line", roi: liveKpis.roi_run_line, record: formatRecord(liveKpis.run_line_bets_correct, liveKpis.n_run_line, 0) },
                      { label: "Overs", roi: liveKpis.overs_roi, record: formatRecord(liveKpis.overs_correct, liveKpis.overs_predictions, liveKpis.overs_pushes) },
                      { label: "Unders", roi: liveKpis.unders_roi, record: formatRecord(liveKpis.unders_correct, liveKpis.unders_predictions, liveKpis.unders_pushes) },
                    ]}
                  />
                  <p className="type-meta text-muted-foreground">Average moneyline price {formatOdds(liveKpis.avg_ml_line)}.</p>
                </Section>
              </>
            )}

            <Section title="Cumulative units">
              {dailyEvals.some((d) => d.equity_end_units != null) ? (
                <EquityCurveChart data={dailyEvals.filter((d) => d.equity_end_units != null)} />
              ) : (
                <p className="type-label text-muted-foreground">No results yet.</p>
              )}
            </Section>

            <Section title="Results by edge" note="Season to date, grouped by the model's edge over the price when the prediction was made.">
              {latestBuckets.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Edge</TableHead>
                      <TableHead className="text-right">Predictions</TableHead>
                      <TableHead className="text-right">Hit rate</TableHead>
                      <TableHead className="text-right">ROI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latestBuckets.map((b) => (
                      <TableRow key={b.bucket_label}>
                        <TableCell className="font-medium">{b.bucket_label}</TableCell>
                        <TableCell className="text-right tabular-nums">{b.n_bets}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatPct(b.hit_rate)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatPct(b.roi)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="type-label text-muted-foreground">No edge data yet.</p>
              )}
            </Section>

            <Section title="Daily results">
              {dailyEvals.length > 0 ? (
                <DailyResults rows={dailyEvals} />
              ) : (
                <p className="type-label text-muted-foreground">No daily results yet.</p>
              )}
            </Section>
          </>
        )}

        {view === "players" && players}
      </ViewTabPanel>
    </ViewTabs>
  );
}

// ROI per market as a zero-centered bar on one shared scale, record alongside.
function MarketRoi({ rows }: { rows: { label: string; roi: number | null | undefined; record: string }[] }) {
  const extent = Math.max(0.05, ...rows.map((r) => Math.abs(r.roi ?? 0)));
  return (
    <ul className="max-w-2xl divide-y divide-border">
      {rows.map((row) => {
        const share = row.roi == null ? 0 : (Math.abs(row.roi) / extent) * 50;
        return (
          <li key={row.label} className="grid grid-cols-[6rem_minmax(0,1fr)_4rem] items-center gap-3 py-2 sm:grid-cols-[7rem_minmax(0,1fr)_4rem_4.5rem]">
            <span className="type-label font-semibold">{row.label}</span>
            <span aria-hidden="true" className="relative h-3">
              <span className="absolute inset-y-[-3px] left-1/2 w-px bg-rule-strong" />
              {row.roi != null && row.roi !== 0 && (
                <span
                  className={`absolute inset-y-0 rounded-[2px] ${row.roi > 0 ? "bg-better" : "bg-worse"}`}
                  style={row.roi < 0 ? { right: "50%", width: `${share}%` } : { left: "50%", width: `${share}%` }}
                />
              )}
            </span>
            <span className="text-right type-label tabular-nums">{formatPct(row.roi)}</span>
            <span className="hidden text-right type-meta tabular-nums text-muted-foreground sm:block">{row.record}</span>
          </li>
        );
      })}
    </ul>
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
            <TableHead>All</TableHead>
            <TableHead>Moneyline</TableHead>
            <TableHead className="hidden sm:table-cell">Run line</TableHead>
            <TableHead className="hidden sm:table-cell">Totals</TableHead>
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
                    className="type-eyebrow ml-2 inline-block rounded-sm border border-amber-500/40 bg-amber-500/10 px-1.5 py-0 text-amber-600 dark:text-amber-400"
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
              <TableCell className="hidden sm:table-cell">
                {row.run_line_correct}/{row.run_line_predictions}{" "}
                <span className="text-muted-foreground">
                  ({formatPct(row.run_line_accuracy)})
                </span>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
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

function DailyResults({ rows }: { rows: ModelEvaluation[] }) {
  const paged = usePagedWindow(rows);
  const firstV2Date = getV2BoundaryDate(paged.visible);

  return (
    <div>
      <WindowPager
        label="Daily results window"
        windowKey={paged.windowKey}
        onWindow={paged.setWindow}
        page={paged.page}
        totalPages={paged.totalPages}
        onPage={paged.setPage}
      />
      <p className="mb-2 type-meta text-muted-foreground">
        Stakes are the units risked across every recommended prediction that day. 1u is the bankroll; ROI is P&amp;L divided by stakes.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Predictions</TableHead>
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
