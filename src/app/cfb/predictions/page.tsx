import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { Notice } from "@/components/notice";
import Link from "next/link";
import { LastUpdated } from "@/components/last-updated";
import { WeeklyFootballPredictions } from "@/components/weekly-football-predictions";
import { fetchCfbWeeklyPredictions, weeklyGames } from "@/lib/cfb-picks";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "This Week's College Football Predictions",
  description:
    "This week's college football spread, total, and moneyline predictions, grouped by kickoff slate with recorded lines, odds, and bookmakers.",
};

export default async function PredictionsPage() {
  const { season, week, schedule, decisions, unavailable } =
    await fetchCfbWeeklyPredictions();
  const updated = decisions.reduce<string | null>(
    (latest, row) =>
      !latest || row.decision_at > latest ? row.decision_at : latest,
    null,
  );

  return (
    <PageShell>
      <PageHeader>
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {season != null ? `${season} · Week ${week}` : "Current week"}
          </p>
          <PageTitle>
            College Football Predictions
          </PageTitle>
          <PageDescription>
            This week&apos;s predictions, organized by kickoff slate.
          </PageDescription>
        </div>
        <div className="space-y-2 text-sm sm:text-right">
          <Link href="/cfb/history" className="underline underline-offset-4">
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
      ) : season == null ? (
        <Notice role="status">
          No week has been published yet.
        </Notice>
      ) : decisions.length === 0 ? (
        <Notice role="status">
          Week {week} projections are published, but its predictions have not
          been recorded yet. Decisions are published once frozen prices are
          available.
        </Notice>
      ) : (
        <WeeklyFootballPredictions
          league="cfb"
          games={weeklyGames(schedule, decisions)}
        />
      )}
      <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
        <p className="max-w-2xl">
          Lines, odds, and bookmakers stay fixed at publication. These are
          recorded selections, not live prices. Each prediction is tracked at 1
          unit.
        </p>
        <Link href="/cfb/history" className="underline underline-offset-4">
          Results and No Play decisions
        </Link>
      </div>
    </PageShell>
  );
}
