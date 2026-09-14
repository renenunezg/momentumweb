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
    <nav aria-label="Forecast source" className="flex gap-1 font-mono text-xs uppercase tracking-wider">
      {(["live", "backtest"] as const).map((key) => (
        <Link
          key={key}
          href={`/nhl/${page}?view=accuracy&source=${key}`}
          aria-current={source === key ? "page" : undefined}
          className={cn(
            "border-b-2 px-3 py-2",
            source === key
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {key === "live" ? "Live season" : "Backtest"}
        </Link>
      ))}
    </nav>
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
    <div className="space-y-6">
      <SourceToggle source={source} page={page} />
      <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">
        {source === "live"
          ? "Published forecasts archived before puck drop and graded against official final scores. Each game uses its last pregame revision."
          : "Walk-forward replay of the 2022-23 through 2025-26 regular seasons with the same windows and goal map, kept separate from live forecasts."}{" "}
        Log loss and Brier score judge the home win probability (a coin flip
        scores 0.693 and 0.250); total MAE and bias judge the model total in
        goals. No free closing-line archive exists for the NHL, so these are
        model-only benchmarks.
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
              tooltip="Mean negative log likelihood of the home win probability. Lower is better."
            />
            <KpiCard
              label="Brier"
              value={formatNumber(overall.brier, 4)}
              sub="coin flip 0.250"
              tooltip="Mean squared error of the home win probability against the result."
            />
            <KpiCard
              label="Accuracy"
              value={formatPct(overall.accuracy)}
              tooltip="Share of games where the side the model favored won."
            />
            <KpiCard
              label="Total MAE"
              value={formatNumber(overall.total_mae, 2)}
              sub="goals"
              tooltip="Mean absolute error of the model total against the goals scored, including overtime and the shootout goal."
            />
            <KpiCard
              label="Total bias"
              value={formatSigned(overall.total_bias, 2)}
              sub="goals"
              tooltip="Model total minus actual total, averaged. Negative means the model runs low."
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
          {accuracy.calibration.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-heading text-lg">Calibration</h2>
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
