import { Fragment } from "react";
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
          <span className={cn("font-semibold tracking-wide", hasEvPlay && "text-positive")}>
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

export function GamesTable({ matchups }: { matchups: GameMatchup[] }) {
  return (
    <GamesTableLayout
      caption="Today's games with model picks and live scores"
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
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Final</span>
                  )}
                  {status.isLive && (
                    <span className="text-[10px] uppercase tracking-wider text-positive">{status.liveLabel}</span>
                  )}
                  {status.lineupsPending && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Lineups pending</span>
                  )}
                </>
              }
              detail={<>{matchup.venue && <>{matchup.venue} &middot; </>}{status.startTime}</>}
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
