import type { Metadata } from "next";
import { Notice } from "@/components/notice";
import Link from "next/link";
import { LastUpdated } from "@/components/last-updated";
import { WeeklyFootballPredictions } from "@/components/weekly-football-predictions";
import { teamBadge, weeklyGames, type WeeklyGame } from "@/lib/football-picks";
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
  // Decisions carry team names; identity rows are keyed by abbreviation.
  const byName = new Map(
    [...teams.values()].map((team) => [team.team, teamBadge(team)]),
  );
  const schedule = new Map<string, Omit<WeeklyGame, "rows">>();
  for (const row of decisions)
    if (!schedule.has(row.game_id))
      schedule.set(row.game_id, {
        game_id: row.game_id,
        start_date: row.start_date,
        home_team: row.home_team,
        away_team: row.away_team,
        home: byName.get(row.home_team) ?? null,
        away: byName.get(row.away_team) ?? null,
      });

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
        <Notice role="status">
          Weekly predictions are temporarily unavailable. Please try again
          shortly.
        </Notice>
      ) : decisions.length ? (
        <WeeklyFootballPredictions
          league="nfl"
          games={weeklyGames([...schedule.values()], decisions)}
        />
      ) : (
        <Notice role="status">
          This week&apos;s predictions have not been published yet.
        </Notice>
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
