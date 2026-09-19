"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useVisitorTimeZone } from "@/components/use-visitor-timezone";
import { pickLabel, pickReason, type WeeklyPick } from "@/lib/football-picks";
import type { FootballLeague } from "@/lib/football-slates";
import { breakEvenProbability } from "@/lib/pick-pricing";
import { formatNumber, formatOdds, formatPct, formatSigned } from "@/lib/utils";

export function FootballPickDetails({
  pick,
  league,
  children,
}: {
  pick: WeeklyPick;
  league: FootballLeague;
  children: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger
        aria-label={`View details for ${pickLabel(pick)} in ${pick.away_team} at ${pick.home_team}`}
        className="group flex min-w-0 cursor-pointer flex-col gap-0.5 bg-background px-3 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        {children}
        <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-foreground">
          Why this pick <ArrowUpRight className="size-3" aria-hidden="true" />
        </span>
      </DialogTrigger>
      <DialogContent>
        <PickDetailsContent pick={pick} league={league} />
      </DialogContent>
    </Dialog>
  );
}

function PickDetailsContent({
  pick,
  league,
}: {
  pick: WeeklyPick;
  league: FootballLeague;
}) {
  const timeZone = useVisitorTimeZone("UTC");
  const dateFormat = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const timestamp = (value: string | null) =>
    value ? dateFormat.format(new Date(value)) : "Not recorded";
  const margin = pick.model_home_margin;
  const marginLabel =
    margin == null
      ? "Not recorded"
      : margin === 0
        ? "Even matchup"
        : `${margin > 0 ? pick.home_team : pick.away_team} by ${formatNumber(Math.abs(margin))}`;
  // Include pushes so break-even and win probability use the same scale.
  const breakEven =
    pick.price != null && pick.push_probability != null
      ? breakEvenProbability(pick.price) * (1 - pick.push_probability)
      : null;
  const metrics = [
    ["Model win probability", formatPct(pick.win_probability)],
    ["Push probability", formatPct(pick.push_probability)],
    ["Win probability needed to break even", formatPct(breakEven)],
    [
      "Expected profit per 1 unit",
      pick.expected_value_per_unit == null
        ? "Not recorded"
        : `${formatSigned(pick.expected_value_per_unit, 3)}u`,
    ],
  ];

  return (
    <>
      <div className="space-y-1 pr-9">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Recorded prediction</p>
        <DialogTitle className="font-heading text-2xl">{pickLabel(pick)}</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {pick.away_team} at {pick.home_team}
        </DialogDescription>
      </div>
      <div className="mt-5 space-y-5 text-sm">
        <section className="space-y-2">
          <h3 className="font-semibold">The line and the forecast</h3>
          <p>
            {pick.provider ?? "The bookmaker"} offered {pickLabel(pick)} at {formatOdds(pick.price)}.
            {pick.market !== "h2h" && " The pick's line is the bookmaker's number."}
          </p>
          <dl className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Forecast total used for this pick</dt>
              <dd className="mt-1 font-mono font-semibold">{formatNumber(pick.model_total)} points</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Forecast margin used for this pick</dt>
              <dd className="mt-1 font-semibold">{marginLabel}</dd>
            </div>
          </dl>
          <p className="text-xs leading-relaxed text-muted-foreground">
            These are the forecasts saved with this decision and may include market adjustments.
            They stay fixed after publication.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="font-semibold">Why it qualified</h3>
          <p>Recorded decision: {pickReason(pick.reason).toLowerCase()}.</p>
          <dl className="divide-y divide-border">
            {metrics.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-5 py-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="shrink-0 font-mono font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Break-even uses the recorded odds and allows for pushes, which return the stake.
            Expected profit is the model&apos;s estimate over repeated bets, not a promised return.
          </p>
        </section>
        <section className="space-y-2 border-t border-border pt-4">
          <h3 className="font-semibold">What went into the forecast</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            A game-specific breakdown of ratings, player availability, pace, and their contributions
            has not been published with this pick.
          </p>
          <Link href={`/${league}/methodology`} className="inline-flex items-center gap-1 text-xs underline underline-offset-4">
            How the {league === "nfl" ? "NFL" : "college football"} model works <ArrowUpRight className="size-3" />
          </Link>
        </section>
        <details className="border-t border-border pt-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Decision record</summary>
          <dl className="mt-3 space-y-2 break-words">
            {[
              ["Forecast", timestamp(pick.forecast_as_of)],
              ["Odds captured", timestamp(pick.market_fetched_at)],
              ["Decision", timestamp(pick.decision_at)],
              ["Model", pick.model_version],
              ["Selection policy", pick.policy_version],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd className="text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </>
  );
}
