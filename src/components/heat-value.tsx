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
