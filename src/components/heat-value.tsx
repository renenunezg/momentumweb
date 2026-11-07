import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

// A filled value cell on the shared better/worse scale. Without a fill (a
// missing value) the text renders bare, so a gap never reads as average.
// `compact` tightens the fill to the column on phones so a wide table fits.
export function HeatValue({
  style,
  compact = false,
  className,
  children,
}: {
  style: CSSProperties | undefined;
  compact?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[3.25rem] items-center justify-center rounded-md px-2 py-1 tabular-nums",
        !style && "text-muted-foreground",
        compact && "max-sm:w-full max-sm:min-w-0 max-sm:rounded-sm max-sm:px-0.5 max-sm:py-1",
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}

// Compact fills span their column on phones, so columns sized by header length
// read as uneven bars and the team column keeps whatever is left over. Spread
// `evenColumns` on the table and put EVEN_COLUMN_HEAD on each data column's
// head: on phones the data columns split `share` percent of the width evenly
// and the team column gets the rest, down to its content.
export function evenColumns(count: number, share = 100): CSSProperties {
  return { "--data-column": `${share / count}%` } as CSSProperties;
}
export const EVEN_COLUMN_HEAD = "max-sm:w-(--data-column)";
