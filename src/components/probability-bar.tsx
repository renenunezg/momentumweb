import { cn, formatPct } from "@/lib/utils";

// A share or probability as a filled track plus its exact value. `domain` is
// the value a full track represents (1 for a plain probability); comparable
// rows must share it.
export function ProbabilityBar({
  value,
  domain = 1,
  digits = 0,
  className,
}: {
  value: number | null | undefined;
  domain?: number;
  digits?: number;
  className?: string;
}) {
  const width = value == null || domain <= 0 ? 0 : Math.min(1, Math.max(0, value / domain)) * 100;
  return (
    <span className={cn("inline-flex items-center justify-end gap-2", className)}>
      <span aria-hidden="true" className="h-2 w-10 shrink-0 overflow-hidden rounded-full bg-muted sm:w-20">
        <span className="block h-full rounded-full bg-chart-primary" style={{ width: `${width}%` }} />
      </span>
      <span className={cn("w-11 text-right tabular-nums", value == null && "text-muted-foreground")}>
        {formatPct(value, digits)}
      </span>
    </span>
  );
}
