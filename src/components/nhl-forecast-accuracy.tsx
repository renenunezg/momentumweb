import { NavigationLink as Link } from "@/components/navigation-link";
import { CalibrationChart } from "@/components/calibration-chart";
import { KpiCard } from "@/components/kpi-card";
import { Notice } from "@/components/notice";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchForecastAccuracy, type NhlAccuracy, type NhlAccuracySlice } from "@/lib/nhl";
import { cn, formatNumber, formatPct, formatSigned } from "@/lib/utils";

const num = "text-right font-mono tabular-nums";

function SourceToggle({ source, page }: { source: "live" | "backtest"; page: string }) {
  return (
    <nav aria-label="Forecast source" className="type-eyebrow flex gap-1">
      {(["live", "backtest"] as const).map((key) => (
        <Link
          key={key}
          href={`/nhl/${page}?view=accuracy&source=${key}`}
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
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        {heading}
        <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">
          {source === "live"
            ? "The close is the last partner-book quote from the 15 minutes before puck drop."
            : "Closing moneylines and totals come from ESPN's public odds data."}{" "}
          The moneyline is converted to a home win probability with the vig
          removed. Model and market are scored on the same games: only those
          with a close, so these figures differ from the full-sample ones
          above. Lower is better.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 border-y border-rule-strong py-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Model log loss"
          value={formatNumber(overall.model_log_loss_on_market_games, 4)}
          sub={`${overall.market_n} games`}
        />
        <KpiCard
          label="Market log loss"
          value={formatNumber(overall.market_log_loss, 4)}
          sub="closing moneyline"
        />
        <KpiCard
          label="Gap to market"
          value={formatSigned(
            overall.model_log_loss_on_market_games != null && overall.market_log_loss != null
              ? overall.model_log_loss_on_market_games - overall.market_log_loss
              : null,
            4,
          )}
          sub="lower is better"
          tooltip="Model log loss minus closing-market log loss. Positive means the market predicted winners better."
        />
        <KpiCard
          label="Model total MAE"
          value={formatNumber(overall.model_total_mae_on_market_games, 2)}
          sub={`${overall.market_total_n} games`}
        />
        <KpiCard
          label="Market total MAE"
          value={formatNumber(overall.market_total_mae, 2)}
          sub="closing total"
        />
        <KpiCard
          label="Gap to market"
          value={formatSigned(
            overall.model_total_mae_on_market_games != null && overall.market_total_mae != null
              ? overall.model_total_mae_on_market_games - overall.market_total_mae
              : null,
            2,
          )}
          sub="goals"
          tooltip="Model total error minus closing-total error. Positive means the market was closer to the goals scored."
        />
      </div>
      {blended && (
        <p className="text-sm text-muted-foreground">
          Pure-model log loss:{" "}
          <span className="font-mono text-foreground">
            {formatNumber(overall.pure_model_log_loss_on_market_games, 4)}
          </span>{" "}
          on the same {overall.market_n} games. The published forecast blends
          in the morning market price, so its error and the close&apos;s are
          correlated.
        </p>
      )}
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
                <TableCell className="font-mono">
                  {m.season}-{String((m.season ?? 0) + 1).slice(2)}
                </TableCell>
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

export async function NhlForecastAccuracy({
  source,
  page,
}: {
  source: "live" | "backtest";
  page: "performance" | "history";
}) {
  let accuracy: NhlAccuracy | null = null;
  try {
    accuracy = await fetchForecastAccuracy(source);
  } catch {
    accuracy = null;
  }
  const overall = accuracy?.overall ?? null;
  return (
    <div className="space-y-section">
      <SourceToggle source={source} page={page} />
      <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">
        {source === "live"
          ? "Published forecasts archived before puck drop and graded against official final scores. Each game uses its last pregame revision."
          : "Walk-forward replay of the 2022-23 through 2025-26 regular seasons with the same windows and goal map, kept separate from live forecasts."}{" "}
        Log loss and Brier score judge the home win probability (a coin flip
        scores 0.693 and 0.250); total MAE and bias judge the model total in
        goals. The comparison with the closing line follows.
      </p>
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
          <div className="grid grid-cols-2 gap-4 border-y border-rule-strong py-4 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard label="Games" value={String(overall.n)} />
            <KpiCard
              label="Log loss"
              value={formatNumber(overall.log_loss, 4)}
              sub="coin flip 0.693"
              tooltip="Win-probability error that penalizes confident mistakes heavily. Lower is better."
            />
            <KpiCard
              label="Brier"
              value={formatNumber(overall.brier, 4)}
              sub="coin flip 0.250"
              tooltip="Average squared error of home-win probabilities. Lower is better; a coin flip scores 0.25."
            />
            <KpiCard
              label="Accuracy"
              value={formatPct(overall.accuracy)}
              tooltip="Share of games won by the model’s favorite."
            />
            <KpiCard
              label="Total MAE"
              value={formatNumber(overall.total_mae, 2)}
              sub="goals"
              tooltip="Average total-goal error, including overtime and the shootout goal. Lower is better."
            />
            <KpiCard
              label="Total bias"
              value={formatSigned(overall.total_bias, 2)}
              sub="goals"
              tooltip="Average predicted minus actual goals. Negative means the model predicts too few."
            />
          </div>
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
                    <TableCell className="font-mono">
                      {m.season}-{String((m.season ?? 0) + 1).slice(2)}
                    </TableCell>
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
        </>
      )}
    </div>
  );
}
