import { NavigationLink as Link } from "@/components/navigation-link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PickSport } from "@/lib/football-picks";

export function FootballPerformanceTabs({
  active,
  query,
  children,
  sport = "cfb",
}: {
  active: "picks" | "accuracy";
  query: string;
  children: ReactNode;
  sport?: PickSport;
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
            href: `/${sport}/performance?${query}`,
          },
          {
            key: "accuracy",
            label: "Forecast accuracy",
            href: `/${sport}/performance?${query}&view=accuracy`,
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
