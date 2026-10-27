"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { chartAxisProps, chartTooltipStyle, useChartTheme } from "@/lib/chart-theme";
import type { CarryStudy } from "@/lib/mlb-carry";

const signed = (v: number, digits = 1) => `${v > 0 ? "+" : ""}${v.toFixed(digits)}`;

function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-0 w-4"
            style={{ borderTop: `${i.dashed ? "2px dashed" : "3px solid"} ${i.color}` }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Every hitter's average carry as a histogram, with chosen hitters marked. */
export function CarryDistribution({ values, marks }: { values: number[]; marks: { name: string; carry: number }[] }) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);
  const bins = Array.from({ length: 17 }, (_, i) => -16 + i * 2);
  const markBins = new Map(marks.map((m) => [Math.floor((m.carry + 16) / 2), m.name]));
  const data = bins.map((lo, i) => ({
    lo,
    label: signed(lo, 0),
    count: values.filter((v) => v >= lo && v < lo + 2).length,
    mark: markBins.get(i) ?? null,
  }));
  return (
    <div role="img" aria-label={`Histogram of ${values.length} hitters' average carry; marked hitters: ${marks.map((m) => `${m.name} ${signed(m.carry)} ft`).join(", ")}`}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 18, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke={theme.grid} />
          <XAxis dataKey="label" {...axis} interval={1} />
          <YAxis {...axis} allowDecimals={false} width={28} />
          <Tooltip
            cursor={{ fill: theme.grid }}
            contentStyle={chartTooltipStyle(theme)}
            formatter={(v) => [`${v} hitters`, ""]}
            labelFormatter={(l, p) => `${l} to ${signed(Number(p?.[0]?.payload?.lo ?? 0) + 2, 0)} ft${p?.[0]?.payload?.mark ? ` · ${p[0].payload.mark}` : ""}`}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={24} label={{ dataKey: "mark", position: "top", fontSize: 10, fill: theme.foreground }}>
            {data.map((d) => (
              <Cell key={d.lo} fill={d.mark ? theme["chart-1"] : theme.border} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Expected against actual distance for every ball of two hitters, with the league line. */
export function EveryBall({ series }: { series: { name: string; points: [number, number][] }[] }) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);
  const colors = [theme["chart-1"], theme["chart-3"]];
  const shapes = ["circle", "triangle"] as const;
  return (
    <div className="space-y-2">
      <Legend items={[...series.map((s, i) => ({ label: s.name, color: colors[i] })), { label: "League average", color: theme["muted-foreground"], dashed: true }]} />
      <div role="img" aria-label={`Expected versus actual distance for every ball in the air by ${series.map((s) => s.name).join(" and ")}`}>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 16 }}>
            <CartesianGrid stroke={theme.grid} />
            <XAxis type="number" dataKey="x" domain={[150, 475]} ticks={[150, 200, 250, 300, 350, 400, 450]} name="Expected" unit=" ft" {...axis}
              label={{ value: "Expected from exit velo and launch angle (ft)", position: "insideBottom", offset: -8, fill: theme["muted-foreground"], fontSize: 11 }} />
            <YAxis type="number" dataKey="y" domain={[150, 475]} ticks={[150, 200, 250, 300, 350, 400, 450]} name="Actual" unit=" ft" {...axis} width={48} />
            <ZAxis range={[22, 22]} />
            <ReferenceLine segment={[{ x: 150, y: 150 }, { x: 475, y: 475 }]} stroke={theme["muted-foreground"]} strokeDasharray="5 4" />
            <Tooltip contentStyle={chartTooltipStyle(theme)} cursor={false} />
            {series.map((s, i) => (
              <Scatter key={s.name} name={s.name} data={s.points.map(([x, y]) => ({ x, y }))} fill={colors[i]} fillOpacity={0.7} shape={shapes[i]} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** One hitter-season's carry against the next season's. */
export function CarryRepeat({ pairs, highlight }: { pairs: { name: string; x: number; y: number }[]; highlight: Set<string> }) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);
  const marked = pairs.filter((p) => highlight.has(p.name));
  return (
    <div role="img" aria-label={`Carry in one season against the next for ${pairs.length} hitters`}>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 16 }}>
          <CartesianGrid stroke={theme.grid} />
          <XAxis type="number" dataKey="x" domain={[-18, 18]} name="Previous season" unit=" ft" {...axis}
            label={{ value: "Carry, previous season (ft)", position: "insideBottom", offset: -8, fill: theme["muted-foreground"], fontSize: 11 }} />
          <YAxis type="number" dataKey="y" domain={[-18, 18]} name="Next season" unit=" ft" {...axis} width={36} />
          <ZAxis range={[20, 20]} />
          <Tooltip contentStyle={chartTooltipStyle(theme)} cursor={false}
            formatter={(v) => `${signed(Number(v))} ft`} labelFormatter={() => ""} />
          <Scatter data={pairs} fill={theme.border} />
          <Scatter data={marked} fill={theme["chart-1"]} label={{ dataKey: "name", position: "right", fontSize: 11, fill: theme.foreground }} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Each ballpark's measured carry next to what its air alone does to a reference fly ball. */
export function ParkCarry({ parks }: { parks: { venue: string; elevation: number | null; measured: number; air?: number }[] }) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);
  const withAir = parks.some((p) => p.air != null);
  const data = parks.map((p) => {
    const name = p.venue.replace(/ (Park|Field|Stadium|Ballpark)$/, "");
    return { ...p, short: p.elevation != null && p.elevation >= 1000 ? `${name} (${p.elevation.toLocaleString()} ft)` : name };
  });
  return (
    <div className="space-y-2">
      <Legend items={[{ label: "Measured carry at the park", color: theme["chart-1"] },
        ...(withAir ? [{ label: "Air alone (elevation and temperature)", color: theme["chart-2"] }] : [])]} />
      <div role="img" aria-label="Measured carry by ballpark next to the flight model's air effect">
        <ResponsiveContainer width="100%" height={Math.max(260, data.length * 22)}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }} barGap={1}>
            <CartesianGrid horizontal={false} stroke={theme.grid} />
            <XAxis type="number" {...axis} tickFormatter={(v: number) => signed(v, 0)} />
            <YAxis type="category" dataKey="short" {...axis} width={210} interval={0} />
            <ReferenceLine x={0} stroke={theme["rule-strong"]} />
            <Tooltip contentStyle={chartTooltipStyle(theme)} cursor={{ fill: theme.grid }}
              labelFormatter={(l, p) => `${l}${p?.[0]?.payload?.elevation != null ? ` · ${Number(p[0].payload.elevation).toLocaleString()} ft elevation` : ""}`}
              formatter={(v, name) => [`${signed(Number(v))} ft`, name === "measured" ? "Measured" : "Air alone"]} />
            <Bar dataKey="measured" fill={theme["chart-1"]} barSize={7} radius={2} />
            {withAir && <Bar dataKey="air" fill={theme["chart-2"]} barSize={7} radius={2} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Distance of the reference fly ball against backspin at league air and at Coors Field. */
export function SpinCurve({ curve }: { curve: CarryStudy["spin_curve"] }) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);
  const data = curve.rpm.map((rpm, i) => ({ rpm, league: curve.league[i], coors: curve.coors[i] }));
  return (
    <div className="space-y-2">
      <Legend items={[{ label: "League-average air", color: theme["chart-1"] }, { label: "Coors Field air", color: theme["chart-3"], dashed: true }]} />
      <div role="img" aria-label={`Distance of a ${curve.exit} mph, ${curve.launch} degree fly ball against backspin`}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 16 }}>
            <CartesianGrid vertical={false} stroke={theme.grid} />
            <XAxis dataKey="rpm" {...axis} tickFormatter={(v: number) => v.toLocaleString()}
              label={{ value: "Backspin (rpm)", position: "insideBottom", offset: -8, fill: theme["muted-foreground"], fontSize: 11 }} />
            <YAxis {...axis} domain={["dataMin - 10", "dataMax + 10"]} unit=" ft" width={52} />
            <Tooltip contentStyle={chartTooltipStyle(theme)} formatter={(v) => `${v} ft`} labelFormatter={(l) => `${Number(l).toLocaleString()} rpm`} />
            <Line dataKey="league" name="League air" stroke={theme["chart-1"]} strokeWidth={2} dot={false} />
            <Line dataKey="coors" name="Coors air" stroke={theme["chart-3"]} strokeWidth={2} strokeDasharray="6 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** How far balls curve toward the foul lines, and what sidespin costs, by direction. */
export function SidespinBars({ rows }: { rows: CarryStudy["sidespin"] }) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(["curve", "feet"] as const).map((key) => (
        <div key={key} className="space-y-1">
          <p className="text-xs text-muted-foreground">{key === "curve" ? "Curve toward the pull side (degrees)" : "Distance lost to sidespin (ft)"}</p>
          <div role="img" aria-label={key === "curve" ? "Hook and slice by direction" : "Distance cost of sidespin by direction"}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke={theme.grid} />
                <XAxis dataKey="direction" {...axis} interval={0} />
                <YAxis {...axis} width={32} />
                <ReferenceLine y={0} stroke={theme["rule-strong"]} />
                <Tooltip contentStyle={chartTooltipStyle(theme)} cursor={{ fill: theme.grid }} formatter={(v) => signed(Number(v))} />
                <Bar dataKey={key} fill={key === "curve" ? theme["chart-2"] : theme["chart-3"]} maxBarSize={24} radius={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Hitters' swing tilt against their carry. */
export function TiltCarry({ points, highlight }: { points: { name: string; x: number; y: number }[]; highlight: Set<string> }) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);
  return (
    <div role="img" aria-label="Swing path tilt at a belt-high pitch against carry, one point per hitter">
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 16 }}>
          <CartesianGrid stroke={theme.grid} />
          <XAxis type="number" dataKey="x" domain={[18, 46]} name="Tilt" unit="°" {...axis}
            label={{ value: "Swing path tilt at a belt-high pitch (lower is flatter)", position: "insideBottom", offset: -8, fill: theme["muted-foreground"], fontSize: 11 }} />
          <YAxis type="number" dataKey="y" domain={[-16, 16]} name="Carry" unit=" ft" {...axis} width={40} />
          <ZAxis range={[20, 20]} />
          <Tooltip contentStyle={chartTooltipStyle(theme)} cursor={false} labelFormatter={() => ""} />
          <Scatter data={points.filter((p) => !highlight.has(p.name))} fill={theme.border} />
          <Scatter data={points.filter((p) => highlight.has(p.name))} fill={theme["chart-1"]}
            label={{ dataKey: "name", position: "right", fontSize: 11, fill: theme.foreground }} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/** The share of hitters' carry differences each layer of physics explains, against the ceiling set by sampling noise. */
export function ExplainedBars({ explained }: { explained: CarryStudy["explained"] }) {
  const theme = useChartTheme();
  const rows = [
    { label: "Spin from the measured swing", value: explained.share_without_steep_correction, color: theme["chart-2"] },
    { label: "Adding the steep-swing correction", value: explained.share, color: theme["chart-1"] },
    { label: "Most any model could explain", value: explained.ceiling, color: theme.border },
  ];
  return (
    <div className="space-y-2" role="img" aria-label={rows.map((r) => `${r.label} ${Math.round(r.value * 100)}%`).join(", ")}>
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[minmax(0,14rem)_1fr_3rem] items-center gap-3 text-sm">
          <span className="text-muted-foreground">{r.label}</span>
          <span className="h-3 rounded-sm bg-muted">
            <span className="block h-3 rounded-sm" style={{ width: `${Math.max(0, r.value) * 100}%`, background: r.color }} />
          </span>
          <span className="text-right font-mono tabular-nums">{Math.round(r.value * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

/** Mean change for hitters grouped by how much their tilt changed, relative to hitters who held steady. */
export function ChangerBars({ groups, outcome, label }: {
  groups: CarryStudy["changers"]["groups"];
  outcome: "carry" | "ops" | "hr600" | "so600";
  label: string;
}) {
  const format = outcome === "ops" ? (v: number) => signed(v * 1000, 0) : (v: number) => signed(v);
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);
  const colors = [theme["chart-2"], theme["chart-2"], theme.border, theme["chart-3"], theme["chart-3"]];
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div role="img" aria-label={`${label} by tilt change group`}>
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={groups} margin={{ top: 8, right: 4, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke={theme.grid} />
            <XAxis dataKey="group" {...axis} interval={0} tick={false} />
            <YAxis {...axis} width={40} tickFormatter={format} />
            <ReferenceLine y={0} stroke={theme["rule-strong"]} />
            <Tooltip contentStyle={chartTooltipStyle(theme)} cursor={{ fill: theme.grid }}
              formatter={(v) => format(Number(v))} labelFormatter={(l, p) => `${l} (${p?.[0]?.payload?.n ?? 0} hitters)`} />
            <Bar dataKey={outcome} maxBarSize={24} radius={2}>
              {groups.map((g, i) => (
                <Cell key={g.group} fill={colors[i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
