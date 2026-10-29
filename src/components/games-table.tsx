import { Fragment } from "react";
import { MlbBaseOutState } from "@/components/mlb-base-out-state";
import { MlbLiveProbabilityDialog } from "@/components/mlb-live-probability-dialog";
import { cn, formatNumber, formatOdds, formatPct } from "@/lib/utils";
import type { GameMatchup, ModelOutput } from "@/lib/types";
import { gameStatus } from "@/lib/game-status";
import { TableRow, TableCell } from "@/components/ui/table";
import { GamesTableLayout, GameMatchupHeader } from "@/components/games-table-layout";
import { EvBadge } from "@/components/ev-badge";
import { TeamLogo } from "@/components/team-logo";
import { mlbTeamIdentity } from "@/lib/mlb-teams";

/**
 * The whole slate as one table. Column labels are printed once in the header
 * rather than repeated under every value, and each game is a titled group of
 * two team rows.
 */
function TeamRow({
  prediction,
  score,
}: {
  prediction: ModelOutput;
  score: number | null;
}) {
  const hasEvPlay = prediction.ev_flag !== "No Play";
  const confidence = prediction.ml_confidence;
  const isPositiveEdge = confidence != null && confidence > 0;

  return (
    <TableRow>
      <TableCell className="w-full min-w-40 whitespace-normal">
        <div className="flex items-center gap-2">
          <TeamLogo
            team={mlbTeamIdentity(prediction.team)}
            name={prediction.team}
            className="h-4 w-4 shrink-0"
          />
          <span className={cn("font-semibold tracking-wide", hasEvPlay && "text-primary")}>
            {prediction.team}
          </span>
          <span aria-live="polite" className="contents">
            {score != null && (
              <span className="font-semibold tabular-nums">{score}</span>
            )}
          </span>
        </div>
        <span className="mt-0.5 block font-sans text-xs leading-tight text-muted-foreground">
          {prediction.starter ?? "TBD"}
        </span>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatNumber(prediction.expected_runs)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatPct(prediction.win_prob)}
      </TableCell>
      <TableCell
        className={cn(
          "text-right font-semibold tabular-nums",
          isPositiveEdge
            ? "text-positive"
            : confidence != null
              ? "text-negative"
              : "text-muted-foreground"
        )}
      >
        {formatPct(confidence)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        <span>{formatOdds(prediction.our_odds)}</span>
        <span className="mx-0.5 text-muted-foreground">/</span>
        <span className="text-muted-foreground">
          {formatOdds(prediction.moneyline)}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <EvBadge prediction={prediction} />
      </TableCell>
    </TableRow>
  );
}

const stampTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });

// When the displayed prediction was last written, against first pitch. A
// stamp after the start is shown as such rather than hidden.
function PredictionStamp({ matchup, started }: { matchup: GameMatchup; started: boolean }) {
  const stamps = [matchup.away.prediction_updated_at, matchup.home.prediction_updated_at]
    .filter((s): s is string => s != null)
    .map((s) => Date.parse(s))
    .filter((t) => !Number.isNaN(t));
  if (stamps.length === 0) return null;
  const written = new Date(Math.max(...stamps)).toISOString();
  const start = matchup.start_time ? Date.parse(matchup.start_time) : NaN;
  const late = started && !Number.isNaN(start) && Date.parse(written) > start;
  return (
    <>
      {" "}&middot;{" "}
      {late
        ? <span className="text-amber-600 dark:text-amber-400">Prediction rewritten {stampTime(written)} PT, after first pitch</span>
        : <>Prediction {started ? "frozen" : "updated"} {stampTime(written)} PT</>}
    </>
  );
}

export function GamesTable({ matchups }: { matchups: GameMatchup[] }) {
  return (
    <GamesTableLayout
      caption="Today's games with model predictions and live scores"
      projectionLabel="xR"
    >
      {matchups.map((matchup) => {
        const status = gameStatus(matchup);
        return (
          <Fragment key={matchup.game_pk}>
            <GameMatchupHeader
              away={matchup.away_team}
              home={matchup.home_team}
              hasPlay={status.hasEvPlay}
              status={
                <>
                  {status.isFinal && (
                    <span className="type-eyebrow text-muted-foreground">Final</span>
                  )}
                  {status.isLive && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="type-eyebrow text-primary">{status.liveLabel}</span>
                      <MlbBaseOutState bases={matchup.bases} outs={matchup.outs} />
                    </span>
                  )}
                  {(status.isLive || status.isFinal) && (
                    <MlbLiveProbabilityDialog gamePk={matchup.game_pk} away={matchup.away_team} home={matchup.home_team} />
                  )}
                  {status.lineupsPending && (
                    <span className="type-eyebrow text-muted-foreground">Lineups pending</span>
                  )}
                </>
              }
              detail={<>{matchup.venue && <>{matchup.venue} &middot; </>}{status.startTime}<PredictionStamp matchup={matchup} started={status.isLive || status.isFinal} /></>}
            />
            <TeamRow
              prediction={matchup.away}
              score={status.showScores ? matchup.away_score : null}
            />
            <TeamRow
              prediction={matchup.home}
              score={status.showScores ? matchup.home_score : null}
            />
          </Fragment>
        );
      })}
    </GamesTableLayout>
  );
}
