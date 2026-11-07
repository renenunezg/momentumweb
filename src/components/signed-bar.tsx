import { cn, formatSigned } from "@/lib/utils";

// A zero-centered bar plus its exact signed value. "semantic" colors the bar
// by better or worse and needs a known metric direction; "neutral" is for
// signed gaps that measure disagreement, not quality. `compact` sets the phone
// layout: "text" hides the bar, "fill" stretches it across the cell's free
// width; either way a semantic value's text is colored too.
export function SignedBar({
  value,
  extent,
  tone,
  lowerIsBetter = false,
  digits = 1,
  compact,
  className,
}: {
  value: number | null | undefined;
  extent: number;
  tone: "semantic" | "neutral";
  lowerIsBetter?: boolean;
  digits?: number;
  compact?: "text" | "fill";
  className?: string;
}) {
  const shown = formatSigned(value, digits);
  const rounded = value == null ? 0 : Number(value.toFixed(digits));
  const share = extent > 0 ? Math.min(1, Math.abs(rounded) / extent) * 50 : 0;
  const better = lowerIsBetter ? rounded < 0 : rounded > 0;
  const fill = tone === "neutral" ? "bg-chart-comparison" : better ? "bg-better" : "bg-worse";

  return (
    <span className={cn("inline-flex items-center justify-end gap-2", compact === "fill" && "max-sm:flex max-sm:w-full", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "relative h-3 w-20 shrink-0 sm:w-24",
          compact === "text" && "max-sm:hidden",
          compact === "fill" && "max-sm:w-auto max-sm:min-w-6 max-sm:flex-1",
        )}
      >
        <span className="absolute inset-y-[-3px] left-1/2 w-px bg-rule-strong" />
        {rounded !== 0 && (
          <span
            className={cn("absolute inset-y-0 rounded-[2px]", fill)}
            style={rounded < 0 ? { right: "50%", width: `${share}%` } : { left: "50%", width: `${share}%` }}
          />
        )}
      </span>
      <span
        className={cn(
          "w-11 text-right tabular-nums",
          compact && "max-sm:w-auto",
          compact && tone === "semantic" && rounded !== 0 && (better ? "max-sm:text-positive" : "max-sm:text-negative"),
          value == null && "text-muted-foreground",
        )}
      >
        {shown}
      </span>
    </span>
  );
}
