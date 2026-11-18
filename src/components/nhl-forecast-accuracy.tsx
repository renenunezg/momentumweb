import type { ReactNode } from "react";
import { NavigationLink as Link } from "@/components/navigation-link";
import { CalibrationChart } from "@/components/calibration-chart";
import { ResidualsChart } from "@/components/residuals-chart";
import { TrendPanels, type TrendPanel } from "@/components/trend-panels";
import { InfoTip } from "@/components/info-tip";
import { Badge } from "@/components/ui/badge";
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
    title: "Goals MAE",
    series: [
      { name: "Model", sum: "total_abs_error_sum", count: "n" },
      { name: "Market", sum: "market_total_abs_error_sum", count: "market_total_n", comparison: true },
    ],
    format: "number",
    decimals: 2,
  },
  {
    key: "total_bias",
    title: "Goals bias",
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

// Model against the closing line season by season. A single season is
// already the cards up top, so this is drawn for the backtest only.
function MarketBySeason({ accuracy, overall }: { accuracy: NhlAccuracy; overall: NhlAccuracySlice }) {
  if (overall.market_n === 0 || accuracy.by_season.length < 2) return null;
  return (
    <section className="space-y-4">
      <h2 className="type-section">Against the closing line by season</h2>
      <Table>
        <TableCaption className="sr-only">Model against the closing line by season</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Season</TableHead>
            <TableHead className="text-right">Games</TableHead>
            <TableHead className="text-right">Model log loss</TableHead>
            <TableHead className="text-right">Market log loss</TableHead>
            <TableHead className="text-right">Gap</TableHead>
            <TableHead className="text-right">Over/under games</TableHead>
            <TableHead className="text-right">Model goals MAE</TableHead>
            <TableHead className="text-right">Market goals MAE</TableHead>
            <TableHead className="text-right">Went over</TableHead>
            <TableHead className="text-right">Over/under log loss</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...accuracy.by_season, overall].map((m) => (
            <TableRow key={m.season ?? "all"} className={m.season == null ? "font-semibold" : undefined}>
              <TableCell className={m.season == null ? undefined : "font-mono"}>
                {m.season == null ? "All" : seasonLabel(m.season)}
              </TableCell>
              <MarketCells m={m} />
              <TableCell className={num}>{formatPct(m.over_rate)}</TableCell>
              <TableCell className={num}>{formatNumber(m.over_under_log_loss, 4)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

// A KPI card holding two figures side by side under one label.
function PairCard({
  label,
  tooltip,
  children,
}: {
  label: string;
  tooltip?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="inline-flex items-center gap-1 type-eyebrow text-muted-foreground">
        {label}
        {tooltip && <InfoTip text={tooltip} />}
      </span>
      {children}
    </div>
  );
}

function Figure({
  value,
  caption,
  series,
}: {
  value: string;
  caption: string;
  series?: "model" | "market";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className={cn("type-section tabular-nums", series === "market" && "text-muted-foreground")}>
        {value}
      </span>
      <span className="inline-flex items-center gap-1.5 type-meta text-muted-foreground">
        {series && (
          <span
            aria-hidden="true"
            className={cn("size-2", series === "model" ? "rounded-full bg-chart-primary" : "bg-chart-comparison")}
          />
        )}
        {caption}
      </span>
    </div>
  );
}

// One metric as the model's figure beside the closing line's on the same
// games, with a verdict underneath. One side is called ahead only when the
// gap between them is more than twice its standard error; anything smaller
// has not been shown to be real and reads as too close to call. The exact
// gap and its standard error sit in the info tip.
function MetricPair({
  label,
  tooltip,
  model,
  market,
  se,
  digits,
  percent = false,
}: {
  label: string;
  tooltip: string;
  model: number | null | undefined;
  market: number | null | undefined;
  se?: number | null;
  digits: number;
  percent?: boolean;
}) {
  const scale = percent ? 100 : 1;
  const show = (value: number | null | undefined) =>
    percent ? formatPct(value) : formatNumber(value, digits);
  const gap = difference(model, market);
  const clear = gap != null && se != null && Math.abs(gap) > 2 * se;
  // A share of winners is better higher; the errors are better lower.
  const modelAhead = gap != null && (percent ? gap > 0 : gap < 0);
  const gapNote =
    gap == null
      ? ""
      : ` Model minus market: ${gapText(gap * scale, se == null ? null : se * scale, digits)}${percent ? " points" : ""}.`;
  return (
    <PairCard label={label} tooltip={tooltip + gapNote}>
      <div className="grid grid-cols-2 gap-3">
        <Figure value={show(model)} caption="Model" series="model" />
        <Figure value={show(market)} caption="Market" series="market" />
      </div>
      {gap != null && se != null && (
        <Badge
          variant="outline"
          className={cn(
            !clear && "text-muted-foreground",
            clear && (modelAhead ? "border-transparent bg-better/15 text-positive" : "border-transparent bg-worse/15 text-negative"),
          )}
        >
          {!clear ? "Too close to call" : modelAhead ? "Model ahead" : "Market ahead"}
        </Badge>
      )}
    </PairCard>
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
        columns={[period === "day" ? "Date" : "Month", "Games", "Winners", "Accuracy", "Log loss", "Goals MAE", "Goals bias"]}
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
  // Closing over and under prices exist for live games only.
  const priced = (overall?.market_over_under_n ?? 0) > 0;
  const blended =
    overall != null &&
    overall.pure_model_log_loss_on_market_games !== overall.model_log_loss_on_market_games;
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
          scores 0.693 and 0.250). Goals MAE and bias judge the goals the
          model predicts for a game. Each figure up top sits beside the
          closing line&apos;s on the same games. One is called ahead only when
          the gap between them is more than twice its standard error.
          Anything smaller is too close to call.
        </p>
        <p>
          {source === "live"
            ? "The close is the last partner-book quote from the 15 minutes before puck drop."
            : "Closing moneylines and over/under lines come from ESPN's public odds data."}{" "}
          The moneyline is converted to a home win probability with the vig
          removed. The over/under figures score the probability of going
          over the closing over/under line, the model&apos;s from its
          predicted goals and the market&apos;s from the closing prices.
          {blended && overall && (
            <>
              {" "}On the same {overall.market_n} games the pure model, without
              the market price, scores a winner log loss of{" "}
              {formatNumber(overall.pure_model_log_loss_on_market_games, 4)} and a
              goals MAE of {formatNumber(overall.pure_model_total_mae_on_market_games, 2)}.
              The published forecast blends in the morning market price, so its
              error and the close&apos;s are correlated.
            </>
          )}
        </p>
        <p>
          A lower error than the market does not by itself make the
          predictions profitable. A bet has to beat the price including the
          vig, on the games where model and market disagree. The Predictions
          tab has the return and how the recorded prices compare with the
          close.
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
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-y border-rule-strong py-5 lg:grid-cols-3">
            <PairCard
              label="Games"
              tooltip="Each card compares the model and the closing line on the games that have a recorded close."
            >
              <div className="grid grid-cols-2 gap-3">
                <Figure value={String(overall.n)} caption="Graded" />
                <Figure value={String(overall.market_n)} caption="With a close" />
              </div>
            </PairCard>
            <MetricPair
              label="Winner log loss"
              tooltip="Win-probability error that penalizes confident mistakes heavily. Lower is better, and a coin flip scores 0.693."
              model={close ? overall.model_log_loss_on_market_games : overall.log_loss}
              market={overall.market_log_loss}
              se={overall.log_loss_gap_se}
              digits={4}
            />
            <MetricPair
              label="Brier"
              tooltip="Average squared error of home-win probabilities. Lower is better, and a coin flip scores 0.250."
              model={close ? overall.model_brier_on_market_games : overall.brier}
              market={overall.market_brier}
              se={overall.brier_gap_se}
              digits={4}
            />
            <MetricPair
              label="Accuracy"
              tooltip="Share of games won by the favorite."
              model={close ? overall.model_accuracy_on_market_games : overall.accuracy}
              market={overall.market_accuracy}
              se={overall.accuracy_gap_se}
              digits={1}
              percent
            />
            <MetricPair
              label="Goals MAE"
              tooltip={`Average miss on the goals scored in a game, overtime and the shootout goal included. Lower is better. On all ${overall.n} graded games the model's is ${formatNumber(overall.total_mae, 2)}, with an RMSE of ${formatNumber(overall.total_rmse, 2)} and a bias of ${formatSigned(overall.total_bias, 2)} (negative means it predicts too few).`}
              model={close ? overall.model_total_mae_on_market_games : overall.total_mae}
              market={overall.market_total_mae}
              se={overall.total_mae_gap_se}
              digits={2}
            />
            <MetricPair
              label="Over/under log loss"
              tooltip={`Error of the probability that a game goes over the closing over/under line, pushes left out. Lower is better, and a coin flip scores 0.693. ${formatPct(overall.over_rate)} of ${overall.over_under_n ?? 0} games went over.${priced ? "" : " The backtest has no closing prices, so the market has no figure."}`}
              model={priced ? overall.model_over_under_log_loss_on_market_games : overall.over_under_log_loss}
              market={overall.market_over_under_log_loss}
              se={overall.over_under_gap_se}
              digits={4}
            />
          </div>
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
                  <TableHead className="text-right">Goals MAE</TableHead>
                  <TableHead className="text-right">Goals bias</TableHead>
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
          <MarketBySeason accuracy={accuracy} overall={overall} />
          {(accuracy.total_errors?.length ?? 0) > 0 && (
            <section className="space-y-2">
              <h2 className="type-section">Goals error distribution</h2>
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
