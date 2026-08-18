import { Fragment } from "react";
import {
  cn,
  formatRuns,
  formatPct,
  formatOdds,
  formatConfidence,
} from "@/lib/utils";
import type { GameMatchup, ModelOutput } from "@/lib/types";
import { gameStatus } from "@/lib/game-status";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
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
          {score != null && (
            <span className="font-semibold tabular-nums">{score}</span>
          )}
        </div>
        <span className="mt-0.5 block font-sans text-xs leading-tight text-muted-foreground">
          {prediction.starter ?? "TBD"}
        </span>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatRuns(prediction.expected_runs)}
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
        {formatConfidence(confidence)}
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Team</TableHead>
          <TableHead className="text-right">xR</TableHead>
          <TableHead className="text-right">Win</TableHead>
          <TableHead className="text-right">Edge</TableHead>
          <TableHead className="text-right">Model / Book</TableHead>
          <TableHead className="text-right">Play</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {matchups.map((matchup) => {
          const status = gameStatus(matchup);
          return (
            <Fragment key={matchup.game_pk}>
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={6}
                  className="whitespace-normal border-t border-border pt-5 pb-1"
                >
                  {/* On narrow screens the header block is pinned to the left
                      edge and sized to the visible area (backing out the page
                      gutters and this cell's left padding) so the matchup and
                      venue stay readable while the numeric columns scroll.
                      From md up the table fits, so it spans the full row. */}
                  <div className="sticky left-0 flex w-[calc(100vw-2.5rem)] max-w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-1 md:w-full">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          status.hasEvPlay && "text-positive"
                        )}
                      >
                        {matchup.away_team} @ {matchup.home_team}
                      </span>
                      {status.isFinal && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Final
                        </span>
                      )}
                      {status.isLive && (
                        <span className="text-[10px] uppercase tracking-wider text-positive">
                          {status.liveLabel}
                        </span>
                      )}
                      {status.lineupsPending && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Lineups pending
                        </span>
                      )}
                    </div>
                    <span className="min-w-0 text-xs font-normal text-muted-foreground">
                      {matchup.venue && <>{matchup.venue} &middot; </>}
                      {status.startTime}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
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
      </TableBody>
    </Table>
  );
}
