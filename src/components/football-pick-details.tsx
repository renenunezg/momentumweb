"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ChartNoAxesCombined } from "lucide-react";
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
  const probabilityEdge =
    pick.win_probability != null && breakEven != null
      ? (pick.win_probability - breakEven) * 100
      : null;
  const edgeColor =
    probabilityEdge != null && probabilityEdge > 0
      ? "text-positive"
      : "text-foreground";

  return (
    <>
      <div className="space-y-1 pr-9">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Recorded prediction</p>
        <DialogTitle className="font-heading text-2xl">{pickLabel(pick)}</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {pick.away_team} at {pick.home_team}
        </DialogDescription>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-mono font-semibold">{formatOdds(pick.price)}</span>
        <span className="text-muted-foreground">{pick.provider ?? "Bookmaker not recorded"}</span>
        <span className="text-xs text-muted-foreground">Saved at publication</span>
      </div>
      <div className="mt-5 space-y-4 text-sm">
        <section className="rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-semibold">
              <ChartNoAxesCombined className="size-4 text-muted-foreground" aria-hidden="true" />
              Why it qualified
            </h3>
            <span className="rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground">
              {pickReason(pick.reason)}
            </span>
          </div>
          <dl className="my-5 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-muted-foreground">Edge over break-even</dt>
              <dd className={`mt-1 font-mono text-2xl min-[375px]:text-3xl tabular-nums ${edgeColor}`}>
                {probabilityEdge == null ? <span className="text-sm">Not recorded</span> : <>{formatSigned(probabilityEdge)}<span className="ml-1 text-sm">pp</span></>}
              </dd>
            </div>
            <div className="border-l border-border pl-4">
              <dt className="text-xs text-muted-foreground">Expected profit / 1u</dt>
              <dd className={`mt-1 font-mono text-2xl min-[375px]:text-3xl tabular-nums ${pick.expected_value_per_unit != null && pick.expected_value_per_unit > 0 ? "text-positive" : "text-foreground"}`}>
                {pick.expected_value_per_unit == null
                  ? <span className="text-sm">Not recorded</span>
                  : <>{formatSigned(pick.expected_value_per_unit, 3)}<span className="ml-1 text-sm">u</span></>}
              </dd>
            </div>
          </dl>
          <div className="space-y-3">
            {[
              { label: "Model win probability", value: pick.win_probability, color: "bg-positive" },
              { label: "Needed to break even", value: breakEven, color: "bg-accent-amber" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="font-mono font-semibold tabular-nums">{value == null ? "Not recorded" : formatPct(value)}</span>
                </div>
                <div className="relative h-5 overflow-hidden rounded-sm bg-muted" aria-hidden="true">
                  {value != null && <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />}
                  <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-foreground/25" />
                </div>
              </div>
            ))}
            <div className="flex justify-between font-mono text-[10px] text-muted-foreground" aria-hidden="true">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <span>Push chance <strong className="ml-1 font-mono font-medium text-foreground">{pick.push_probability == null ? "Not recorded" : formatPct(pick.push_probability)}</strong></span>
            <span>Break-even adjusted for pushes</span>
          </div>
        </section>
        <section>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">Forecast used for this pick</h3>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3">
              <dt className="text-xs text-muted-foreground">Total points</dt>
              <dd className="mt-1 font-mono text-xl font-semibold">{pick.model_total == null ? "Not recorded" : formatNumber(pick.model_total)}</dd>
            </div>
            <div className="rounded-lg border border-border p-3">
              <dt className="text-xs text-muted-foreground">Winning margin</dt>
              <dd className="mt-1 text-xl font-semibold">{marginLabel}</dd>
            </div>
          </dl>
        </section>
        <p className="text-xs text-muted-foreground">Expected profit is a model estimate, not a guaranteed return.</p>
        <details className="border-t border-border pt-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Forecast details &amp; decision record</summary>
          <p className="mt-3 leading-relaxed">
            Saved forecasts may include market adjustments and stay fixed after publication.
            A game-specific breakdown of ratings, availability, and pace is not published.
            Pushes return the stake.
            Edge is measured in percentage points (pp), not the policy cutoff.
          </p>
          <Link href={`/${league}/methodology`} className="mt-2 inline-flex items-center gap-1 underline underline-offset-4">
            How the {league === "nfl" ? "NFL" : "college football"} model works <ArrowUpRight className="size-3" aria-hidden="true" />
          </Link>
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
