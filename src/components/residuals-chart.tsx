"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  chartAxisProps,
  chartTooltipStyle,
  useChartTheme,
} from "@/lib/chart-theme";

export interface ResidualsChartProps {
  residuals: number[];
}

function buildBins(values: number[]) {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const lo = Math.floor(min);
  const hi = Math.ceil(max);
  const bins: { bucket: string; mid: number; count: number }[] = [];
  for (let b = lo; b < hi; b++) {
    bins.push({ bucket: `${b}`, mid: b + 0.5, count: 0 });
  }
  for (const v of values) {
    const idx = Math.min(Math.floor(v) - lo, bins.length - 1);
    if (idx >= 0) bins[idx].count += 1;
  }
  return bins;
}

export function ResidualsChart({ residuals }: ResidualsChartProps) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);
  const bins = buildBins(residuals);
  const mean =
    residuals.length > 0
      ? residuals.reduce((a, b) => a + b, 0) / residuals.length
      : 0;

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">
        {residuals.length} graded team-games · mean bias{" "}
        {mean >= 0 ? "+" : ""}
        {mean.toFixed(2)} runs
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={bins}
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
          <XAxis
            dataKey="bucket"
            label={{
              value: "Actual − Predicted (runs)",
              position: "insideBottom",
              offset: -4,
              style: { fill: theme["muted-foreground"], fontSize: 11 },
            }}
            {...axis}
          />
          <YAxis allowDecimals={false} {...axis} />
          <Tooltip
            contentStyle={chartTooltipStyle(theme)}
            cursor={{ fill: theme.grid, fillOpacity: 0.4 }}
            formatter={(value) => [value as number, "Count"]}
            labelFormatter={(label) => `Residual bin: ${label}`}
          />
          {/* Zero bias: where an unbiased model centers. */}
          <ReferenceLine x="0" stroke={theme.foreground} strokeWidth={1} />
          <Bar dataKey="count" fill={theme["chart-2"]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
