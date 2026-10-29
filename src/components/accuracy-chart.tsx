"use client";

import { useMemo, useState } from "react";
import type { ModelEvaluation } from "@/lib/types";
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
import { V2_CUTOVER_DATE } from "@/lib/constants";
import { chartAxisProps, chartTooltipStyle, useChartTheme } from "@/lib/chart-theme";
import { ToggleGroup } from "@/components/toggle-group";

type SeriesKey = "total_accuracy" | "ml_accuracy" | "run_line_accuracy" | "totals_accuracy";

interface Series {
  key: SeriesKey;
  correct: keyof ModelEvaluation;
  predictions: keyof ModelEvaluation;
  name: string;
}

const SERIES: Series[] = [
  { key: "total_accuracy", correct: "total_correct", predictions: "total_predictions", name: "All predictions" },
  { key: "ml_accuracy", correct: "ml_correct", predictions: "ml_predictions", name: "Moneyline" },
  { key: "run_line_accuracy", correct: "run_line_correct", predictions: "run_line_predictions", name: "Run line" },
  { key: "totals_accuracy", correct: "totals_correct", predictions: "totals_predictions", name: "Totals" },
];

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

function count(row: ModelEvaluation, field: keyof ModelEvaluation): number {
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
function rollingAccuracy(data: ModelEvaluation[], windowDays: number): Point[] {
  return data.map((row, i) => {
    const point: Point = { date: row.date };
    if (i < windowDays - 1) {
      for (const series of SERIES) point[series.key] = null;
      return point;
    }
    const slice = data.slice(i - windowDays + 1, i + 1);
    for (const series of SERIES) {
      let correct = 0;
      let predictions = 0;
      for (const day of slice) {
        correct += count(day, series.correct);
        predictions += count(day, series.predictions);
      }
      point[series.key] = predictions >= MIN_WINDOW_PREDICTIONS ? correct / predictions : null;
    }
    return point;
  });
}

/**
 * One axis for every panel, so a market that looks higher is higher. Pooled
 * accuracy sits in a narrow band, so the axis fits the data (always including
 * the 50% coin flip) and snaps outward to 5% steps.
 */
function sharedDomain(points: Point[]): [number, number] {
  const values = points.flatMap((point) =>
    SERIES.map((series) => point[series.key]).filter(
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
// season-to-date record, instead of four tangled lines on one plot.
export function AccuracyChart({ data }: { data: ModelEvaluation[] }) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);
  const [windowKey, setWindowKey] = useState<WindowKey>("14");
  const windowDays = Number(windowKey);
  const points = useMemo(() => rollingAccuracy(data, windowDays), [data, windowDays]);
  const domain = sharedDomain(points);
  const ticks = [domain[0], 0.5, domain[1]].filter((t, i, all) => all.indexOf(t) === i);
  const showCutover = data.some((d) => d.date <= V2_CUTOVER_DATE) && data.some((d) => d.date > V2_CUTOVER_DATE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-meta text-muted-foreground">
          Trailing {windowDays}-day accuracy, pooled across the window and shown once at least {MIN_WINDOW_PREDICTIONS} predictions back it. The dashed line at 50% is a coin flip.
        </p>
        <ToggleGroup label="Window" options={WINDOWS} value={windowKey} onChange={setWindowKey} variant="pill" />
      </div>
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
        {SERIES.map((series) => {
          let correct = 0;
          let predictions = 0;
          for (const day of data) {
            correct += count(day, series.correct);
            predictions += count(day, series.predictions);
          }
          return (
            <figure key={series.key} className="min-w-0">
              <figcaption className="flex items-baseline justify-between gap-2">
                <span className="type-label font-semibold">{series.name}</span>
                <span className="tabular-nums">
                  <span className="type-subsection">{predictions > 0 ? formatPct(correct / predictions, 1) : "–"}</span>
                  <span className="ml-1.5 type-meta text-muted-foreground">
                    {correct}/{predictions}
                  </span>
                </span>
              </figcaption>
              <div
                role="img"
                aria-label={`${series.name}: trailing ${windowDays}-day accuracy by day, ${predictions > 0 ? formatPct(correct / predictions, 1) : "no"} correct over the season`}
              >
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={points} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
                    <XAxis dataKey="date" tickFormatter={formatDateLabel} minTickGap={40} {...axis} />
                    <YAxis domain={domain} ticks={ticks} tickFormatter={(v) => formatPct(Number(v), 0)} width={40} {...axis} />
                    <Tooltip
                      formatter={(value) => [formatPct(Number(value), 1), series.name]}
                      labelFormatter={(label) => formatDateLabel(String(label))}
                      cursor={{ stroke: theme.border, strokeWidth: 1 }}
                      contentStyle={chartTooltipStyle(theme)}
                    />
                    <ReferenceLine y={0.5} stroke={theme["chart-comparison"]} strokeDasharray="6 4" strokeWidth={1} />
                    {showCutover && (
                      <ReferenceLine x={V2_CUTOVER_DATE} stroke={theme.border} strokeWidth={1} />
                    )}
                    <Line
                      type="monotone"
                      dataKey={series.key}
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
      {showCutover && (
        <p className="type-meta text-muted-foreground">The thin vertical line marks the switch to the v2 model.</p>
      )}
    </div>
  );
}
