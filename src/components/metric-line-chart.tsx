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
  /** Palette slot for the series; defaults to the primary data-ink color. */
  token?: "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5";
  formatter?: (value: number) => string;
}

function formatDateLabel(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

export function MetricLineChart({
  data,
  dataKey,
  name,
  token = "chart-1",
  formatter = (v: number) => v.toFixed(3),
}: MetricLineChartProps) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
        <XAxis dataKey="date" tickFormatter={formatDateLabel} {...axis} />
        <YAxis tickFormatter={(v: number) => formatter(v)} {...axis} />
        <Tooltip
          formatter={(value) => formatter(Number(value))}
          labelFormatter={(label) => formatDateLabel(String(label))}
          cursor={{ stroke: theme.border, strokeWidth: 1 }}
          contentStyle={chartTooltipStyle(theme)}
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
        <Line
          type="monotone"
          dataKey={dataKey as string}
          name={name}
          stroke={theme[token]}
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
