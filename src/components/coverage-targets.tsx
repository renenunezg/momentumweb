import type { ReactNode } from "react";
import { formatPct } from "@/lib/utils";

// Observed coverage of each nominal interval as a dot against its target tick.
// Closer to the tick is better; neither side earns a color.
export function CoverageTargets({
  rows,
  note,
}: {
  rows: { nominal: number; observed: number | null | undefined }[];
  note: ReactNode;
}) {
  return (
    <div className="max-w-xl space-y-3">
      {rows.map((row) => (
        <div key={row.nominal} className="grid grid-cols-[3rem_minmax(0,1fr)_3.5rem] items-center gap-3">
          <span className="type-label font-semibold tabular-nums">{formatPct(row.nominal, 0)}</span>
          <span aria-hidden="true" className="relative h-4">
            <span className="absolute inset-x-0 top-1/2 h-px bg-grid" />
            <span
              className="absolute top-0 h-4 w-0 border-l border-dashed border-chart-comparison"
              style={{ left: `${row.nominal * 100}%` }}
            />
            {row.observed != null && (
              <span
                className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-primary"
                style={{ left: `${row.observed * 100}%` }}
              />
            )}
          </span>
          <span className="text-right type-label tabular-nums">{formatPct(row.observed, 0)}</span>
        </div>
      ))}
      <p className="type-meta text-muted-foreground">{note}</p>
    </div>
  );
}
