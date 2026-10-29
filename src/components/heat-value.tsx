import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

// A filled value cell on the shared better/worse scale. Without a fill (a
// missing value) the text renders bare, so a gap never reads as average.
export function HeatValue({
  style,
  className,
  children,
}: {
  style: CSSProperties | undefined;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[3.25rem] items-center justify-center rounded-md px-2 py-1 tabular-nums",
        !style && "text-muted-foreground",
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}
