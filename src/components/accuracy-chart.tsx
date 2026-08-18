"use client";

import { useMemo, useState } from "react";
import type { ModelEvaluation } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { V2_CUTOVER_DATE } from "@/lib/constants";
import {
  chartAxisProps,
  chartTooltipStyle,
  useChartTheme,
} from "@/lib/chart-theme";

interface AccuracyChartProps {
  data: ModelEvaluation[];
}

type SeriesKey = "ml_accuracy" | "run_line_accuracy" | "totals_accuracy" | "total_accuracy";

interface Series {
  key: SeriesKey;
  correct: keyof ModelEvaluation;
  predictions: keyof ModelEvaluation;
  name: string;
  token: "chart-1" | "chart-2" | "chart-3" | "chart-4";
  dashed?: boolean;
}

const SERIES: Series[] = [
  {
    key: "ml_accuracy",
    correct: "ml_correct",
    predictions: "ml_predictions",
    name: "ML Accuracy",
    token: "chart-1",
  },
  {
    key: "run_line_accuracy",
    correct: "run_line_correct",
    predictions: "run_line_predictions",
    name: "Run Line",
    token: "chart-2",
  },
  {
    key: "totals_accuracy",
    correct: "totals_correct",
    predictions: "totals_predictions",
    name: "Totals",
    token: "chart-4",
  },
  {
    key: "total_accuracy",
    correct: "total_correct",
    predictions: "total_predictions",
    name: "Pick Acc",
    token: "chart-3",
    dashed: true,
  },
];

const WINDOWS = [7, 14, 30] as const;
type WindowDays = (typeof WINDOWS)[number];

function formatDateLabel(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(0)}%`;
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
 * Points before the window is fully populated are left null rather than shown
 * on a partial denominator.
 */
function rollingAccuracy(data: ModelEvaluation[], windowDays: WindowDays) {
  return data.map((row, i) => {
    const point: Record<string, string | number | null> = { date: row.date };
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
      point[series.key] = predictions > 0 ? correct / predictions : null;
    }
    return point;
  });
}

/**
 * Pooled accuracy sits in a narrow band well inside [0, 1], so a fixed
 * full-range axis flattens every series. Fit the axis to the data instead,
 * padded and always including the 0.5 coin-flip baseline.
 */
function accuracyDomain(
  points: Record<string, string | number | null>[],
): [number, number] {
  const values = points.flatMap((point) =>
    SERIES.map((series) => point[series.key]).filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value),
    ),
  );
  if (values.length === 0) return [0.3, 0.7];
  const min = Math.min(...values, 0.5);
  const max = Math.max(...values, 0.5);
  const pad = Math.max((max - min) * 0.15, 0.02);
  // Snap outward to 5% steps so the axis lands on round ticks.
  const step = 0.05;
  return [
    Math.max(0, Math.floor((min - pad) / step) * step),
    Math.min(1, Math.ceil((max + pad) / step) * step),
  ];
}

export function AccuracyChart({ data }: AccuracyChartProps) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);
  const [windowDays, setWindow] = useState<WindowDays>(14);
  const points = useMemo(() => rollingAccuracy(data, windowDays), [data, windowDays]);
  const domain = accuracyDomain(points);
  const [isolated, setIsolated] = useState<SeriesKey | null>(null);
  const isHidden = (key: SeriesKey) => isolated !== null && isolated !== key;
  const handleLegendClick = (entry: { dataKey?: string | number | ((obj: unknown) => unknown) }) => {
    const key = typeof entry.dataKey === "string" ? (entry.dataKey as SeriesKey) : null;
    if (!key) return;
    setIsolated((prev) => (prev === key ? null : key));
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <p className="text-xs text-muted-foreground">
          Pooled over a trailing {windowDays}-day window: correct picks divided
          by picks made, not an average of daily rates.
        </p>
        <div className="flex items-center gap-1">
          {WINDOWS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setWindow(option)}
              aria-pressed={windowDays === option}
              className={cn(
                "px-2 py-1 font-mono text-xs uppercase tracking-wider transition-colors",
                windowDays === option
                  ? "text-foreground underline underline-offset-4"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option}d
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={points}
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
        <CartesianGrid
          vertical={false}
          stroke={theme.grid}
          strokeWidth={1}
        />
        <XAxis dataKey="date" tickFormatter={formatDateLabel} {...axis} />
        <YAxis domain={domain} tickFormatter={formatPercent} {...axis} />
        <Tooltip
          formatter={(value) => formatPercent(Number(value))}
          labelFormatter={(label) => formatDateLabel(String(label))}
          cursor={{ stroke: theme.border, strokeWidth: 1 }}
          contentStyle={chartTooltipStyle(theme)}
        />
        <Legend
          wrapperStyle={{ fontFamily: "var(--font-geist-mono)", fontSize: "11px", cursor: "pointer" }}
          onClick={handleLegendClick}
        />
        {/* Coin-flip baseline: the number every accuracy series is judged against. */}
        <ReferenceLine
          y={0.5}
          stroke={theme["muted-foreground"]}
          strokeWidth={1}
        />
        <ReferenceLine
          x={V2_CUTOVER_DATE}
          stroke={theme["muted-foreground"]}
          strokeDasharray="4 2"
          label={{
            value: "v2",
            position: "insideTopRight",
            fill: theme["muted-foreground"],
            fontSize: 10,
            fontFamily: "var(--font-geist-mono)",
          }}
        />
        {SERIES.map((series) => (
          <Line
            key={series.key}
            type="monotone"
            dataKey={series.key}
            name={series.name}
            stroke={theme[series.token]}
            strokeWidth={1.5}
            strokeDasharray={series.dashed ? "4 2" : undefined}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls={false}
            hide={isHidden(series.key)}
          />
        ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
