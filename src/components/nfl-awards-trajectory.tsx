"use client";

import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartAxisProps, chartTooltipStyle, useChartTheme } from "@/lib/chart-theme";
import { trajectorySeries } from "@/lib/nfl-awards-format";
import type { AwardBoard, AwardTrajectoryPoint } from "@/lib/nfl-awards-types";

const LINE_TOKENS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"] as const;
// A leader who sat deep in a thousand-player pool early on would flatten every other line.
const RANK_FLOOR = 25;

export function NflAwardsTrajectory({ points, leaders }: { points: AwardTrajectoryPoint[]; leaders: AwardBoard[] }) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);
  const { data, players } = useMemo(() => trajectorySeries(points, leaders), [points, leaders]);
  const floor = Math.min(RANK_FLOOR, Math.max(2, ...data.flatMap((row) => players.map((p) => row[p.id] ?? 1))));
  const ticks = floor <= 10 ? Array.from({ length: floor }, (_, i) => i + 1) : [1, ...[5, 10, 15, 20, 25].filter((t) => t <= floor)];
  return <section className="space-y-3" aria-label="Race trajectory">
    <h2 className="font-heading text-lg">Race trajectory</h2>
    {data.length < 2 ? <p className="text-sm text-muted-foreground">The race chart needs at least two weekly snapshots.</p> : <>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">Predicted rank by weekly snapshot for the current top {players.length}. Each point is what the board said after that week, not a recomputation; weeks ranked below {RANK_FLOOR} run off the bottom.</p>
      <div role="img" aria-label="Predicted award rank by week for the current leaders">
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
            <XAxis dataKey="week" tickFormatter={(w: number) => `W${w}`} {...axis} />
            <YAxis reversed allowDataOverflow interval={0} domain={[1, floor]} ticks={ticks} tickFormatter={(v: number) => `#${v}`} {...axis} />
            <Tooltip formatter={(value) => `#${value}`} labelFormatter={(label) => `Week ${label}`}
              itemSorter={(item) => Number(item.value)} cursor={{ stroke: theme.border, strokeWidth: 1 }} contentStyle={chartTooltipStyle(theme)} />
            <Legend iconType="plainline" itemSorter={null} wrapperStyle={{ fontFamily: "var(--font-geist-mono)", fontSize: 11 }} />
            {players.map((player, index) => <Line key={player.id} type="linear" dataKey={player.id} name={player.name}
              stroke={theme[LINE_TOKENS[index % LINE_TOKENS.length]]} strokeWidth={index < LINE_TOKENS.length ? 1.75 : 1}
              strokeDasharray={index < LINE_TOKENS.length ? undefined : "4 2"} dot={false} connectNulls />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>}
  </section>;
}
