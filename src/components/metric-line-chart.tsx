"use client";

import type { ModelEvaluation } from "@/lib/types";
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
import {
  chartAxisProps,
  chartTooltipStyle,
  useChartTheme,
} from "@/lib/chart-theme";

interface MetricLineChartProps {
  data: ModelEvaluation[];
  dataKey: keyof ModelEvaluation;
  name: string;
  formatter?: (value: number) => string;
  // A dashed comparison line the metric is judged against (a coin flip's Brier).
  baseline?: number;
  height?: number;
}

function formatDateLabel(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function MetricLineChart({
  data,
  dataKey,
  name,
  formatter = (v: number) => v.toFixed(3),
  baseline,
  height = 220,
}: MetricLineChartProps) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);
  const range =
    data.length > 0
      ? `, ${formatDateLabel(data[0].date)} to ${formatDateLabel(data[data.length - 1].date)}`
      : "";

  return (
    <div role="img" aria-label={`${name} by day${range}`}>
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
        <XAxis dataKey="date" tickFormatter={formatDateLabel} minTickGap={40} {...axis} />
        <YAxis tickFormatter={(v: number) => formatter(v)} width={48} {...axis} />
        <Tooltip
          formatter={(value) => formatter(Number(value))}
          labelFormatter={(label) => formatDateLabel(String(label))}
          cursor={{ stroke: theme.border, strokeWidth: 1 }}
          contentStyle={chartTooltipStyle(theme)}
        />
        <ReferenceLine x={V2_CUTOVER_DATE} stroke={theme.border} strokeWidth={1} />
        {baseline != null && (
          <ReferenceLine y={baseline} stroke={theme["chart-comparison"]} strokeDasharray="6 4" strokeWidth={1} />
        )}
        <Line
          type="monotone"
          dataKey={dataKey as string}
          name={name}
          stroke={theme["chart-primary"]}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
}
