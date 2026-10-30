import { formatSiteTimestamp } from "@/lib/site-time";
import type { ReactNode } from "react";
import { Notice } from "@/components/notice";
import {
  describeClosingSources,
  gapInterval,
  type FootballLivePerformance,
  type FootballPerformanceCopy,
  type FootballPerformanceMetric,
} from "@/lib/football-performance";
import type { CfbPredictionSource } from "@/lib/types";
import { describeGap, formatNumber, formatPct, formatSigned } from "@/lib/utils";
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
  return formatSiteTimestamp(value);
}

const SOURCE_LABELS: Record<CfbPredictionSource, string> = {
  pure_model: "Pure model",
  market_informed: "Published (market-informed)",
  closing_market: "Closing line",
};

const numCell = "text-right font-mono tabular-nums";
const mutedNumCell = `${numCell} text-muted-foreground`;

function SegmentTable({
  title,
  rows,
}: {
  title: string;
  rows: FootballPerformanceMetric[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="type-subsection">{title}</h3>
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

// The live-season section shared by the football performance pages. The
// sport supplies its copy and its historical backtest section; the metric
// rows come straight from the sport's performance_metrics table.
export function FootballForecastPerformance({
  live,
  copy,
  backtest,
}: {
  live: FootballLivePerformance;
  copy: FootballPerformanceCopy;
  backtest: ReactNode;
}) {
  const overallBySource = new Map(
    live.metrics
      .filter((m) => m.segment_kind === "overall")
      .map((m) => [m.prediction_source, m]),
  );
  const livePure = overallBySource.get("pure_model") ?? null;
  // The headline grades the line the site published; intervals and win
  // probabilities are only frozen for the pure model.
  const livePublished = overallBySource.get("market_informed") ?? livePure;
  const liveClosing = overallBySource.get("closing_market") ?? null;
  const liveSources = (
    ["pure_model", "market_informed", "closing_market"] as CfbPredictionSource[]
  )
    .map((source) => overallBySource.get(source))
    .filter((m): m is FootballPerformanceMetric => m != null);
  // Segments grade the published line, like the headline.
  const publishedSource = livePublished?.prediction_source ?? "pure_model";
  const composition = copy.compositionKind
    ? live.metrics.filter(
        (m) => m.segment_kind === copy.compositionKind && m.prediction_source === "market_informed",
      )
    : [];
  // Published by the model repo once per version that forecast a live game;
  // until then the sport's copy names them.
  const versionRows = live.metrics.filter(
    (m) => m.segment_kind === "model_version" && m.prediction_source === publishedSource,
  );
  const headlineGap = livePublished ? gapInterval(livePublished) : null;
  const headlineVerdict = livePublished?.model_minus_market_mae != null
    ? describeGap(livePublished.model_minus_market_mae, headlineGap?.[0] ?? null, headlineGap?.[1] ?? null)
    : null;
  const publishedSegments = live.metrics.filter(
    (m) =>
      m.prediction_source === publishedSource && m.segment_kind !== "overall" && m.segment_kind !== "model_version",
  );
  const segmentRows = (kind: string) =>
    publishedSegments.filter((m) => m.segment_kind === kind);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <h2 className="type-section">
          Forecast accuracy
        </h2>
        <div className="text-right text-xs text-muted-foreground">
          <div>{copy.cadence}</div>
          <div>
            Last graded:{" "}
            {live.lastGradedAt ? fmtDate(live.lastGradedAt) : "no games yet"}
          </div>
        </div>
      </div>

      <section className="space-y-section">
        <div className="space-y-2">
          <h2 className="type-section">
            {live.season ?? "Live"} season, graded as played: {copy.seasonLabel}
          </h2>
          <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
            Every row is a frozen record: the projection published before
            kickoff, {copy.closingLine}, and the final score. Nothing is re-fit
            or re-priced after a result is known. The closing line is the bar
            the model is measured against, not an input to it.{" "}
            {versionRows.length > 0
              ? "Each game is graded on the model version published before its kickoff; the by-version table lists them."
              : copy.versions}
          </p>
        </div>

        {live.unavailable ? (
          <Notice role="status">Live grading is temporarily unavailable.</Notice>
        ) : !livePure ? (
          <p className="text-sm text-muted-foreground">
            No completed {live.season ?? "2026"} games have been graded yet.
            Live performance appears here once the first week is final.
          </p>
        ) : (
          <>
            {livePure.thin_sample && (
              <Notice className="bg-muted/40 text-xs text-muted-foreground">
                {livePure.games} games graded through{" "}
                {fmtDate(live.latestKickoff)}. Fewer than 30 games describe the
                season so far, not model skill. Read these as status, not
                evidence.
              </Notice>
            )}

            <div className="grid grid-cols-2 gap-4 border-y border-rule-strong py-4 sm:grid-cols-3 lg:grid-cols-6">
              <KpiCard
                label="Games graded"
                value={String(livePure.games ?? 0)}
                sub={`${livePure.games_with_market ?? 0} with a closing line`}
                tooltip="Finished games with a pregame forecast. The smaller count shows those with a closing spread."
              />
              <KpiCard
                label="Model MAE"
                value={formatNumber(livePublished?.margin_mae, 2)}
                sub="points"
                tooltip="Average error of the published, market-informed home margin, in points. Lower is better."
              />
              <KpiCard
                label="Market MAE"
                value={formatNumber(liveClosing?.margin_mae, 2)}
                sub="points"
                tooltip="Average closing-spread error in points, for games with a closing line. Lower is better."
              />
              <KpiCard
                label="Gap to market"
                value={formatSigned(livePublished?.model_minus_market_mae, 2)}
                sub={headlineGap ? `${formatSigned(headlineGap[0], 2)} to ${formatSigned(headlineGap[1], 2)}, ${headlineVerdict?.verdict === "clear of zero" ? "market ahead, clear of zero" : headlineVerdict?.verdict === "behind, clear of zero" ? "model ahead, clear of zero" : "within noise"}` : "points, no interval published yet"}
                tooltip="Model error minus closing-spread error on the same games. Positive means the market was more accurate. The range is a 95 percent paired bootstrap interval over games."
              />
              <KpiCard
                label="Model closer"
                value={formatPct(livePublished?.closer_than_market_share)}
                tooltip="Share of games where the published margin was closer to the actual margin than the closing spread. A tie counts as not closer."
              />
              <KpiCard
                label="80% coverage"
                value={formatPct(livePublished?.coverage_80, 0)}
                sub="target 80%"
                tooltip="Share of results inside the published 80% range. Target: 80%. Much higher suggests overly wide ranges; much lower suggests overly narrow ranges."
              />
            </div>

            <p className="max-w-4xl text-xs text-muted-foreground">
              {live.closingSources && Object.values(live.closingSources).some((games) => games > 0) ? (
                <>
                  Closing-line feeds across the{" "}
                  {Object.values(live.closingSources).reduce((sum, games) => sum + games, 0)} graded
                  forecast and result pairs: {describeClosingSources(live.closingSources)}. A close captured
                  before kickoff is one quote held in memory by the live worker
                  and frozen when the game starts; a value recorded after the game
                  is the provider&apos;s final number with no timestamp. Where both
                  exist the captured close is used.
                </>
              ) : (
                "Which closing-line feed stands behind each graded game is published with the next grading run."
              )}
            </p>

            {composition.length > 0 && (
              <p className="max-w-4xl text-xs text-muted-foreground">
                The headline pools every graded game. By opponent classification:{" "}
                {composition.map((m, i) => (
                  <span key={m.segment}>
                    {i > 0 && "; "}
                    {m.segment} {m.games} games, gap {describeGap(m.model_minus_market_mae ?? 0, gapInterval(m)?.[0] ?? null, gapInterval(m)?.[1] ?? null).text}
                  </span>
                ))}
                . An FCS closing line is usually a single sportsbook&apos;s number.
                {composition.some((m) => gapInterval(m)) ? " Ranges are 95 percent paired bootstrap intervals." : " No interval is published for these gaps yet."}
              </p>
            )}

            <div className="space-y-2">
              <h3 className="type-subsection">By prediction source</h3>
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
                      <TableHead className="text-right">Brier / log loss</TableHead>
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
                        <TableCell className={mutedNumCell}>
                          {m.brier_score == null
                            ? "–"
                            : `${formatNumber(m.brier_score, 3)} / ${formatNumber(m.log_loss, 3)}`}
                        </TableCell>
                        <TableCell className={numCell}>
                          {m.model_minus_market_mae == null
                            ? "–"
                            : describeGap(m.model_minus_market_mae, gapInterval(m)?.[0] ?? null, gapInterval(m)?.[1] ?? null).text}
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
                Published is the market-informed line, total and scores the
                site shows: the pure margin mixed with the pregame market spread
                the model saw when it published. Pure model is the independent
                projection behind it. Closing line is the benchmark graded on
                its own. Coverage is the share of results inside each
                source&apos;s 50, 80, and 90 percent intervals: the pure
                model&apos;s frozen ones, and for the published line the
                dispersion predictions are priced with. The published total is graded
                only for games published since it existed, so its Total MAE rests on
                fewer games than the other two rows.
                {livePublished?.probability_games ? (
                  <>
                    {" "}
                    Home win probability from the published pregame line scores
                    Brier {formatNumber(livePublished.brier_score, 3)} and log
                    loss {formatNumber(livePublished.log_loss, 3)} over{" "}
                    {livePublished.probability_games} games
                    {liveClosing?.brier_score != null
                      ? <>; the closing line, priced on the same scale over the same games, scores {formatNumber(liveClosing.brier_score, 3)} and {formatNumber(liveClosing.log_loss, 3)}.</>
                      : "; the closing line's Brier on the same games is not published yet."}
                  </>
                ) : null}
                {" "}Gap ranges, where shown, are 95 percent paired bootstrap intervals over games.
              </p>
            </div>

            <SegmentTable title="By model version" rows={versionRows} />

            {copy.segments.map((segment) => (
              <SegmentTable
                key={segment.kind}
                title={segment.title}
                rows={segmentRows(segment.kind)}
              />
            ))}
            <details className="space-y-4 rounded-sm border border-border p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Data and model diagnostics
              </summary>
              <p className="text-xs text-muted-foreground">
                {copy.diagnostics.note}
              </p>
              {copy.diagnostics.segments.map((segment) => (
                <SegmentTable
                  key={segment.kind}
                  title={segment.title}
                  rows={segmentRows(segment.kind)}
                />
              ))}
            </details>
            <p className="text-xs text-muted-foreground">
              Segments grade the published line. Market columns use only the games in
              that segment with a closing spread. A segment marked thin has
              fewer than 30 games. The graded games behind this tab are on the{" "}
              <a href="/data" className="underline underline-offset-4">data page</a> as CSV.
            </p>
          </>
        )}
      </section>

      {backtest}
    </div>
  );
}
