import { cn, describeGap, formatNumber, formatSigned } from "@/lib/utils";

export interface RankComparisonRow {
  label: string;
  grade: number;
  baseline: number;
  diff: number;
  lo: number | null;
  hi: number | null;
}

// Each position's grade rank correlation (filled circle) beside the baseline's
// (hollow square) on one axis. Only a gap whose interval clears zero colors
// its connector, so a within-noise lead never reads as a win.
export function RankComparisonChart({
  rows,
  baselineLabel,
}: {
  rows: RankComparisonRow[];
  baselineLabel: string;
}) {
  if (rows.length === 0) return null;
  const values = rows.flatMap((row) => [row.grade, row.baseline]);
  const min = Math.min(0, Math.floor(Math.min(...values) * 5) / 5);
  const max = Math.max(0.2, Math.ceil(Math.max(...values) * 5) / 5);
  const at = (value: number) => `${((value - min) / (max - min)) * 100}%`;
  const ticks = Array.from({ length: Math.round((max - min) / 0.2) + 1 }, (_, i) => min + i * 0.2);
  return (
    <figure className="space-y-3">
      <figcaption className="flex flex-wrap gap-x-5 gap-y-1 type-meta text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-chart-primary" />
          Grade
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 border-2 border-chart-comparison bg-background" />
          {baselineLabel}
        </span>
        <span>Rank correlation with later production: 0 is no better than chance, 1 is perfect.</span>
      </figcaption>
      <ul className="space-y-1">
        {rows.map((row) => {
          const { verdict } = describeGap(row.diff, row.lo, row.hi);
          const clear = verdict === "clear of zero" || verdict === "behind, clear of zero";
          const left = Math.min(row.grade, row.baseline);
          const right = Math.max(row.grade, row.baseline);
          return (
            <li
              key={row.label}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)_5.5rem] items-center gap-3"
              aria-label={`${row.label}: grade ${formatNumber(row.grade, 2)}, ${baselineLabel.toLowerCase()} ${formatNumber(row.baseline, 2)}, gap ${formatSigned(row.diff, 2)}${verdict ? `, ${verdict}` : ""}`}
            >
              <span className="type-label font-semibold">{row.label}</span>
              <span aria-hidden="true" className="relative h-6">
                {ticks.map((tick) => (
                  <span key={tick} className="absolute inset-y-0 w-px bg-grid" style={{ left: at(tick) }} />
                ))}
                <span
                  className={cn(
                    "absolute top-1/2 h-0.5 -translate-y-1/2",
                    !clear ? "bg-rule-strong" : row.diff > 0 ? "bg-better" : "bg-worse",
                  )}
                  style={{ left: at(left), width: `calc(${at(right)} - ${at(left)})` }}
                />
                <span
                  className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 border-2 border-chart-comparison bg-background"
                  style={{ left: at(row.baseline) }}
                />
                <span
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-primary"
                  style={{ left: at(row.grade) }}
                />
              </span>
              <span className={cn("text-right type-label tabular-nums", !clear && "text-muted-foreground")}>
                {formatSigned(row.diff, 2)}
                {clear && <span className="block type-meta text-muted-foreground">clear of zero</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <div aria-hidden="true" className="grid grid-cols-[2.5rem_minmax(0,1fr)_5.5rem] gap-3">
        <span />
        <span className="relative h-4">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute -translate-x-1/2 type-meta tabular-nums text-muted-foreground"
              style={{ left: at(tick) }}
            >
              {formatNumber(tick, 1)}
            </span>
          ))}
        </span>
        <span className="text-right type-meta text-muted-foreground">Gap</span>
      </div>
    </figure>
  );
}
