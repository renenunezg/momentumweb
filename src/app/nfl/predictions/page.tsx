import { PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { Notice } from "@/components/notice";
import { HowGraded } from "@/components/how-graded";
import Link from "next/link";
import { LastUpdated } from "@/components/last-updated";
import { WeeklyFootballPredictions } from "@/components/weekly-football-predictions";
import { keepLastGood } from "@/lib/keep-last-good";
import { teamBadge, weeklyGames, WEEKLY_PICK_COLUMNS, type WeeklyGame } from "@/lib/football-picks";
import { fetchTeams } from "@/lib/nfl";
import { supabaseNfl } from "@/lib/supabase";

// Every read here is expired by the revalidation webhook when its table is
// published, and nothing on the page depends on the clock, so the week is only
// a backstop.
export const revalidate = 604800;
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
        .select(WEEKLY_PICK_COLUMNS)
        .eq("season", latest.season)
        .eq("week", latest.week)
        .order("start_date", { ascending: true })
        .order("game_id", { ascending: true })
        .order("market", { ascending: true })
    : null;
  const unavailable = Boolean(latestResult.error || result?.error);
  keepLastGood("NFL predictions", unavailable);
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
    <PageShell>
      <PageHeader>
        <div>
          <p className="type-eyebrow mb-2 text-muted-foreground">
            {latest ? `${latest.season} · Week ${latest.week}` : "Current week"}
          </p>
          <PageTitle>
            NFL Predictions
          </PageTitle>
          <div className="mt-heading">
            <HowGraded label="How this works"
              lead={<>This week&apos;s predictions, organized by kickoff slate.</>}
            >
              <p>
                Lines, odds, and bookmakers stay fixed at publication. Each
                prediction is tracked at 1 unit.
              </p>
              <p>
                Model probability is the model&apos;s chance that the selected side
                wins, with pushes listed separately.
              </p>
            </HowGraded>
          </div>
        </div>
        <div className="space-y-2 text-sm sm:text-right">
          <Link href="/nfl/history?view=picks" className="underline underline-offset-4">
            Full history &rarr;
          </Link>
          {updated && (
            <LastUpdated
              timestamp={updated}
              schedule="Latest recorded decisions"
            />
          )}
        </div>
      </PageHeader>
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
      <div className="border-t border-border pt-4 text-xs text-muted-foreground">
        <Link href="/nfl/history?view=picks" className="underline underline-offset-4">
          Results and No Play decisions
        </Link>
      </div>
    </PageShell>
  );
}
