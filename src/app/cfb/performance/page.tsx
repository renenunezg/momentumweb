import { fetchFullBacktest, fetchLivePerformance } from "@/lib/cfb";
import type {
  CfbBacktestPrediction,
  CfbPerformanceMetric,
  CfbPredictionSource,
} from "@/lib/types";
import { KpiCard } from "@/components/kpi-card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export const revalidate = 300;

interface SliceMetrics {
  label: string;
  games: number;
  modelMae: number;
  marketMae: number;
  modelBeatsMarket: number;
  bias: number;
}

// The market's implied home margin is the negated closing spread; both model
// and market are scored against the same actual margin.
function computeMetrics(
  label: string,
  rows: CfbBacktestPrediction[]
): SliceMetrics | null {
  const graded = rows.filter(
    (r) =>
      r.model_margin != null &&
      r.closing_spread != null &&
      r.actual_margin != null
  );
  if (graded.length === 0) return null;
  let modelAbs = 0;
  let marketAbs = 0;
  let modelWins = 0;
  let biasSum = 0;
  for (const r of graded) {
    const modelErr = r.model_margin! - r.actual_margin!;
    const marketErr = -r.closing_spread! - r.actual_margin!;
    modelAbs += Math.abs(modelErr);
    marketAbs += Math.abs(marketErr);
    if (Math.abs(modelErr) < Math.abs(marketErr)) modelWins += 1;
    biasSum += modelErr;
  }
  return {
    label,
    games: graded.length,
    modelMae: modelAbs / graded.length,
    marketMae: marketAbs / graded.length,
    modelBeatsMarket: modelWins / graded.length,
    bias: biasSum / graded.length,
  };
}

function fmt(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "–";
  return value.toFixed(decimals);
}

function fmtSigned(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "–";
  const s = value.toFixed(decimals);
  return value >= 0 ? `+${s}` : s;
}

function fmtPct(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "–";
  return `${(value * 100).toFixed(decimals)}%`;
}

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
  model_favorite_size: "By model favorite size",
  missing_inputs: "By missing preseason inputs",
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
                    <>
                      {" "}
                      <span className="ml-1 text-xs text-muted-foreground">
                        thin
                      </span>
                    </>
                  )}
                </TableCell>
                <TableCell className={numCell}>{m.games ?? "–"}</TableCell>
                <TableCell className={numCell}>{fmt(m.margin_mae)}</TableCell>
                <TableCell className={numCell}>{fmt(m.market_mae)}</TableCell>
                <TableCell className={numCell}>
                  {fmtSigned(m.model_minus_market_mae)}
                </TableCell>
                <TableCell className={numCell}>
                  {fmtPct(m.closer_than_market_share)}
                </TableCell>
                <TableCell className={mutedNumCell}>
                  {fmtSigned(m.margin_bias)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default async function PerformancePage() {
  let backtest: CfbBacktestPrediction[] = [];
  let live = {
    season: null as number | null,
    metrics: [] as CfbPerformanceMetric[],
    gradedGames: 0,
    lastGradedAt: null as string | null,
    latestKickoff: null as string | null,
  };
  try {
    [backtest, live] = await Promise.all([
      fetchFullBacktest(),
      fetchLivePerformance(),
    ]);
  } catch {
    // The page degrades to its empty states when the cfb schema is
    // unreachable; it must never fail the build.
  }

  const overallBySource = new Map(
    live.metrics
      .filter((m) => m.segment_kind === "overall")
      .map((m) => [m.prediction_source, m])
  );
  const livePure = overallBySource.get("pure_model") ?? null;
  const liveClosing = overallBySource.get("closing_market") ?? null;
  const liveSources = (
    ["pure_model", "market_informed", "closing_market"] as CfbPredictionSource[]
  )
    .map((source) => overallBySource.get(source))
    .filter((m): m is CfbPerformanceMetric => m != null);
  const pureSegments = live.metrics.filter(
    (m) => m.prediction_source === "pure_model" && m.segment_kind !== "overall"
  );
  const segmentKinds = Object.keys(SEGMENT_TITLES).filter((kind) =>
    pureSegments.some((m) => m.segment_kind === kind)
  );

  const overall = computeMetrics("All seasons", backtest);
  const seasons = [...new Set(backtest.map((r) => r.season))].sort();
  const bySeason = seasons
    .map((season) =>
      computeMetrics(
        String(season),
        backtest.filter((r) => r.season === season)
      )
    )
    .filter((m): m is SliceMetrics => m != null);

  return (
    <main className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8 space-y-10">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-heading text-2xl tracking-tight">
          Model Performance
        </h1>
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
            closing line is the bar the model is measured against, not an
            input to it.
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
                {fmtDate(live.latestKickoff)}. Fewer than 30 games describe
                the season so far, not model skill. Read these as status,
                not evidence.
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
                value={fmt(livePure.margin_mae)}
                sub="points"
                tooltip="Mean absolute error of the pure model's projected home margin against the actual margin."
              />
              <KpiCard
                label="Market MAE"
                value={fmt(liveClosing?.margin_mae)}
                sub="points"
                tooltip="Mean absolute error of the closing spread against the actual margin, on the games that have one."
              />
              <KpiCard
                label="Gap to market"
                value={fmtSigned(livePure.model_minus_market_mae)}
                sub="points (lower is better)"
                tooltip="Model MAE minus market MAE on the games that have a closing spread. Positive means the closing line is more accurate than the model."
              />
              <KpiCard
                label="Model closer"
                value={fmtPct(livePure.closer_than_market_share)}
                tooltip="Share of games with a closing spread where the model's margin was strictly closer to the result."
              />
              <KpiCard
                label="80% coverage"
                value={fmtPct(livePure.coverage_80, 0)}
                sub="target 80%"
                tooltip="Share of actual margins that landed inside the model's frozen 80% interval. Well above 80% means the model's uncertainty is too wide; well below means too narrow."
              />
            </div>

            <div className="space-y-2">
              <h3 className="font-heading text-base">By prediction source</h3>
              <div className="overflow-x-auto">
                <Table>
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
                          {fmt(m.margin_mae)}
                        </TableCell>
                        <TableCell className={numCell}>
                          {fmt(m.margin_rmse)}
                        </TableCell>
                        <TableCell className={mutedNumCell}>
                          {fmtSigned(m.margin_bias)}
                        </TableCell>
                        <TableCell className={numCell}>
                          {m.total_games ? fmt(m.total_mae) : "–"}
                        </TableCell>
                        <TableCell className={mutedNumCell}>
                          {m.coverage_80 == null
                            ? "–"
                            : `${fmtPct(m.coverage_50, 0)} / ${fmtPct(m.coverage_80, 0)} / ${fmtPct(m.coverage_90, 0)}`}
                        </TableCell>
                        <TableCell className={numCell}>
                          {fmtSigned(m.model_minus_market_mae)}
                        </TableCell>
                        <TableCell className={numCell}>
                          {fmtPct(m.closer_than_market_share)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                Pure model is the independent projection. The market-informed
                blend mixes the pure margin with the pregame market spread the
                model saw when it published, so it is a product line, not
                model skill. Closing line is the benchmark graded on its own.
                Coverage is the share of results inside the pure model&apos;s
                frozen 50, 80, and 90 percent intervals.
                {livePure.probability_games ? (
                  <>
                    {" "}
                    Home win probability, taken from the frozen pregame margin
                    distribution before kickoff, scores Brier{" "}
                    {fmt(livePure.brier_score, 3)} and log loss{" "}
                    {fmt(livePure.log_loss, 3)} over {livePure.probability_games}{" "}
                    games.
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
            <p className="text-xs text-muted-foreground">
              Segments are pure model rows. Market columns use only the games
              in that segment with a closing spread. A segment marked thin has
              fewer than 30 games.
            </p>
          </>
        )}
      </section>

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
          Every prediction below was made walking forward through each season
          with only the data available at the time, then frozen. These are
          historical stand-ins for live performance, not live results. The
          market benchmark is the closing spread: the strongest public forecast
          of a game&apos;s margin. Beating it consistently is rare, and the
          model is measured against it, not against a naive baseline.
        </p>

        {!overall ? (
          <p className="text-sm text-muted-foreground">
            No backtest data published yet.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 border-y border-rule-strong py-4 sm:grid-cols-3 lg:grid-cols-5">
              <KpiCard
                label="Games graded"
                value={String(overall.games)}
                tooltip="FBS-vs-FBS games with a model prediction, a closing spread, and a final score."
              />
              <KpiCard
                label="Model MAE"
                value={fmt(overall.modelMae)}
                sub="points"
                tooltip="Mean absolute error of the model's projected home margin against the actual margin."
              />
              <KpiCard
                label="Market MAE"
                value={fmt(overall.marketMae)}
                sub="points"
                tooltip="Mean absolute error of the closing spread against the actual margin."
              />
              <KpiCard
                label="Gap to market"
                value={fmtSigned(overall.modelMae - overall.marketMae)}
                sub="points (lower is better)"
                tooltip="Model MAE minus market MAE. Positive means the closing line is still more accurate than the model."
              />
              <KpiCard
                label="Model closer"
                value={fmtPct(overall.modelBeatsMarket)}
                tooltip="Share of games where the model's margin was strictly closer to the result than the closing spread."
              />
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Season</TableHead>
                    <TableHead className="text-right">Games</TableHead>
                    <TableHead className="text-right">Model MAE</TableHead>
                    <TableHead className="text-right">Market MAE</TableHead>
                    <TableHead className="text-right">Gap</TableHead>
                    <TableHead className="text-right">Model closer</TableHead>
                    <TableHead className="text-right">Bias</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bySeason.map((m) => (
                    <TableRow key={m.label}>
                      <TableCell className="font-medium">{m.label}</TableCell>
                      <TableCell className={numCell}>{m.games}</TableCell>
                      <TableCell className={numCell}>
                        {fmt(m.modelMae)}
                      </TableCell>
                      <TableCell className={numCell}>
                        {fmt(m.marketMae)}
                      </TableCell>
                      <TableCell className={numCell}>
                        {fmtSigned(m.modelMae - m.marketMae)}
                      </TableCell>
                      <TableCell className={numCell}>
                        {fmtPct(m.modelBeatsMarket)}
                      </TableCell>
                      <TableCell className={mutedNumCell}>
                        {fmtSigned(m.bias)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold">
                      {overall.label}
                    </TableCell>
                    <TableCell className={`${numCell} font-semibold`}>
                      {overall.games}
                    </TableCell>
                    <TableCell className={`${numCell} font-semibold`}>
                      {fmt(overall.modelMae)}
                    </TableCell>
                    <TableCell className={`${numCell} font-semibold`}>
                      {fmt(overall.marketMae)}
                    </TableCell>
                    <TableCell className={`${numCell} font-semibold`}>
                      {fmtSigned(overall.modelMae - overall.marketMae)}
                    </TableCell>
                    <TableCell className={`${numCell} font-semibold`}>
                      {fmtPct(overall.modelBeatsMarket)}
                    </TableCell>
                    <TableCell className={`${mutedNumCell} font-semibold`}>
                      {fmtSigned(overall.bias)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Bias is the mean signed error of the model&apos;s home margin:
          positive means the model leans toward home teams. In-game projections
          anchor on the market closing line precisely because the closing line
          remains the better pregame forecast.
        </p>
      </section>
    </main>
  );
}
