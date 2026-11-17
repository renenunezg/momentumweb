import { NavigationLink as Link } from "@/components/navigation-link";
import { CalibrationChart } from "@/components/calibration-chart";
import { ResidualsChart } from "@/components/residuals-chart";
import { TrendPanels, type TrendPanel } from "@/components/trend-panels";
import { KpiCard } from "@/components/kpi-card";
import { HowGraded } from "@/components/how-graded";
import { Notice } from "@/components/notice";
import { PagedTable } from "@/components/paged-table";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchForecastAccuracy,
  type NhlAccuracy,
  type NhlAccuracyPeriod,
  type NhlAccuracySlice,
  type NhlFavoriteBin,
} from "@/lib/nhl";
import { cn, formatDate, formatNumber, formatPct, formatSigned } from "@/lib/utils";

const num = "text-right font-mono tabular-nums";
const COIN_FLIP_LOG_LOSS = Math.LN2;
const FAVORITE_BINS = ["50–55%", "55–60%", "60–65%", "65–70%", "70–75%", "75% and up"];

function difference(a: number | null | undefined, b: number | null | undefined) {
  return a != null && b != null ? a - b : null;
}

// A gap to the close with one standard error beside it, so its size can be
// read against its uncertainty.
function gapText(gap: number | null, se: number | null | undefined, decimals: number) {
  if (gap == null) return formatSigned(gap, decimals);
  return se == null ? formatSigned(gap, decimals) : `${formatSigned(gap, decimals)} ± ${formatNumber(se, decimals)}`;
}

const TREND_PANELS: TrendPanel[] = [
  {
    key: "accuracy",
    title: "Picked the winner",
    series: [
      { name: "Model", sum: "correct", count: "n" },
      { name: "Market", sum: "market_correct", count: "market_n", comparison: true },
    ],
    format: "percent",
    decimals: 1,
    baseline: 0.5,
  },
  {
    key: "log_loss",
    title: "Winner log loss",
    series: [
      { name: "Model", sum: "log_loss_sum", count: "n" },
      { name: "Market", sum: "market_log_loss_sum", count: "market_n", comparison: true },
    ],
    format: "number",
    decimals: 3,
    baseline: COIN_FLIP_LOG_LOSS,
  },
  {
    key: "total_mae",
    title: "Total MAE (goals)",
    series: [
      { name: "Model", sum: "total_abs_error_sum", count: "n" },
      { name: "Market", sum: "market_total_abs_error_sum", count: "market_total_n", comparison: true },
    ],
    format: "number",
    decimals: 2,
  },
  {
    key: "total_bias",
    title: "Total bias (goals)",
    series: [
      { name: "Model", sum: "total_error_sum", count: "n" },
      { name: "Market", sum: "market_total_error_sum", count: "market_total_n", comparison: true },
    ],
    format: "number",
    decimals: 2,
    baseline: 0,
  },
];

function seasonLabel(season: number | undefined) {
  return `${season}-${String((season ?? 0) + 1).slice(2)}`;
}

function SourceToggle({ source }: { source: "live" | "backtest" }) {
  return (
    <nav aria-label="Forecast source" className="type-eyebrow flex gap-1">
      {(["live", "backtest"] as const).map((key) => (
        <Link
          key={key}
          href={`/nhl/performance?source=${key}`}
          aria-current={source === key ? "page" : undefined}
          className={cn(
            "border-b-2 px-3 py-2",
            source === key
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {key === "live" ? "Live season" : "Backtest"}
        </Link>
      ))}
    </nav>
  );
}

function MarketCells({ m }: { m: NhlAccuracySlice }) {
  const gap =
    m.model_log_loss_on_market_games != null && m.market_log_loss != null
      ? m.model_log_loss_on_market_games - m.market_log_loss
      : null;
  return (
    <>
      <TableCell className={num}>{m.market_n}</TableCell>
      <TableCell className={num}>{formatNumber(m.model_log_loss_on_market_games, 4)}</TableCell>
      <TableCell className={num}>{formatNumber(m.market_log_loss, 4)}</TableCell>
      <TableCell className={num}>{formatSigned(gap, 4)}</TableCell>
      <TableCell className={num}>{m.market_total_n}</TableCell>
      <TableCell className={num}>{formatNumber(m.model_total_mae_on_market_games, 2)}</TableCell>
      <TableCell className={num}>{formatNumber(m.market_total_mae, 2)}</TableCell>
    </>
  );
}

function OverUnder({ accuracy, overall }: { accuracy: NhlAccuracy; overall: NhlAccuracySlice }) {
  if (!overall.over_under_n) return null;
  // With closing prices the model is rescored on the priced games, so the two
  // figures share a population; without them it stands against a coin flip.
  const priced = (overall.market_over_under_n ?? 0) > 0;
  const model = priced ? overall.model_over_under_log_loss_on_market_games : overall.over_under_log_loss;
  const market = priced ? overall.market_over_under_log_loss : null;
  const games = priced ? overall.market_over_under_n : overall.over_under_n;
  return (
    <div className="space-y-4">
      <h3 className="type-label font-semibold">Over or under the closing total</h3>
      <div className="grid grid-cols-2 gap-4 border-y border-rule-strong py-4 sm:grid-cols-4">
        <KpiCard
          label="Model log loss"
          value={formatNumber(model, 4)}
          sub={`${games} games · coin flip 0.693`}
          tooltip="The model's probability that the game goes over the closing total, scored against what happened. A push is left out. Lower is better."
        />
        <KpiCard
          label="Market log loss"
          value={formatNumber(market, 4)}
          sub={priced ? "closing over and under prices" : "no closing prices recorded"}
          tooltip="The closing over price with the vig removed, scored on the same games."
        />
        <KpiCard
          label="Gap to market"
          value={formatSigned(model != null && market != null ? model - market : null, 4)}
          sub="lower is better"
          tooltip="Model log loss minus market log loss. Positive means the closing price called over and under better."
        />
        <KpiCard
          label="Went over"
          value={formatPct(overall.over_rate)}
          sub={`${overall.over_under_n} games`}
          tooltip="Share of games that finished over the closing total, pushes left out."
        />
      </div>
      {accuracy.by_season.length > 1 && (
        <Table>
          <TableCaption className="sr-only">Over and under the closing total by season</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Season</TableHead>
              <TableHead className="text-right">Games</TableHead>
              <TableHead className="text-right">Went over</TableHead>
              <TableHead className="text-right">Model log loss</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...accuracy.by_season, overall].map((m) => (
              <TableRow key={m.season ?? "all"} className={m.season == null ? "font-semibold" : undefined}>
                <TableCell className={m.season == null ? undefined : "font-mono"}>
                  {m.season == null ? "All" : seasonLabel(m.season)}
                </TableCell>
                <TableCell className={num}>{m.over_under_n ?? 0}</TableCell>
                <TableCell className={num}>{formatPct(m.over_rate)}</TableCell>
                <TableCell className={num}>{formatNumber(m.over_under_log_loss, 4)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function MarketComparison({
  accuracy,
  overall,
  source,
}: {
  accuracy: NhlAccuracy;
  overall: NhlAccuracySlice;
  source: "live" | "backtest";
}) {
  const heading = <h2 className="type-section">Against the closing line</h2>;
  if (overall.market_n === 0)
    return (
      <section className="space-y-2">
        {heading}
        <Notice>
          No closing line has been recorded for these games yet. A close is
          the last partner-book quote from the 15 minutes before puck drop.
        </Notice>
      </section>
    );
  const blended =
    overall.pure_model_log_loss_on_market_games !==
    overall.model_log_loss_on_market_games;
  const accuracyGap = difference(overall.model_accuracy_on_market_games, overall.market_accuracy);
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        {heading}
        <HowGraded
          lead={<>Model and market scored on the same games, those with a recorded close, so these figures differ from the ones above. Lower is better.</>}
        >
          <p>
            {source === "live"
              ? "The close is the last partner-book quote from the 15 minutes before puck drop."
              : "Closing moneylines and totals come from ESPN's public odds data."}{" "}
            The moneyline is converted to a home win probability with the vig
            removed. The over and under figures score the probability of
            going over the closing total, the model&apos;s from its total and
            the market&apos;s from the closing prices.
            {blended && (
              <>
                {" "}On the same {overall.market_n} games the pure model scores a
                log loss of {formatNumber(overall.pure_model_log_loss_on_market_games, 4)}.
                The published forecast blends in the morning market price, so its
                error and the close&apos;s are correlated.
              </>
            )}
          </p>
          <p>
            A lower error than the market does not by itself make the
            predictions profitable. A bet has to beat the price including the
            vig, on the games where model and market disagree. The
            Predictions tab has the return and how the recorded prices
            compare with the close.
          </p>
        </HowGraded>
      </div>
      <Table>
        <TableCaption className="sr-only">Forecast and closing line on the same games</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>On the same {overall.market_n} games</TableHead>
            <TableHead className="text-right">Log loss</TableHead>
            <TableHead className="text-right">Brier</TableHead>
            <TableHead className="text-right">Winners</TableHead>
            <TableHead className="text-right">Total MAE</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>{source === "live" ? "Published forecast" : "Pure model"}</TableCell>
            <TableCell className={num}>{formatNumber(overall.model_log_loss_on_market_games, 4)}</TableCell>
            <TableCell className={num}>{formatNumber(overall.model_brier_on_market_games, 4)}</TableCell>
            <TableCell className={num}>{formatPct(overall.model_accuracy_on_market_games)}</TableCell>
            <TableCell className={num}>{formatNumber(overall.model_total_mae_on_market_games, 2)}</TableCell>
          </TableRow>
          {blended && (
            <TableRow>
              <TableCell>Pure model, no market price</TableCell>
              <TableCell className={num}>{formatNumber(overall.pure_model_log_loss_on_market_games, 4)}</TableCell>
              <TableCell className={num}>–</TableCell>
              <TableCell className={num}>–</TableCell>
              <TableCell className={num}>{formatNumber(overall.pure_model_total_mae_on_market_games, 2)}</TableCell>
            </TableRow>
          )}
          <TableRow>
            <TableCell>Closing line</TableCell>
            <TableCell className={num}>{formatNumber(overall.market_log_loss, 4)}</TableCell>
            <TableCell className={num}>{formatNumber(overall.market_brier, 4)}</TableCell>
            <TableCell className={num}>{formatPct(overall.market_accuracy)}</TableCell>
            <TableCell className={num}>{formatNumber(overall.market_total_mae, 2)}</TableCell>
          </TableRow>
          <TableRow className="font-semibold">
            <TableCell>{source === "live" ? "Forecast" : "Model"} minus close</TableCell>
            <TableCell className={num}>
              {gapText(difference(overall.model_log_loss_on_market_games, overall.market_log_loss), overall.log_loss_gap_se, 4)}
            </TableCell>
            <TableCell className={num}>
              {gapText(difference(overall.model_brier_on_market_games, overall.market_brier), overall.brier_gap_se, 4)}
            </TableCell>
            <TableCell className={num}>
              {accuracyGap == null ? "–" : `${formatSigned(accuracyGap * 100, 1)} pts`}
            </TableCell>
            <TableCell className={num}>
              {gapText(difference(overall.model_total_mae_on_market_games, overall.market_total_mae), overall.total_mae_gap_se, 2)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {accuracy.by_season.length > 1 && (
        <Table>
          <TableCaption className="sr-only">Model against the closing line by season</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Season</TableHead>
              <TableHead className="text-right">Games</TableHead>
              <TableHead className="text-right">Model log loss</TableHead>
              <TableHead className="text-right">Market log loss</TableHead>
              <TableHead className="text-right">Gap</TableHead>
              <TableHead className="text-right">Total games</TableHead>
              <TableHead className="text-right">Model total MAE</TableHead>
              <TableHead className="text-right">Market total MAE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accuracy.by_season.map((m) => (
              <TableRow key={m.season}>
                <TableCell className="font-mono">{seasonLabel(m.season)}</TableCell>
                <MarketCells m={m} />
              </TableRow>
            ))}
            <TableRow className="font-semibold">
              <TableCell>All</TableCell>
              <MarketCells m={overall} />
            </TableRow>
          </TableBody>
        </Table>
      )}
      <OverUnder accuracy={accuracy} overall={overall} />
    </section>
  );
}

// Whether the forecast or the close has predicted winners better, said only
// as firmly as the paired standard error allows.
function Verdict({ overall, subject }: { overall: NhlAccuracySlice; subject: "forecast" | "model" }) {
  const gap = difference(overall.model_log_loss_on_market_games, overall.market_log_loss);
  const se = overall.log_loss_gap_se;
  if (gap == null || se == null) return null;
  const clear = Math.abs(gap) > 2 * se;
  return (
    <Notice>
      On the {overall.market_n} games with a recorded close, the {subject}&apos;s
      log loss is {formatNumber(Math.abs(gap), 4)} {gap < 0 ? "lower" : "higher"} than
      the closing line&apos;s, with a standard error of {formatNumber(se, 4)}.{" "}
      {clear
        ? gap < 0
          ? `The ${subject} has predicted winners better than the close.`
          : `The closing line has predicted winners better than the ${subject}.`
        : "The gap is smaller than twice its standard error, so neither has been shown to predict winners better."}
    </Notice>
  );
}

function Favorites({ rows }: { rows: NhlFavoriteBin[] }) {
  const market = new Map(rows.filter((r) => r.source === "market").map((r) => [r.bin, r]));
  const model = rows.filter((r) => r.source === "model");
  if (model.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="type-section">Favorites</h2>
      <p className="max-w-4xl text-sm text-muted-foreground">
        How often the favorite won against how often it was expected to, by
        how strong a favorite it was. The forecast covers every graded game
        and the closing line the games with a recorded close. The margin is
        one standard error for that many games, so a gap inside it is what
        luck alone produces.
      </p>
      <Table>
        <TableCaption className="sr-only">Favorite win rate by favorite strength</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Favorite at</TableHead>
            <TableHead className="text-right">Games</TableHead>
            <TableHead className="text-right">Expected</TableHead>
            <TableHead className="text-right">Won</TableHead>
            <TableHead className="text-right">Margin</TableHead>
            <TableHead className="text-right">Close games</TableHead>
            <TableHead className="text-right">Close expected</TableHead>
            <TableHead className="text-right">Close won</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {model.map((row) => {
            const close = market.get(row.bin);
            return (
              <TableRow key={row.bin}>
                <TableCell className="font-mono">{FAVORITE_BINS[row.bin]}</TableCell>
                <TableCell className={num}>{row.n}</TableCell>
                <TableCell className={num}>{formatPct(row.predicted)}</TableCell>
                <TableCell className={num}>{formatPct(row.observed)}</TableCell>
                <TableCell className={num}>
                  ± {formatNumber(Math.sqrt((row.predicted * (1 - row.predicted)) / row.n) * 100, 1)}
                </TableCell>
                <TableCell className={num}>{close?.n ?? 0}</TableCell>
                <TableCell className={num}>{formatPct(close?.predicted)}</TableCell>
                <TableCell className={num}>{formatPct(close?.observed)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}

function PeriodTable({ rows, period }: { rows: NhlAccuracyPeriod[]; period: "day" | "month" }) {
  const title = period === "day" ? "By day" : "By month";
  return (
    <section className="space-y-2">
      <h2 className="type-section">{title}</h2>
      <PagedTable
        caption={`Forecast accuracy ${title.toLowerCase()}`}
        columns={[period === "day" ? "Date" : "Month", "Games", "Winners", "Accuracy", "Log loss", "Total MAE", "Total bias"]}
        paged={period === "day"}
        rows={rows.map((row) => ({
          key: row.date,
          cells: [
            period === "day"
              ? formatDate(row.date)
              : new Date(row.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" }),
            String(row.n),
            `${row.correct}/${row.n}`,
            formatPct(row.correct / row.n),
            formatNumber(row.log_loss_sum / row.n, 3),
            formatNumber(row.total_abs_error_sum / row.n, 2),
            formatSigned(row.total_error_sum / row.n, 2),
          ],
        }))}
      />
    </section>
  );
}

function Cells({ m }: { m: NhlAccuracySlice }) {
  return (
    <>
      <TableCell className={num}>{m.n}</TableCell>
      <TableCell className={num}>{formatNumber(m.log_loss, 4)}</TableCell>
      <TableCell className={num}>{formatNumber(m.brier, 4)}</TableCell>
      <TableCell className={num}>{formatPct(m.accuracy)}</TableCell>
      <TableCell className={num}>{formatPct(m.home_win_rate)}</TableCell>
      <TableCell className={num}>{formatNumber(m.total_mae, 2)}</TableCell>
      <TableCell className={num}>{formatSigned(m.total_bias, 2)}</TableCell>
    </>
  );
}

export async function NhlForecastAccuracy({ source }: { source: "live" | "backtest" }) {
  let accuracy: NhlAccuracy | null = null;
  try {
    accuracy = await fetchForecastAccuracy(source);
  } catch {
    accuracy = null;
  }
  const overall = accuracy?.overall ?? null;
  // A response cached before the function published a series lacks it, or
  // its sums, until the next NHL data write expires the read.
  const period = source === "live" ? "day" : "month";
  const periods = ((period === "day" ? accuracy?.by_day : accuracy?.by_month) ?? []).filter(
    (row) => row.log_loss_sum != null,
  );
  const close = (overall?.market_n ?? 0) > 0;
  // The forecast rescored on the close's games, under the market's own card.
  // A response cached before the function published a figure lacks it.
  const onCloseGames = (value: string | null, games = overall?.market_n) =>
    close && value != null ? `forecast ${value} on the same ${games} games` : undefined;
  const maybe = (value: number | null | undefined, format: (v: number) => string) =>
    value == null ? null : format(value);
  return (
    <div className="space-y-section">
      <SourceToggle source={source} />
      <HowGraded
        lead={<>{source === "live" ? "Each game is graded on the last forecast published before puck drop, against the final score." : "The current pure model replayed through the 2022-23 to 2025-26 regular seasons, kept separate from live forecasts."}</>}
      >
        <p>
          {source === "live"
            ? "Published forecasts are archived before puck drop and graded against official final scores. Each game uses its last pregame revision."
            : "A walk-forward replay of the 2022-23 through 2025-26 regular seasons with the current pure model, using only data available before each game."}{" "}
          Log loss and Brier score judge the home win probability (a coin flip
          scores 0.693 and 0.250). Total MAE, RMSE, and bias judge the model
          total in goals. The comparison with the closing line follows.
        </p>
      </HowGraded>
      {!accuracy ? (
        <Notice role="status">Accuracy data is temporarily unavailable.</Notice>
      ) : !overall ? (
        <Notice>
          {source === "live"
            ? "No graded live games yet. The live record starts with the first regular-season slate."
            : "The backtest has not been published yet."}
          {accuracy.missing_forecast > 0 && (
            <span className="block mt-1 text-xs">
              {accuracy.missing_forecast} completed games have no pregame forecast.
            </span>
          )}
        </Notice>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 border-y border-rule-strong py-4 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard
              label="Games"
              value={String(overall.n)}
              sub={close ? `${overall.market_n} with a close` : "no close recorded yet"}
            />
            <KpiCard
              label="Log loss"
              value={formatNumber(overall.log_loss, 4)}
              sub="coin flip 0.693"
              tooltip="Win-probability error that penalizes confident mistakes heavily. Lower is better."
            />
            <KpiCard
              label="Market log loss"
              value={formatNumber(overall.market_log_loss, 4)}
              sub={onCloseGames(maybe(overall.model_log_loss_on_market_games, (v) => formatNumber(v, 4)))}
              tooltip="The closing moneyline with the vig removed, scored on the games that have a recorded close. The forecast's figure underneath is rescored on those games only."
            />
            <KpiCard
              label="Brier"
              value={formatNumber(overall.brier, 4)}
              sub="coin flip 0.250"
              tooltip="Average squared error of home-win probabilities. Lower is better, and a coin flip scores 0.25."
            />
            <KpiCard
              label="Market Brier"
              value={formatNumber(overall.market_brier, 4)}
              sub={onCloseGames(maybe(overall.model_brier_on_market_games, (v) => formatNumber(v, 4)))}
              tooltip="The closing moneyline's squared error on the games that have a recorded close, with the forecast rescored on those games underneath."
            />
            <KpiCard
              label="Accuracy"
              value={formatPct(overall.accuracy)}
              tooltip="Share of games won by the model's favorite."
            />
            <KpiCard
              label="Market accuracy"
              value={formatPct(overall.market_accuracy)}
              sub={onCloseGames(maybe(overall.model_accuracy_on_market_games, (v) => formatPct(v)))}
              tooltip="Share of games won by the closing line's favorite, on the games that have a recorded close."
            />
            <KpiCard
              label="Total MAE"
              value={formatNumber(overall.total_mae, 2)}
              sub={`goals · RMSE ${formatNumber(overall.total_rmse, 2)}`}
              tooltip="Average total-goal error, including overtime and the shootout goal. RMSE weighs large misses more. Lower is better."
            />
            <KpiCard
              label="Market total MAE"
              value={formatNumber(overall.market_total_mae, 2)}
              sub={onCloseGames(
                maybe(overall.model_total_mae_on_market_games, (v) => formatNumber(v, 2)),
                overall.market_total_n,
              )}
              tooltip="The closing total's average error in goals, on the games that have one."
            />
            <KpiCard
              label="Total bias"
              value={formatSigned(overall.total_bias, 2)}
              sub="goals"
              tooltip="Average predicted minus actual goals. Negative means the model predicts too few."
            />
          </div>
          <Verdict overall={overall} subject={source === "live" ? "forecast" : "model"} />
          {periods.length > 0 && (
            <section className="space-y-2">
              <h2 className="type-section">Over time</h2>
              <TrendPanels data={periods} panels={TREND_PANELS} period={period} />
            </section>
          )}
          {accuracy.by_season.length > 1 && (
            <Table>
              <TableCaption className="sr-only">Accuracy by season</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Season</TableHead>
                  <TableHead className="text-right">Games</TableHead>
                  <TableHead className="text-right">Log loss</TableHead>
                  <TableHead className="text-right">Brier</TableHead>
                  <TableHead className="text-right">Accuracy</TableHead>
                  <TableHead className="text-right">Home wins</TableHead>
                  <TableHead className="text-right">Total MAE</TableHead>
                  <TableHead className="text-right">Total bias</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accuracy.by_season.map((m) => (
                  <TableRow key={m.season}>
                    <TableCell className="font-mono">{seasonLabel(m.season)}</TableCell>
                    <Cells m={m} />
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell>All</TableCell>
                  <Cells m={overall} />
                </TableRow>
              </TableBody>
            </Table>
          )}
          <MarketComparison accuracy={accuracy} overall={overall} source={source} />
          {(accuracy.total_errors?.length ?? 0) > 0 && (
            <section className="space-y-2">
              <h2 className="type-section">Total error distribution</h2>
              <p className="text-sm text-muted-foreground">
                Predicted minus actual goals per game, in one-goal bins. Bars
                left of zero are games that outscored the forecast.
              </p>
              <ResidualsChart
                bins={accuracy.total_errors ?? []}
                mean={overall.total_bias}
                unit="goals"
                subject="graded games"
                difference="Predicted − Actual"
              />
            </section>
          )}
          <Favorites rows={accuracy.favorites ?? []} />
          {accuracy.calibration.length > 0 && (
            <section className="space-y-2">
              <h2 className="type-section">Calibration</h2>
              <p className="text-sm text-muted-foreground">
                Observed home win rate against the predicted probability in ten
                bins. Points above the diagonal mean the model was too
                pessimistic about the home side, below it too confident.
              </p>
              <CalibrationChart
                data={accuracy.calibration
                  .filter((b) => b.n >= 10)
                  .map((b) => ({
                    predicted_mean: b.predicted,
                    observed_rate: b.observed,
                    count: b.n,
                  }))}
              />
            </section>
          )}
          {periods.length > 0 && (
            <PeriodTable
              rows={[...periods].reverse()}
              period={period}
            />
          )}
        </>
      )}
    </div>
  );
}
