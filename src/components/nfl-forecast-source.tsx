import Link from "next/link";
import { cn } from "@/lib/utils";

export function NflForecastSource({ source, page }: {
  source: "live" | "backtest";
  page: "history" | "performance";
}) {
  return (
    <nav aria-label="Forecast source" className="flex gap-4 text-sm">
      {(["live", "backtest"] as const).map((value) => (
        <Link key={value} href={`/nfl/${page}?source=${value}`}
          aria-current={source === value ? "page" : undefined}
          className={cn("border-b-2 pb-2", source === value
            ? "border-foreground text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground")}>
          {value === "live" ? "Live season" : "Backtest"}
        </Link>
      ))}
    </nav>
  );
}
