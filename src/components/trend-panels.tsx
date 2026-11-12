"use client";

import { useMemo, useState } from "react";
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

// A row per day or month holding sums and counts. Panels name their columns
// rather than pass accessors, so a server component can render the chart.
type PeriodRow = { date: string } & Record<string, unknown>;

export interface TrendSeries {
  name: string;
  sum: string;
  count: string;
  // A comparison line (a market) is drawn muted, and only where it covers
  // nearly the same games as the panel's first series.
  comparison?: boolean;
}

export interface TrendPanel {
  key: string;
  title: string;
  series: TrendSeries[];
  format: "number" | "percent";
  decimals: number;
  // A dashed reference the metric is judged against (a coin flip, zero bias).
  baseline?: number;
}

const WINDOWS = [
  { key: "7", label: "7 days" },
  { key: "14", label: "14 days" },
  { key: "30", label: "30 days" },
] as const;
type WindowKey = (typeof WINDOWS)[number]["key"];

const MIN_WINDOW_GAMES = 20;
// A comparison scored on far fewer games than the model is a different
// population, so its point is drawn only at this share of the model's games.
const COMPARISON_COVERAGE = 0.9;

type Point = Record<string, string | number | null>;

function amount(row: PeriodRow, field: string): number {
  const value = row[field];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function games(rows: PeriodRow[], series: TrendSeries): number {
  return rows.reduce((total, row) => total + amount(row, series.count), 0);
}

function pooled(rows: PeriodRow[], series: TrendSeries, minimum: number): number | null {
  const count = games(rows, series);
  if (count < minimum || count === 0) return null;
  return rows.reduce((total, row) => total + amount(row, series.sum), 0) / count;
}

/**
 * Each point pools its window: sum over the window divided by games in the
 * window, so a two-game day does not weigh the same as a fifteen-game day.
 * Daily points wait for a full window with MIN_WINDOW_GAMES behind it; a
 * month is one point of its own games.
 */
function trend(data: PeriodRow[], panels: TrendPanel[], windowDays: number | null): Point[] {
  return data.map((row, i) => {
    const point: Point = { date: row.date };
    const slice =
      windowDays == null ? [row] : i < windowDays - 1 ? [] : data.slice(i - windowDays + 1, i + 1);
    for (const panel of panels) {
      const covered = games(slice, panel.series[0]) * COMPARISON_COVERAGE;
      panel.series.forEach((series, s) => {
        const minimum = windowDays == null ? 1 : MIN_WINDOW_GAMES;
        point[`${panel.key}:${s}`] = pooled(slice, series, series.comparison ? Math.max(minimum, covered) : minimum);
      });
    }
    return point;
  });
}

function domain(points: Point[], panel: TrendPanel): [number, number] {
  const values = points.flatMap((point) =>
    panel.series
      .map((_, s) => point[`${panel.key}:${s}`])
      .filter((value): value is number => typeof value === "number"),
  );
  if (panel.baseline != null) values.push(panel.baseline);
  if (values.length === 0) return [0, 1];
  const low = Math.min(...values);
  const high = Math.max(...values);
  const pad = (high - low || Math.abs(high) || 1) * 0.1;
  return [low - pad, high + pad];
}

function show(value: number, panel: TrendPanel): string {
  return panel.format === "percent"
    ? `${(value * 100).toFixed(panel.decimals)}%`
    : value.toFixed(panel.decimals);
}

// Small multiples of pooled metrics over time: one metric per panel, a model
// line and, where a panel has one, a muted market line.
export function TrendPanels({
  data,
  panels,
  period,
}: {
  data: PeriodRow[];
  panels: TrendPanel[];
  period: "day" | "month";
}) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);
  const [windowKey, setWindowKey] = useState<WindowKey>("14");
  const windowDays = period === "day" ? Number(windowKey) : null;
  const points = useMemo(() => trend(data, panels, windowDays), [data, panels, windowDays]);
  const dateLabel = (dateStr: string) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString(
      "en-US",
      period === "day" ? { month: "short", day: "numeric" } : { month: "short", year: "2-digit" },
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-meta text-muted-foreground">
          {windowDays == null
            ? "Each point is one calendar month of games."
            : `Trailing ${windowDays} days, pooled across the window and shown once at least ${MIN_WINDOW_GAMES} games back it.`}{" "}
          The figure beside each title is the model over the whole record.
          {panels.some((panel) => panel.series.some((series) => series.comparison)) &&
            ` The muted line is the closing market, drawn where at least ${COMPARISON_COVERAGE * 100}% of the games have a recorded close.`}
        </p>
        {windowDays != null && (
          <ToggleGroup label="Window" options={WINDOWS} value={windowKey} onChange={setWindowKey} variant="pill" />
        )}
      </div>
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        {panels.map((panel) => {
          // A comparison's whole-record figure would cover different games
          // than the model's, so only the model's is printed.
          const overall = panel.series.map((series) => (series.comparison ? null : pooled(data, series, 1)));
          const summary = panel.series
            .flatMap((series, s) =>
              series.comparison ? [] : [`${series.name} ${overall[s] == null ? "none" : show(overall[s], panel)}`],
            )
            .join(", ");
          const range = domain(points, panel);
          return (
            <figure key={panel.key} className="min-w-0">
              <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="type-label font-semibold">{panel.title}</span>
                <span className="type-meta tabular-nums text-muted-foreground">
                  {panel.series.map((series, s) => (
                    <span key={series.name} className="ml-3 first:ml-0">
                      <span
                        aria-hidden
                        className="mr-1 inline-block size-2 rounded-full"
                        style={{ backgroundColor: theme[series.comparison ? "chart-comparison" : "chart-primary"] }}
                      />
                      {series.name}
                      {!series.comparison && (
                        <span className="ml-1 text-foreground">{overall[s] == null ? "–" : show(overall[s], panel)}</span>
                      )}
                    </span>
                  ))}
                </span>
              </figcaption>
              <div
                role="img"
                aria-label={`${panel.title} by ${period}${panel.series.some((series) => series.comparison) ? ", model against the closing market" : ""}. Whole record: ${summary}.`}
              >
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={points} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
                    <XAxis dataKey="date" tickFormatter={dateLabel} minTickGap={40} {...axis} />
                    <YAxis
                      domain={range}
                      tickCount={4}
                      tickFormatter={(v) => show(Number(v), panel)}
                      width={52}
                      {...axis}
                    />
                    <Tooltip
                      formatter={(value, name) => [show(Number(value), panel), name]}
                      labelFormatter={(label) => dateLabel(String(label))}
                      cursor={{ stroke: theme.border, strokeWidth: 1 }}
                      contentStyle={chartTooltipStyle(theme)}
                    />
                    {panel.baseline != null && (
                      <ReferenceLine
                        y={panel.baseline}
                        stroke={theme["rule-strong"]}
                        strokeDasharray="6 4"
                        strokeWidth={1}
                      />
                    )}
                    {panel.series.map((series, s) => (
                      <Line
                        key={series.name}
                        type="monotone"
                        name={series.name}
                        dataKey={`${panel.key}:${s}`}
                        stroke={theme[series.comparison ? "chart-comparison" : "chart-primary"]}
                        strokeWidth={series.comparison ? 1.5 : 2}
                        dot={period === "month" && !series.comparison ? { r: 2 } : false}
                        activeDot={{ r: 4 }}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
