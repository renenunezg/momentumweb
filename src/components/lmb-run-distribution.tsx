"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { MethodologyDistributionChart } from "@/components/methodology-distribution-chart";
import type { LmbModelOutputRow } from "@/lib/lmb-types";

function histogram(value: unknown): number[] {
  return Array.isArray(value) ? value.map(Number) : [];
}

function teamDistribution(row: LmbModelOutputRow) {
  return {
    team: row.team,
    mean: row.expected_runs,
    p10: row.expected_runs_p10 ?? row.expected_runs,
    p50: row.expected_runs_p50 ?? row.expected_runs,
    p90: row.expected_runs_p90 ?? row.expected_runs,
    hist: histogram(row.runs_hist),
  };
}

// The simulated runs for both teams, mounted only when opened so a slate of
// closed games renders no charts.
export function LmbRunDistribution({ away, home }: { away: LmbModelOutputRow; home: LmbModelOutputRow }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="group" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="inline-flex cursor-pointer list-none items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        Run distribution
        <ChevronDown aria-hidden className="size-3.5 transition-transform group-open:rotate-180" />
      </summary>
      {open && (
        <div className="mt-3 max-w-3xl">
          <MethodologyDistributionChart
            date={home.date}
            home={teamDistribution(home)}
            away={teamDistribution(away)}
            homeWinProb={home.win_prob}
            homeWinProbP10={home.win_prob_p10}
            homeWinProbP90={home.win_prob_p90}
            startTimeUtc={home.start_time}
          />
        </div>
      )}
    </details>
  );
}
