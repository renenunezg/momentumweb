"use client";

import { useMemo, type ReactNode } from "react";
import type {
  ModelEvaluation,
  CalibrationBin,
  EdgeBucket,
  PosteriorSigma,
  LiveKpis,
} from "@/lib/types";
import { EMPTY, describeGap, formatDate, formatInterval, formatNumber, formatOdds, formatPct, formatSigned } from "@/lib/utils";
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
import { V2_CUTOVER_DATE, getV2BoundaryDate } from "@/lib/constants";
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

// The same three views, and the same ?view= values, as the football
// performance pages; hockey has no player model.
const VIEWS = [
  { key: "players", label: "Player models" },
  { key: "accuracy", label: "Forecast accuracy" },
  { key: "picks", label: "Predictions" },
] as const;
type View = (typeof VIEWS)[number]["key"];

interface PerformanceTabsProps {
  evaluations: ModelEvaluation[];
  calibration: CalibrationBin[];
  edgeBuckets: EdgeBucket[];
  residuals: number[];
  posteriorSigmas: PosteriorSigma[];
  liveKpis: LiveKpis | null;
  eraKpis: { v1: LiveKpis; v2: LiveKpis } | null;
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

// Lower Brier is better, so a gap interval above zero means the market won.
function brierGapVerdict(lo: number | null | undefined, hi: number | null | undefined): string {
  if (lo == null || hi == null) return "no interval";
  if (lo > 0) return "market better, clear of zero";
  if (hi < 0) return "model better, clear of zero";
  return "within noise";
}

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
        Dot: share of team run totals that landed inside the interval. Dashed tick: the interval&apos;s nominal level.
        {" "}{n} team rows, v2 games only (v1 published no intervals). The intervals use inclusive integer
        endpoints, so they cover somewhat more than their nominal level by construction.
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
  eraKpis,
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
  // The nightly job publishes a v2-only season row beside the pooled one; the
  // headline is the model in use and the pooled row stays available.
  const seasonV2Evals = evaluations.filter((e) => e.eval_window === "season_v2");

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
  const combined =
    seasonEvals.length > 0
      ? findLastPopulated(seasonEvals)
      : findLastPopulated(dailyEvals);
  const current = seasonV2Evals.length > 0 ? findLastPopulated(seasonV2Evals) : null;
  const latest = current ?? combined;
  const headlineLabel = current ? "v2 only, the model in use" : "v1 and v2 pooled";
  const pct1 = (v: number) => formatPct(v);
  const num3 = (v: number) => formatNumber(v, 3);

  const latestCalDate =
    calibration.length > 0 ? calibration[0].date : null;
  const latestCalibration = latestCalDate
    ? calibration
        .filter((c) => c.date === latestCalDate)
        .sort((a, b) => a.bin_mid - b.bin_mid)
    : [];

  const bucketWindow = edgeBuckets.some((b) => b.eval_window === "season_v2") ? "season_v2" : "season";
  const seasonBuckets = edgeBuckets.filter((b) => b.eval_window === bucketWindow);
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
                sub={formatInterval(latest?.brier_ci95_low, latest?.brier_ci95_high, num3) ?? "Coin flip 0.250; lower is better"}
                tooltip="Average squared error of win probabilities over both teams of every graded game. Lower is better; a coin flip scores 0.25. The range is a 95 percent bootstrap interval when one is published."
              />
              {latest?.market_brier != null && (
                <KpiCard
                  label="Market Brier"
                  value={formatNumber(latest.market_brier, 3)}
                  sub={`${latest.paired_games ?? 0} paired games`}
                  tooltip="Brier of the de-vigged pregame moneyline on the same games, scored the same way. The model's Brier on those paired games is shown beside it."
                />
              )}
              {latest?.market_brier != null && latest.paired_brier != null && (
                <KpiCard
                  label="Model vs market"
                  value={describeGap(latest.paired_brier - latest.market_brier, latest.brier_vs_market_ci95_low, latest.brier_vs_market_ci95_high, 4).text}
                  sub={brierGapVerdict(latest.brier_vs_market_ci95_low, latest.brier_vs_market_ci95_high)}
                  tooltip="Model Brier minus market Brier on the paired games; negative means the model scored better. The range is a 95 percent bootstrap interval."
                />
              )}
              <KpiCard
                label="Log loss"
                value={formatNumber(latest?.log_loss, 3)}
                sub={latest?.market_log_loss != null ? `Market ${formatNumber(latest.market_log_loss, 3)} on paired games` : "Coin flip 0.693"}
              />
              <KpiCard
                label="Winner"
                value={formatPct(latest?.total_accuracy)}
                sub={formatInterval(latest?.total_accuracy_ci95_low, latest?.total_accuracy_ci95_high, pct1) ?? `${latest?.total_correct ?? 0} of ${latest?.total_predictions ?? 0} correct`}
                tooltip="Share of predictions where the model's favored side won. The range is a 95 percent bootstrap interval when one is published."
              />
              <KpiCard
                label="Runs MAE"
                value={formatNumber(latest?.mae, 2)}
                sub="Runs per team, lower is better"
                tooltip="Average distance between predicted and actual runs."
              />
            </div>
            <p className="max-w-3xl type-meta text-muted-foreground">
              {latest?.scored_games ?? latest?.total_predictions ?? 0} graded games
              {latest?.scored_games == null && " with a favored side"}
              {dailyEvals.length > 0 && <>, {current ? formatDate(V2_CUTOVER_DATE) : formatDate(dailyEvals[0].date)} to {formatDate(dailyEvals[dailyEvals.length - 1].date)}</>},
              {" "}{headlineLabel}, regular season and postseason.
              {latest?.excluded_games != null
                ? ` ${latest.excluded_games} completed games have no gradable forecast and are excluded.`
                : " Completed games with no stored forecast or an even 50/50 probability are not counted."}
              {latest?.late_forecast_games != null && latest.late_forecast_games > 0 && ` ${latest.late_forecast_games} games whose forecast was written after first pitch stay in the record and are flagged in the export.`}
              {latest?.market_brier == null && " The coin flip is the only reference shown; a market baseline on the same games is not published yet."}
              {" "}
              <a href="/mlb/api/export/predictions.csv" className="underline underline-offset-4">Download the graded predictions (CSV)</a>.
            </p>
            {current && combined && (
              <Section title="All versions pooled" note="v1 (XGBoost, through May 11) and v2 together, the population the daily tables below cover.">
                <div className={KPI_ROW}>
                  <KpiCard label="Brier" value={formatNumber(combined.brier_score, 3)} sub={formatInterval(combined.brier_ci95_low, combined.brier_ci95_high, num3) ?? "Coin flip 0.250"} />
                  <KpiCard label="Log loss" value={formatNumber(combined.log_loss, 3)} sub="Coin flip 0.693" />
                  <KpiCard label="Winner" value={formatPct(combined.total_accuracy)} sub={`${combined.total_correct} of ${combined.total_predictions} correct`} />
                  <KpiCard label="Runs MAE" value={formatNumber(combined.mae, 2)} sub="Runs per team" />
                </div>
              </Section>
            )}

            <Section title="Accuracy by market">
              <AccuracyChart data={dailyEvals.filter((d) => d.date >= "2026-04-12")} />
            </Section>

            <Section
              title="Calibration"
              note={latestCalDate ? `Season to date as of ${latestCalDate}, both model versions, one point per team row. Points on the dashed diagonal are perfectly calibrated; hover for the rows in each bin, which thin out at the extremes.` : undefined}
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
                <p className="max-w-3xl type-meta text-muted-foreground">
                  {liveKpis.n_bets} staked predictions
                  {liveKpis.first_date && liveKpis.last_date && <>, {formatDate(liveKpis.first_date)} to {formatDate(liveKpis.last_date)}</>},
                  v1 through May 11 and v2 from May 12, regular season and postseason, at quarter-Kelly
                  stakes. The record applies today&apos;s edge gate (4.5 percent on moneyline and run line,
                  6.5 percent on totals) to every past prediction, so some plays shown on the day are not
                  counted. Prices are the best pregame line published, not a closing line.
                  {(liveKpis.n_written_after_start > 0 || liveKpis.n_rewritten > 0) && (
                    <> {liveKpis.n_written_after_start} predictions were written after first pitch and {liveKpis.n_rewritten} belong to a day whose predictions were later rewritten; both stay in the record and are flagged in the export.</>
                  )}{" "}
                  <a href="/mlb/api/export/ledger.csv" className="underline underline-offset-4">Download the ledger (CSV)</a>.
                </p>
                <div className={KPI_ROW}>
                  <KpiCard
                    label="ROI"
                    value={formatPct(liveKpis.roi)}
                    sub={formatInterval(combined?.roi_ci95_low, combined?.roi_ci95_high, pct1) ?? `${liveKpis.n_bets} predictions`}
                    tooltip="Net profit divided by total stakes at the best pregame price published among DraftKings, FanDuel and BetMGM, not a closing line. A 13% ROI means 13¢ profit per $1 risked."
                  />
                  <KpiCard
                    label="P&L"
                    value={`${formatSigned(liveKpis.net_profit_units, 2)}u`}
                    sub={`${formatNumber(liveKpis.total_staked_units, 2)}u staked`}
                    tooltip="Net profit in units of the fixed starting bankroll. Stakes sum every prediction staked in the period; returns do not compound."
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
                    tooltip="Average daily return divided by its day-to-day variability, annualized by the square root of 252. Sortino counts only downside variability."
                  />
                </div>
                {eraKpis && (
                  <Section title="By model version" note={`v2 is the model in use; v1 was retired on ${formatDate(V2_CUTOVER_DATE)}. Each row is that model's own predictions at the prices it was published against.`}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Model</TableHead>
                          <TableHead className="text-right">Predictions</TableHead>
                          <TableHead className="text-right">Record</TableHead>
                          <TableHead className="text-right">Staked</TableHead>
                          <TableHead className="text-right">P&amp;L</TableHead>
                          <TableHead className="text-right">ROI</TableHead>
                          <TableHead className="text-right">95% interval</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          { label: "v2, current", kpis: eraKpis.v2, row: current },
                          { label: "v1, retired", kpis: eraKpis.v1, row: null },
                          { label: "Both", kpis: liveKpis, row: combined },
                        ].map(({ label, kpis, row }) => (
                          <TableRow key={label}>
                            <TableCell className="font-medium">{label}</TableCell>
                            <TableCell className="text-right tabular-nums">{kpis.n_bets}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatRecord(kpis.n_wins, kpis.n_bets, kpis.n_pushes)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatNumber(kpis.total_staked_units, 2)}u</TableCell>
                            <TableCell className="text-right tabular-nums">{formatSigned(kpis.net_profit_units, 2)}u</TableCell>
                            <TableCell className="text-right tabular-nums">{formatPct(kpis.roi)}</TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">{formatInterval(row?.roi_ci95_low, row?.roi_ci95_high, pct1) ?? EMPTY}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Section>
                )}
                <Section title="By market" note="ROI with the win-loss record behind it, for the current model and for both versions pooled. Run line uses quarter-Kelly sizing.">
                  <div className="grid gap-6 md:grid-cols-2">
                    {[
                      { title: `v2, current model, since ${formatDate(V2_CUTOVER_DATE)}`, kpis: eraKpis?.v2 ?? liveKpis, row: current },
                      { title: "Both versions pooled", kpis: liveKpis, row: combined },
                    ].map(({ title, kpis, row }) => (
                      <div key={title} className="space-y-2">
                        <h3 className="type-label font-semibold">{title}</h3>
                        <MarketRoi
                          rows={[
                            { label: "Favorites", roi: kpis.roi_favorites, record: formatRecord(kpis.favorites_correct, kpis.n_favorites, 0), ci: formatInterval(row?.roi_favorites_ci95_low, row?.roi_favorites_ci95_high, pct1) },
                            { label: "Underdogs", roi: kpis.roi_underdogs, record: formatRecord(kpis.underdogs_correct, kpis.n_underdogs, 0), ci: formatInterval(row?.roi_underdogs_ci95_low, row?.roi_underdogs_ci95_high, pct1) },
                            { label: "Run line", roi: kpis.roi_run_line, record: formatRecord(kpis.run_line_bets_correct, kpis.n_run_line, 0), ci: formatInterval(row?.roi_run_line_ci95_low, row?.roi_run_line_ci95_high, pct1) },
                            { label: "Overs", roi: kpis.overs_roi, record: formatRecord(kpis.overs_correct, kpis.overs_predictions, kpis.overs_pushes), ci: formatInterval(row?.overs_roi_ci95_low, row?.overs_roi_ci95_high, pct1) },
                            { label: "Unders", roi: kpis.unders_roi, record: formatRecord(kpis.unders_correct, kpis.unders_predictions, kpis.unders_pushes), ci: formatInterval(row?.unders_roi_ci95_low, row?.unders_roi_ci95_high, pct1) },
                          ]}
                        />
                        <p className="type-meta text-muted-foreground">Average moneyline price {formatOdds(kpis.avg_ml_line)}.</p>
                      </div>
                    ))}
                  </div>
                </Section>
              </>
            )}

            <Section title="Cumulative units" note="Running total of units since the first prediction, starting from 1u, both model versions.">
              {dailyEvals.some((d) => d.equity_end_units != null) ? (
                <EquityCurveChart data={dailyEvals.filter((d) => d.equity_end_units != null)} />
              ) : (
                <p className="type-label text-muted-foreground">No results yet.</p>
              )}
            </Section>

            <Section title="Results by edge" note={`Season to date, ${bucketWindow === "season_v2" ? "v2 only" : "both model versions"}, grouped by the model's edge over the price when the prediction was made.`}>
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
function MarketRoi({ rows }: { rows: { label: string; roi: number | null | undefined; record: string; ci?: string | null }[] }) {
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
            <span className="hidden text-right type-meta tabular-nums text-muted-foreground sm:block">{row.record}{row.ci ? <span className="block">{row.ci}</span> : null}</span>
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
        Stakes are the units risked across every prediction staked that day. 1u is the bankroll; ROI is P&amp;L divided by stakes.
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
