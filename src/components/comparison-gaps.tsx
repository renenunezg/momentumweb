import { useId } from "react";

type ComparisonGap = {
  id: string | number;
  label: string;
  detail: string;
  difference: number | null | undefined;
};

// One symmetric scale for the visible comparison, with exact values in text.
export function ComparisonGaps({ title, description, rows, negativeLabel, positiveLabel, unit, digits = 1 }: {
  title: string;
  description: string;
  rows: ComparisonGap[];
  negativeLabel: string;
  positiveLabel: string;
  unit: string;
  digits?: number;
}) {
  const headingId = useId();
  const available = rows.filter((row): row is ComparisonGap & { difference: number } =>
    row.difference != null && Number.isFinite(row.difference));
  const visible = [...available].sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference) || a.label.localeCompare(b.label)).slice(0, 6);
  const extent = Math.max(1, ...visible.map((row) => Math.abs(row.difference)));
  const signed = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;

  return (
    <section aria-labelledby={headingId} className="space-y-3 border-y border-border py-5">
      <div>
        <h2 id={headingId} className="font-heading text-lg">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No paired values available for this selection.</p>
      ) : (
        <>
          <p className="font-mono text-xs text-muted-foreground">
            {visible.length < available.length ? `Largest ${visible.length} gaps of ${available.length} paired entries` : `${available.length} paired ${available.length === 1 ? "entry" : "entries"}`} · {unit}
          </p>
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground sm:ml-56">
            <span>← {negativeLabel}</span>
            <span className="text-right">{positiveLabel} →</span>
          </div>
          <ul className="space-y-3">
            {visible.map((row) => (
              <li key={row.id} className="grid gap-1.5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{row.label} <span className="font-mono tabular-nums sm:sr-only">({signed(row.difference)} {unit})</span></p>
                  <p className="text-xs text-muted-foreground">{row.detail}</p>
                </div>
                <div className="relative h-6" aria-hidden="true">
                  <div className="absolute inset-x-0 top-1/2 border-t border-border" />
                  <div className="absolute inset-y-0 left-1/2 border-l border-muted-foreground" />
                  <div className={`absolute top-2 h-2 ${row.difference < 0 ? "bg-accent-blue" : "bg-accent-amber"}`}
                    style={{ left: `${row.difference < 0 ? 50 - Math.abs(row.difference) / extent * 38 : 50}%`, width: `${Math.abs(row.difference) / extent * 38}%` }} />
                  <span className={`absolute top-1 hidden font-mono text-xs tabular-nums sm:block ${row.difference < 0 ? "left-0" : "right-0"}`}>{signed(row.difference)}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-center font-mono text-[10px] text-muted-foreground sm:ml-56">0 = agreement · same scale for every row</p>
        </>
      )}
    </section>
  );
}
