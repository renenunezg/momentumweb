"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartAxisProps, chartTooltipStyle, useChartTheme } from "@/lib/chart-theme";
import { formatNumber } from "@/lib/utils";

export interface WeeklyErrorPoint {
  label: string;
  games: number;
  model: number;
  market: number;
}

// The published line's average miss against the closing line's, week by week,
// on the same games. Model solid with circles, market dashed with squares.
export function WeeklyErrorChart({ data }: { data: WeeklyErrorPoint[] }) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);
  const first = data[0]?.label;
  const last = data[data.length - 1]?.label;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-5 gap-y-1 type-meta text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-chart-primary" />
          Model
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 bg-chart-comparison" />
          Closing line
        </span>
        <span>Average miss of the final margin, in points. Lower is better.</span>
      </div>
      <div
        role="img"
        aria-label={`Average margin error by week, model against the closing line on the same games, ${first} to ${last}`}
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
            <XAxis dataKey="label" minTickGap={16} {...axis} />
            <YAxis
              domain={[(min: number) => Math.max(0, Math.floor(min - 1)), (max: number) => Math.ceil(max + 1)]}
              allowDecimals={false}
              width={32}
              {...axis}
            />
            <Tooltip
              formatter={(value, name) => [formatNumber(Number(value), 2), name === "model" ? "Model" : "Closing line"]}
              labelFormatter={(label, payload) => {
                const games = (payload?.[0]?.payload as WeeklyErrorPoint | undefined)?.games;
                return games != null ? `${label}, ${games} games` : String(label);
              }}
              cursor={{ stroke: theme.border, strokeWidth: 1 }}
              contentStyle={chartTooltipStyle(theme)}
            />
            <Line
              type="linear"
              dataKey="market"
              stroke={theme["chart-comparison"]}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              dot={({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) => (
                <rect key={index} x={(cx ?? 0) - 3} y={(cy ?? 0) - 3} width={6} height={6} fill={theme["chart-comparison"]} />
              )}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="model"
              stroke={theme["chart-primary"]}
              strokeWidth={2}
              dot={{ r: 3, fill: theme["chart-primary"], strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
