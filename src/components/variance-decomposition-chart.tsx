"use client";

import type { PosteriorSigma } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ErrorBar,
} from "recharts";
import {
  chartAxisProps,
  chartTooltipStyle,
  useChartTheme,
} from "@/lib/chart-theme";

interface VarianceDecompositionChartProps {
  data: PosteriorSigma[];
}

const SIGMA_LABELS: Record<string, string> = {
  sigma_batter: "Batter skill",
  sigma_platoon: "Platoon split",
  sigma_pitcher: "Pitcher skill",
  sigma_park: "Park effect",
};

export function VarianceDecompositionChart({ data }: VarianceDecompositionChartProps) {
  // Hooks must run before the empty-data bail-out.
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);

  if (data.length === 0) return null;

  const latestDate = data.reduce(
    (max, d) => (d.refit_date > max ? d.refit_date : max),
    "",
  );
  const latest = data.filter((d) => d.refit_date === latestDate);

  const chartData = latest
    .map((s) => ({
      name: SIGMA_LABELS[s.sigma_name] ?? s.sigma_name,
      mean: Number(s.mean.toFixed(4)),
      // ErrorBar expects [lowerDeviation, upperDeviation] as positive values
      error: [
        s.p10 != null ? Math.max(0, Number((s.mean - s.p10).toFixed(4))) : 0,
        s.p90 != null ? Math.max(0, Number((s.p90 - s.mean).toFixed(4))) : 0,
      ] as [number, number],
    }))
    .sort((a, b) => b.mean - a.mean);

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3 font-mono">
        Posterior sigma (logit scale) as of {latestDate}. Bars show posterior mean; whiskers show 10th-90th percentile.
      </p>
      <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 48)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 40, left: 100, bottom: 4 }}
        >
          {/* Bars run horizontally here, so the value-axis rules are vertical. */}
          <CartesianGrid
            horizontal={false}
            stroke={theme.grid}
            strokeWidth={1}
          />
          <XAxis
            type="number"
            tickFormatter={(v: number) => v.toFixed(2)}
            domain={[0, "auto"]}
            {...axis}
          />
          <YAxis type="category" dataKey="name" width={96} {...axis} />
          <Tooltip
            formatter={(value) => Number(value).toFixed(4)}
            cursor={{ fill: theme.grid, fillOpacity: 0.4 }}
            contentStyle={chartTooltipStyle(theme)}
          />
          <Bar
            dataKey="mean"
            name="Posterior mean"
            fill={theme["chart-1"]}
            barSize={18}
            radius={0}
          >
            <ErrorBar
              dataKey="error"
              width={6}
              strokeWidth={1}
              stroke={theme.foreground}
              direction="x"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
