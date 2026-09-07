import { fetchHeismanTracker, fetchTeams } from "@/lib/cfb";
import { formatNumber, formatPct } from "@/lib/utils";
import { KpiCard } from "@/components/kpi-card";
import { LastUpdated } from "@/components/last-updated";
import HeismanTracker from "@/components/heisman-tracker";

export const revalidate = 300;

export default async function HeismanPage() {
  const [tracker, teams] = await Promise.all([fetchHeismanTracker(), fetchTeams()]);
  const { season, week, values, board, history, meta } = tracker;

  if (season == null || values.length === 0) {
    return (
      <main id="main" className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8">
        <h1 className="font-heading text-2xl tracking-tight">Heisman Tracker</h1>
        <p className="mt-4 text-muted-foreground">
          No player value snapshots have been published yet. The tracker
          appears once the first week of the season is final.
        </p>
      </main>
    );
  }

  const valueLeader = values[0];
  const favorite = board[0] ?? null;
  const favoriteValueRank = favorite?.value_rank ?? null;
  const seasonsValidated = history.length;
  const winnersHit = history.filter((h) => h.winner_hit).length;

  return (
    <main id="main" className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Heisman Tracker</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {season} · Through week {week}
          </p>
        </div>
        <LastUpdated
          timestamp={tracker.asOf}
          schedule="Updates after each Monday refresh"
        />
      </div>

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Two boards that are meant to disagree. The value board measures what
        a player&apos;s plays were worth in points above a replacement at his
        position, adjusted for every defense and offense he faced. The Heisman
        board forecasts how the voters will actually rank the candidates, fit
        on sixteen years of ballots. The gap between them is the story.
      </p>

      <div className="grid grid-cols-2 gap-4 border-y border-rule-strong py-4 sm:grid-cols-4">
        <KpiCard
          label="Value leader"
          value={valueLeader.athlete_name}
          sub={`${valueLeader.team} · ${formatNumber(valueLeader.value_above_replacement, 1)} pts above replacement`}
          tooltip="Highest opponent-adjusted EPA above a positional replacement through the latest completed week."
        />
        <KpiCard
          label="Voter favorite"
          value={favorite?.athlete_name ?? "–"}
          sub={
            favorite
              ? `${favorite.team} · ${formatPct(favorite.predicted_share, 0)} of the vote`
              : "board not built yet"
          }
          tooltip="Candidate with the highest predicted vote share from the ballot model, using stats to date, team record, and poll rank."
        />
        <KpiCard
          label="Favorite's value rank"
          value={favoriteValueRank != null ? `#${favoriteValueRank}` : "–"}
          sub="on the value board"
          tooltip="Where the voter favorite sits on the value board. A low number means the model and the voters agree."
        />
        <KpiCard
          label="Ballot model backtest"
          value={seasonsValidated > 0 ? `${winnersHit} of ${seasonsValidated}` : "–"}
          sub="winners called, leave-one-season-out"
          tooltip="Each past season is scored by a model fit on every other season. The current season is never in the training set."
        />
      </div>

      <HeismanTracker
        season={season}
        week={week ?? 0}
        boardWeek={tracker.boardWeek}
        values={values}
        trajectories={tracker.trajectories}
        board={board}
        history={history}
        meta={meta}
        teams={[...teams.values()]}
      />
    </main>
  );
}
