import { cn, formatNumber } from "@/lib/utils";

// The two halves of a head-to-head: player A on the left in the primary color,
// player B on the right in blue.

export interface ComparisonMetric {
  label: string;
  values: [string, string];
  // A league rank for each value, set small on the inner side so the figure reads first.
  ranks?: [number | null | undefined, number | null | undefined];
}

function Rank({ place }: { place: number | null | undefined }) {
  return place == null ? null : <span className="text-[11px] font-normal text-muted-foreground">#{place}</span>;
}

export function ComparisonMetrics({ metrics }: { metrics: ComparisonMetric[] }) {
  return (
    <div className="divide-y divide-border border-y border-rule-strong">
      {metrics.map((metric) => (
        <div key={metric.label} className="grid grid-cols-[1fr_1.4fr_1fr] items-center gap-2 py-2 text-sm">
          <span className="flex items-baseline gap-2 font-mono font-semibold text-primary">
            {metric.values[0]}
            <Rank place={metric.ranks?.[0]} />
          </span>
          <span className="text-center text-xs text-muted-foreground">{metric.label}</span>
          <span className="flex items-baseline justify-end gap-2 font-mono font-semibold text-accent-blue">
            <Rank place={metric.ranks?.[1]} />
            {metric.values[1]}
          </span>
        </div>
      ))}
    </div>
  );
}

// Paired bars on the 20 to 80 scale, each growing outward from the center.
export function ComparisonGrades({ grades }: { grades: { label: string; values: [number | null | undefined, number | null | undefined] }[] }) {
  return grades.map(({ label, values }) => (
    <div key={label} className="space-y-1">
      <div className="grid grid-cols-[2rem_1fr_2rem] gap-2 text-xs">
        <span className="font-mono">{formatNumber(values[0], 0)}</span>
        <span className="text-center">{label}</span>
        <span className="text-right font-mono">{formatNumber(values[1], 0)}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {values.map((grade, i) => (
          <div key={i} className={cn("flex h-1.5 bg-grid", i === 0 && "justify-end")}>
            <span
              className={cn("h-full", i === 0 ? "bg-primary" : "bg-accent-blue")}
              style={{ width: `${grade == null ? 0 : Math.max(0, Math.min(100, ((grade - 20) / 60) * 100))}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  ));
}
