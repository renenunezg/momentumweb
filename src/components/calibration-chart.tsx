"use client";

import type { CalibrationBin } from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  chartAxisProps,
  chartTooltipStyle,
  useChartTheme,
} from "@/lib/chart-theme";

interface CalibrationChartProps {
  data: CalibrationBin[];
}

export function CalibrationChart({ data }: CalibrationChartProps) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
        <XAxis
          dataKey="predicted_mean"
          label={{
            value: "Predicted",
            position: "insideBottom",
            offset: -2,
            fill: theme["muted-foreground"],
            fontSize: 11,
          }}
          domain={[0, 1]}
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          {...axis}
        />
        <YAxis
          label={{
            value: "Observed",
            angle: -90,
            position: "insideLeft",
            fill: theme["muted-foreground"],
            fontSize: 11,
          }}
          domain={[0, 1]}
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          {...axis}
        />
        {/* Perfect calibration: the line the observed rate should sit on. */}
        <ReferenceLine
          segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
          stroke={theme["muted-foreground"]}
          strokeDasharray="4 4"
          ifOverflow="extendDomain"
        />
        <Tooltip
          formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`}
          cursor={{ stroke: theme.border, strokeWidth: 1 }}
          contentStyle={chartTooltipStyle(theme)}
        />
        <Line
          type="monotone"
          dataKey="observed_rate"
          name="Observed Win Rate"
          stroke={theme["chart-1"]}
          strokeWidth={1.5}
          dot={{ r: 3, fill: theme["chart-1"], strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
