"use client";

import { useMemo, useState } from "react";
import { formatPct } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { chartAxisProps, chartTooltipStyle, useChartTheme } from "@/lib/chart-theme";
import { ToggleGroup } from "@/components/toggle-group";

// A row per day with count columns. Series name their columns rather than
// pass accessors, so a server component can render the chart.
type DailyRow = { date: string } & Record<string, unknown>;

export interface AccuracySeries<Row extends DailyRow> {
  key: string;
  name: string;
  correct: keyof Row & string;
  predictions: keyof Row & string;
}

const WINDOWS = [
  { key: "7", label: "7 days" },
  { key: "14", label: "14 days" },
  { key: "30", label: "30 days" },
] as const;
type WindowKey = (typeof WINDOWS)[number]["key"];

type Point = Record<string, string | number | null>;

const MIN_WINDOW_PREDICTIONS = 20;

function formatDateLabel(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function count<Row extends DailyRow>(row: Row, field: keyof Row): number {
  const value = row[field];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Trailing-window accuracy, pooled rather than averaged.
 *
 * A mean of daily rates would weight a two-game day the same as a fifteen-game
 * day, so each point is sum(correct) / sum(predictions) across the window.
 * Points before the window is fully populated, or with fewer than
 * MIN_WINDOW_PREDICTIONS behind them, are left null rather than shown: late in
 * the season a market can go days with a handful of predictions, and a 0-for-2
 * window would draw as a collapse to 0%.
 */
function rollingAccuracy<Row extends DailyRow>(
  data: Row[],
  series: AccuracySeries<Row>[],
  windowDays: number,
): Point[] {
  return data.map((row, i) => {
    const point: Point = { date: row.date };
    if (i < windowDays - 1) {
      for (const one of series) point[one.key] = null;
      return point;
    }
    const slice = data.slice(i - windowDays + 1, i + 1);
    for (const one of series) {
      let correct = 0;
      let predictions = 0;
      for (const day of slice) {
        correct += count(day, one.correct);
        predictions += count(day, one.predictions);
      }
      point[one.key] = predictions >= MIN_WINDOW_PREDICTIONS ? correct / predictions : null;
    }
    return point;
  });
}

/**
 * One axis for every panel, so a market that looks higher is higher. Pooled
 * accuracy sits in a narrow band, so the axis fits the data (always including
 * the 50% coin flip) and snaps outward to 5% steps.
 */
function sharedDomain(points: Point[], keys: string[]): [number, number] {
  const values = points.flatMap((point) =>
    keys.map((key) => point[key]).filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value),
    ),
  );
  if (values.length === 0) return [0.3, 0.7];
  const step = 0.05;
  return [
    Math.max(0, Math.floor((Math.min(...values, 0.5) - 0.02) / step) * step),
    Math.min(1, Math.ceil((Math.max(...values, 0.5) + 0.02) / step) * step),
  ];
}

// Small multiples: one market per panel on a shared axis, each with its
// season-to-date record, instead of tangled lines on one plot. A cutover marks
// a model change inside the range.
export function AccuracyChart<Row extends DailyRow>({
  data,
  series,
  cutover,
}: {
  data: Row[];
  series: AccuracySeries<Row>[];
  cutover?: { date: string; note: string };
}) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);
  const [windowKey, setWindowKey] = useState<WindowKey>("14");
  const windowDays = Number(windowKey);
  const points = useMemo(() => rollingAccuracy(data, series, windowDays), [data, series, windowDays]);
  const domain = sharedDomain(points, series.map((one) => one.key));
  const ticks = [domain[0], 0.5, domain[1]].filter((t, i, all) => all.indexOf(t) === i);
  const showCutover =
    cutover != null && data.some((d) => d.date <= cutover.date) && data.some((d) => d.date > cutover.date);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-meta text-muted-foreground">
          Trailing {windowDays}-day accuracy, pooled across the window and shown once at least {MIN_WINDOW_PREDICTIONS} predictions back it. The dashed line at 50% is a coin flip.
        </p>
        <ToggleGroup label="Window" options={WINDOWS} value={windowKey} onChange={setWindowKey} variant="pill" />
      </div>
      <div className={series.length > 1 ? "grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4" : undefined}>
        {series.map((one) => {
          let correct = 0;
          let predictions = 0;
          for (const day of data) {
            correct += count(day, one.correct);
            predictions += count(day, one.predictions);
          }
          return (
            <figure key={one.key} className="min-w-0">
              <figcaption className="flex items-baseline justify-between gap-2">
                <span className="type-label font-semibold">{one.name}</span>
                <span className="tabular-nums">
                  <span className="type-subsection">{predictions > 0 ? formatPct(correct / predictions, 1) : "–"}</span>
                  <span className="ml-1.5 type-meta text-muted-foreground">
                    {correct}/{predictions}
                  </span>
                </span>
              </figcaption>
              <div
                role="img"
                aria-label={`${one.name}: trailing ${windowDays}-day accuracy by day, ${predictions > 0 ? formatPct(correct / predictions, 1) : "no"} correct over the season`}
              >
                <ResponsiveContainer width="100%" height={series.length > 1 ? 150 : 220}>
                  <LineChart data={points} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
                    <XAxis dataKey="date" tickFormatter={formatDateLabel} minTickGap={40} {...axis} />
                    <YAxis domain={domain} ticks={ticks} tickFormatter={(v) => formatPct(Number(v), 0)} width={40} {...axis} />
                    <Tooltip
                      formatter={(value) => [formatPct(Number(value), 1), one.name]}
                      labelFormatter={(label) => formatDateLabel(String(label))}
                      cursor={{ stroke: theme.border, strokeWidth: 1 }}
                      contentStyle={chartTooltipStyle(theme)}
                    />
                    <ReferenceLine y={0.5} stroke={theme["chart-comparison"]} strokeDasharray="6 4" strokeWidth={1} />
                    {cutover && showCutover && (
                      <ReferenceLine x={cutover.date} stroke={theme.border} strokeWidth={1} />
                    )}
                    <Line
                      type="monotone"
                      dataKey={one.key}
                      stroke={theme["chart-primary"]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </figure>
          );
        })}
      </div>
      {cutover && showCutover && (
        <p className="type-meta text-muted-foreground">{cutover.note}</p>
      )}
    </div>
  );
}
