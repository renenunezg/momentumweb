import type { ReactNode } from "react";

// The method and caveats behind a section, closed by default so a phone shows
// the numbers first. Native details carries the expanded state for screen
// readers.
export function HowGraded({
  children,
  label = "How this is graded",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <details className="max-w-4xl">
      <summary className="cursor-pointer select-none type-label font-medium text-muted-foreground hover:text-foreground">
        {label}
      </summary>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </details>
  );
}
