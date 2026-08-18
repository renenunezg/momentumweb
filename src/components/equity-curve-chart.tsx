"use client";

import type { ModelEvaluation } from "@/lib/types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { V2_CUTOVER_DATE } from "@/lib/constants";
import {
  chartAxisProps,
  chartTooltipStyle,
  useChartTheme,
} from "@/lib/chart-theme";

interface EquityCurveChartProps {
  data: ModelEvaluation[];
}

function formatDateLabel(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

export function EquityCurveChart({ data }: EquityCurveChartProps) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
        <XAxis dataKey="date" tickFormatter={formatDateLabel} {...axis} />
        <YAxis tickFormatter={(v: number) => `${v.toFixed(2)}u`} {...axis} />
        {/* Break-even: starting bankroll. */}
        <ReferenceLine y={1} stroke={theme["muted-foreground"]} strokeWidth={1} />
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
        <Tooltip
          formatter={(value) => `${Number(value).toFixed(4)} units`}
          labelFormatter={(label) => formatDateLabel(String(label))}
          cursor={{ stroke: theme.border, strokeWidth: 1 }}
          contentStyle={chartTooltipStyle(theme)}
        />
        <Area
          type="monotone"
          dataKey="equity_end_units"
          name="Equity"
          stroke={theme["chart-1"]}
          fill={theme["chart-1"]}
          fillOpacity={0.08}
          strokeWidth={1.5}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
