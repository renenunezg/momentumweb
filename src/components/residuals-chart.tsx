"use client";

import { formatSigned } from "@/lib/utils";
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

type Bin = { bucket: string; count: number };

// Raw residuals are binned here by whole unit. A source that already
// aggregates passes its bins (bin b holds values from b up to b + 1) with the
// mean, so a large sample never ships every value to the browser.
export type ResidualsChartProps = (
  | { residuals: number[] }
  | { bins: { bin: number; n: number }[]; mean: number }
) & {
  unit?: string;
  subject?: string;
  // Which way the difference runs, for the axis and the accessible name.
  difference?: string;
};

function buildBins(values: number[]): Bin[] {
  if (values.length === 0) return [];
  const lo = Math.floor(Math.min(...values));
  const hi = Math.ceil(Math.max(...values));
  const bins: Bin[] = [];
  for (let b = lo; b < hi; b++) bins.push({ bucket: `${b}`, count: 0 });
  for (const v of values) {
    const idx = Math.min(Math.floor(v) - lo, bins.length - 1);
    if (idx >= 0) bins[idx].count += 1;
  }
  return bins;
}

// Fills the empty bins between the extremes so the axis stays continuous.
function fillBins(counted: { bin: number; n: number }[]): Bin[] {
  if (counted.length === 0) return [];
  const counts = new Map(counted.map((one) => [one.bin, one.n]));
  const lo = Math.min(...counts.keys());
  const hi = Math.max(...counts.keys());
  const bins: Bin[] = [];
  for (let b = lo; b <= hi; b++) bins.push({ bucket: `${b}`, count: counts.get(b) ?? 0 });
  return bins;
}

export function ResidualsChart({
  unit = "runs",
  subject = "graded team-games",
  difference = "Actual − Predicted",
  ...source
}: ResidualsChartProps) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);
  const bins = "bins" in source ? fillBins(source.bins) : buildBins(source.residuals);
  const total = bins.reduce((sum, bin) => sum + bin.count, 0);
  const mean =
    "bins" in source
      ? source.mean
      : source.residuals.length > 0
        ? source.residuals.reduce((a, b) => a + b, 0) / source.residuals.length
        : 0;

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">
        {total} {subject} · mean bias{" "}
        {formatSigned(mean, 2)} {unit}
      </p>
      <div
        role="img"
        aria-label={`Histogram of ${difference.replace(" − ", " minus ").toLowerCase()} ${unit} across ${total} ${subject}, mean bias ${formatSigned(mean, 2)} ${unit}`}
      >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={bins}
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
          <XAxis
            dataKey="bucket"
            label={{
              value: `${difference} (${unit})`,
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
          <Bar dataKey="count" fill={theme["chart-1"]} />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
