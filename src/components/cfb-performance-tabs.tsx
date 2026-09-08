import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function CfbPerformanceTabs({
  active,
  query,
  children,
}: {
  active: "picks" | "accuracy";
  query: string;
  children: ReactNode;
}) {
  return (
    <>
      <nav
        aria-label="Performance view"
        className="flex gap-1 border-b border-border"
      >
        {[
          {
            key: "picks",
            label: "Recommendations",
            href: `/cfb/performance?${query}`,
          },
          {
            key: "accuracy",
            label: "Forecast accuracy",
            href: `/cfb/performance?${query}&view=accuracy`,
          },
        ].map((view) => (
          <Link
            key={view.key}
            href={view.href}
            aria-current={active === view.key ? "page" : undefined}
            className={cn(
              "border-b-2 px-4 py-2 text-sm",
              active === view.key
                ? "border-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {view.label}
          </Link>
        ))}
      </nav>
      {children}
    </>
  );
}
