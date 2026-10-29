import type { ReactNode } from "react";
import { cn, formatSigned } from "@/lib/utils";
import type { CarryPuzzle, PositionGap, SystemComparison } from "@/lib/home-research.server";

// Dot plots are drawn in HTML rather than a scaled SVG so the labels keep
// their type size on a phone.

// At most four intervals, so tick labels stay apart in a phone-width track.
function scale(values: number[], pad: number, minStep: number) {
  let step = minStep;
  let lo = 0;
  let hi = 0;
  for (;;) {
    lo = Math.floor((Math.min(...values) - pad) / step) * step;
    hi = Math.ceil((Math.max(...values) + pad) / step) * step;
    if ((hi - lo) / step <= 4.0001) break;
    step *= 2;
  }
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Number(t.toFixed(4)));
  return { at: (v: number) => ((v - lo) / (hi - lo)) * 100, ticks };
}

function Gridlines({ ticks, at, zero }: { ticks: number[]; at: (v: number) => number; zero?: boolean }) {
  return ticks.map((t) => (
    <span
      key={t}
      aria-hidden="true"
      className={cn("absolute inset-y-0 w-px", zero && t === 0 ? "bg-rule-strong" : "bg-border")}
      style={{ left: `${at(t)}%` }}
    />
  ));
}

function Axis({ ticks, at, format }: { ticks: number[]; at: (v: number) => number; format: (v: number) => string }) {
  return (
    <span aria-hidden="true" className="relative block h-5">
      {ticks.map((t, i) => (
        <span
          key={t}
          className={cn(
            "absolute top-1 type-meta tabular-nums text-muted-foreground",
            i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2",
          )}
          style={{ left: `${at(t)}%` }}
        >
          {format(t)}
        </span>
      ))}
    </span>
  );
}

const Square = ({ left }: { left: number }) => (
  <span
    aria-hidden="true"
    className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 border-2 border-chart-comparison bg-background"
    style={{ left: `${left}%` }}
  />
);

const Dot = ({ left, filled = true }: { left: number; filled?: boolean }) => (
  <span
    aria-hidden="true"
    className={cn(
      "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
      filled ? "border-chart-primary bg-chart-primary" : "border-chart-comparison bg-background",
    )}
    style={{ left: `${left}%` }}
  />
);

const ROW = "grid grid-cols-[4.5rem_minmax(0,1fr)_4.75rem] items-stretch gap-x-3 sm:grid-cols-[5.5rem_minmax(0,1fr)_5.5rem]";

function Figure({ n, caption, children }: { n: number; caption: ReactNode; children: ReactNode }) {
  return (
    <figure className="min-w-0">
      {children}
      <figcaption className="mt-3 type-meta text-muted-foreground">
        <span className="font-semibold text-foreground">Figure {n}.</span> {caption}
      </figcaption>
    </figure>
  );
}

export function SystemComparisonFigure({ rows, n, caption }: { rows: SystemComparison[]; n: number; caption: ReactNode }) {
  const { at, ticks } = scale(rows.flatMap((r) => [r.grade, r.benchmark]), 0.01, 0.02);
  return (
    <Figure n={n} caption={caption}>
      <div className={cn(ROW, "mb-2 type-meta text-muted-foreground")} aria-hidden="true">
        <span />
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-chart-primary" />Grade</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 border-2 border-chart-comparison" />System</span>
        </span>
        <span className="text-right">Difference</span>
      </div>
      {rows.map((r) => (
        <div key={r.system} className={ROW}>
          <span className="self-center type-label font-semibold">{r.system}</span>
          <span className="relative h-12">
            <Gridlines ticks={ticks} at={at} />
            <span
              aria-hidden="true"
              className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-rule-strong"
              style={{ left: `${Math.min(at(r.grade), at(r.benchmark))}%`, width: `${Math.abs(at(r.grade) - at(r.benchmark))}%` }}
            />
            <Square left={at(r.benchmark)} />
            <Dot left={at(r.grade)} />
            <span className="sr-only">
              Grade {r.grade.toFixed(2)}, {r.system} {r.benchmark.toFixed(2)}.
            </span>
          </span>
          <span className="self-center text-right">
            <span className="block type-label font-semibold tabular-nums">{formatSigned(r.diff, 2)}</span>
            <span className="block type-meta tabular-nums text-muted-foreground">
              {formatSigned(r.ci[0], 2)} to {formatSigned(r.ci[1], 2)}
            </span>
          </span>
        </div>
      ))}
      <div className={ROW}>
        <span />
        <Axis ticks={ticks} at={at} format={(v) => v.toFixed(2)} />
        <span />
      </div>
    </Figure>
  );
}

// One position per row: the difference in rank correlation and its 95%
// interval. A filled point is a difference whose interval clears zero.
export function PositionGapFigure({ rows }: { rows: PositionGap[] }) {
  const { at, ticks } = scale(rows.flatMap((r) => [r.diff, ...(r.ci ?? []), 0]), 0.01, 0.05);
  return (
    <div>
      {rows.map((r) => {
        const clear = r.ci != null && (r.ci[0] > 0 || r.ci[1] < 0);
        return (
          <div key={r.position} className={ROW}>
            <span className="self-center type-label font-semibold">{r.position}</span>
            <span className="relative h-8">
              <Gridlines ticks={ticks.filter((t) => t === 0)} at={at} zero />
              {r.ci && (
                <span
                  aria-hidden="true"
                  className={cn("absolute top-1/2 h-0.5 -translate-y-1/2", clear ? "bg-chart-primary" : "bg-chart-comparison")}
                  style={{ left: `${at(r.ci[0])}%`, width: `${at(r.ci[1]) - at(r.ci[0])}%` }}
                />
              )}
              <Dot left={at(r.diff)} filled={clear} />
            </span>
            <span className="self-center text-right">
              <span className="type-label font-semibold tabular-nums">{formatSigned(r.diff, 2)}</span>
              {!r.ci && <span className="block type-meta text-muted-foreground">no interval</span>}
            </span>
          </div>
        );
      })}
      <div className={ROW}>
        <span />
        <Axis ticks={ticks} at={at} format={(v) => (v === 0 ? "0" : formatSigned(v, 2))} />
        <span />
      </div>
    </div>
  );
}

// Two fly balls off the bat at nearly the same speed and angle, drawn to scale
// along the ground. The flight paths are schematic; the distances are measured.
export function CarryFigure({ puzzle }: { puzzle: CarryPuzzle }) {
  const W = 360;
  const H = 170;
  const pad = { l: 14, r: 18, t: 16, b: 34 };
  const maxFt = Math.ceil(puzzle.long.distance / 100) * 100;
  const x = (ft: number) => pad.l + (ft / maxFt) * (W - pad.l - pad.r);
  const y = (ft: number) => H - pad.b - (ft / 110) * (H - pad.t - pad.b);
  const arc = (distance: number) => {
    const apex = distance * 0.17;
    const peak = distance * 0.58;
    return `M${x(0)},${y(3)} C${x(peak * 0.45)},${y(apex * 1.55)} ${x(peak + (distance - peak) * 0.55)},${y(apex * 1.25)} ${x(distance)},${y(0)}`;
  };
  const ticks = Array.from({ length: maxFt / 100 + 1 }, (_, i) => i * 100);
  const { long, short } = puzzle;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img"
      aria-label={`${long.name}'s fly ball travelled ${long.distance} feet and ${short.name}'s ${short.distance} feet.`}>
      <line x1={x(0)} x2={x(maxFt)} y1={y(0)} y2={y(0)} className="stroke-rule-strong" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={y(0)} y2={y(0) + 5} className="stroke-rule-strong" />
          <text x={x(t)} y={y(0) + 19} textAnchor={t === 0 ? "start" : t === maxFt ? "end" : "middle"} className="fill-muted-foreground text-[11px]">
            {t} ft
          </text>
        </g>
      ))}
      <path d={arc(short.distance)} fill="none" strokeWidth={2.5} strokeDasharray="6 5" className="stroke-chart-comparison" />
      <path d={arc(long.distance)} fill="none" strokeWidth={2.5} className="stroke-chart-primary" />
      <rect x={x(short.distance) - 5} y={y(0) - 5} width={10} height={10} strokeWidth={2} className="fill-background stroke-chart-comparison" />
      <circle cx={x(long.distance)} cy={y(0)} r={5.5} className="fill-chart-primary" />
      <text x={x(short.distance) - 9} y={y(0) - 7} textAnchor="end" className="fill-muted-foreground text-[13px] font-semibold">
        {short.distance} ft
      </text>
      <text x={x(long.distance) - 9} y={y(0) - 7} textAnchor="end" className="fill-chart-primary text-[13px] font-semibold">
        {long.distance} ft
      </text>
    </svg>
  );
}
