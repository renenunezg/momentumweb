import type { Metadata } from "next";
import Link from "next/link";
import { LastUpdated } from "@/components/last-updated";
import { WeeklyFootballPredictions } from "@/components/weekly-football-predictions";
import { fetchTeams } from "@/lib/nfl";
import { supabaseNfl } from "@/lib/supabase";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "This Week's NFL Predictions",
  description:
    "This week's NFL predictions, grouped by game with recorded lines, odds, and bookmakers.",
};

export default async function PredictionsPage() {
  const [teams, latestResult] = await Promise.all([
    fetchTeams(),
    supabaseNfl
      .from("game_projections")
      .select("season, week")
      .order("season", { ascending: false })
      .order("week", { ascending: false })
      .limit(1),
  ]);
  const latest = latestResult.data?.[0];
  const result = latest
    ? await supabaseNfl
        .from("recommendations")
        .select(
          "game_id,market,season,week,start_date,home_team,away_team,status,selection,point,price,provider,outcome,profit_units,decision_at,win_probability,push_probability",
        )
        .eq("season", latest.season)
        .eq("week", latest.week)
        .order("start_date", { ascending: true })
        .order("game_id", { ascending: true })
        .order("market", { ascending: true })
    : null;
  const unavailable = Boolean(latestResult.error || result?.error);
  const decisions = result?.data ?? [];
  const updated = decisions.reduce<string | null>(
    (latest, row) =>
      !latest || row.decision_at > latest ? row.decision_at : latest,
    null,
  );

  return (
    <main
      id="main"
      className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 py-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {latest ? `${latest.season} · Week ${latest.week}` : "Current week"}
          </p>
          <h1 className="font-heading text-3xl tracking-tight">
            NFL Predictions
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This week&apos;s predictions, organized by kickoff slate.
          </p>
        </div>
        <div className="space-y-2 text-sm sm:text-right">
          <Link href="/nfl/history" className="underline underline-offset-4">
            Full history &rarr;
          </Link>
          {updated && (
            <LastUpdated
              timestamp={updated}
              schedule="Latest recorded decisions"
            />
          )}
        </div>
      </div>
      {unavailable ? (
        <p
          role="status"
          className="rounded-lg border border-border bg-muted/30 p-5 text-sm"
        >
          Weekly predictions are temporarily unavailable. Please try again
          shortly.
        </p>
      ) : decisions.length ? (
        <WeeklyFootballPredictions
          decisions={decisions}
          teams={Object.fromEntries(
            [...teams.values()].map((team) => [team.team, team]),
          )}
        />
      ) : (
        <p
          role="status"
          className="rounded-lg border border-border bg-muted/30 p-5 text-sm"
        >
          This week&apos;s predictions have not been published yet.
        </p>
      )}
      <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
        <p className="max-w-2xl">
          Lines, odds, and bookmakers stay fixed at publication. These are
          recorded selections, not live prices. Each prediction is tracked at 1
          unit.
        </p>
        <Link href="/nfl/history" className="underline underline-offset-4">
          Results and No Play decisions
        </Link>
      </div>
    </main>
  );
}
