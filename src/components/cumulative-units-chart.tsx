"use client";

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
import { formatSigned } from "@/lib/utils";

export interface UnitsSeries {
  key: string;
  name: string;
  // The headline line; the others are drawn thinner in secondary colors.
  primary?: boolean;
}

const SECONDARY = ["chart-4", "chart-3"] as const;

function dateLabel(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Running profit in flat units by game date, one line per series, against
// the break-even line at zero.
export function CumulativeUnitsChart({
  data,
  series,
}: {
  data: ({ date: string } & Record<string, string | number>)[];
  series: UnitsSeries[];
}) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);
  const last = data[data.length - 1];
  const summary = last
    ? series.map((one) => `${one.name} ${formatSigned(Number(last[one.key]), 2)} units`).join(", ")
    : "no settled predictions";
  const colors = series.map((one, i) =>
    one.primary
      ? theme["chart-primary"]
      : theme[SECONDARY[series.slice(0, i).filter((other) => !other.primary).length % SECONDARY.length]],
  );

  return (
    <div className="space-y-2">
      <p className="type-meta tabular-nums text-muted-foreground">
        {series.map((one, i) => (
          <span key={one.key} className="mr-4 inline-flex items-center">
            <span aria-hidden className="mr-1 inline-block size-2 rounded-full" style={{ backgroundColor: colors[i] }} />
            {one.name}{" "}
            <span className="ml-1 text-foreground">{last ? `${formatSigned(Number(last[one.key]), 2)}u` : "–"}</span>
          </span>
        ))}
      </p>
      <div
        role="img"
        aria-label={`Cumulative units by game date against break-even${last ? `, ${dateLabel(data[0].date)} to ${dateLabel(last.date)}` : ""}: ${summary}`}
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
            <XAxis dataKey="date" tickFormatter={dateLabel} minTickGap={40} {...axis} />
            <YAxis tickFormatter={(v) => `${formatSigned(Number(v), 0)}u`} width={48} {...axis} />
            <Tooltip
              formatter={(value, name) => [`${formatSigned(Number(value), 2)}u`, name]}
              labelFormatter={(label) => dateLabel(String(label))}
              cursor={{ stroke: theme.border, strokeWidth: 1 }}
              contentStyle={chartTooltipStyle(theme)}
            />
            <ReferenceLine y={0} stroke={theme["rule-strong"]} strokeWidth={1} />
            {series.map((one, i) => (
              <Line
                key={one.key}
                type="stepAfter"
                name={one.name}
                dataKey={one.key}
                stroke={colors[i]}
                strokeWidth={one.primary ? 2 : 1.5}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
