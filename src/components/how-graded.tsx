import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

// The method and caveats behind a section, closed by default so a phone shows
// the numbers first. Native details carries the expanded state for screen
// readers. With a lead, the one-line summary and the toggle share a line, so a
// page header spends one row on both.
export function HowGraded({
  children,
  label = "How this is graded",
  lead,
}: {
  children: ReactNode;
  label?: string;
  lead?: ReactNode;
}) {
  return (
    <details className="group max-w-4xl">
      <summary className="cursor-pointer list-none text-sm text-muted-foreground [&::-webkit-details-marker]:hidden">
        {lead && <span>{lead} </span>}
        <span className="inline-flex items-center gap-0.5 whitespace-nowrap font-medium underline-offset-4 hover:text-foreground hover:underline">
          {label}
          <ChevronDown aria-hidden className="size-3.5 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </details>
  );
}
