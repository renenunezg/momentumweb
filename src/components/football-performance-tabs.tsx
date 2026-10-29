import { NavigationLink as Link } from "@/components/navigation-link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TAB_ITEM, TAB_LIST, TAB_OFF, TAB_ON } from "@/lib/tab-styles";
import type { PickSport } from "@/lib/football-picks";

export function FootballPerformanceTabs({
  active,
  query,
  children,
  sport = "cfb",
}: {
  active: "picks" | "accuracy" | "players";
  query: string;
  children: ReactNode;
  sport?: PickSport;
}) {
  return (
    <>
      <nav
        aria-label="Performance view"
        className={TAB_LIST}
      >
        {[
          {
            key: "accuracy",
            label: "Forecast accuracy",
            href: `/${sport}/performance?${query}`,
          },
          {
            key: "picks",
            label: "Prediction results",
            href: `/${sport}/performance?${query}&view=picks`,
          },
          {
            key: "players",
            label: "Player models",
            href: `/${sport}/performance?${query}&view=players`,
          },
        ].map((view) => (
          <Link
            key={view.key}
            href={view.href}
            aria-current={active === view.key ? "page" : undefined}
            className={cn(TAB_ITEM, active === view.key ? TAB_ON : TAB_OFF)}
          >
            {view.label}
          </Link>
        ))}
      </nav>
      {children}
    </>
  );
}
