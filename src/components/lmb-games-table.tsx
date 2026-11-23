import { Fragment } from "react";
import { GameMatchupHeader } from "@/components/games-table-layout";
import { LmbRunDistribution } from "@/components/lmb-run-distribution";
import { MlbBaseOutState } from "@/components/mlb-base-out-state";
import { PlayerHeadshot } from "@/components/player-headshot";
import { TeamLogo } from "@/components/team-logo";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { inningLabel } from "@/lib/game-status";
import { lmbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { SITE_TIME_ZONE } from "@/lib/site-time";
import {
  TIER_LABELS,
  formatCents,
  lmbTeamLogo,
  lmbTeamName,
  parseStarter,
  type LmbMatchup,
  type LmbPick,
} from "@/lib/lmb";
import type { LmbModelOutputRow } from "@/lib/lmb-types";
import { cn, formatNumber, formatPct, formatSigned } from "@/lib/utils";

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: SITE_TIME_ZONE });

function PickCell({ pick }: { pick: LmbPick }) {
  return (
    <>
      <span className="font-semibold text-primary">{formatCents(pick.price)}</span>
      <span className="block text-xs text-muted-foreground">
        {TIER_LABELS[pick.tier]} &middot; EV {formatSigned(pick.expected_value * 100, 1)}%
      </span>
    </>
  );
}

function Starter({ row }: { row: LmbModelOutputRow }) {
  const starter = parseStarter(row.prediction_context);
  if (!starter) return <span className="mt-1 block text-xs text-muted-foreground">TBD</span>;
  return (
    <span className="mt-1 flex items-center gap-1.5 text-xs">
      <PlayerHeadshot
        name={starter.name}
        src={lmbPlayerHeadshotUrl(starter.id)}
        className="h-6 w-6"
      />
      {starter.name}
    </span>
  );
}

function TeamRow({
  row,
  pick,
  score,
}: {
  row: LmbModelOutputRow;
  pick: LmbPick | null;
  score: number | null;
}) {
  const picked = pick?.team === row.team;
  return (
    <TableRow>
      <TableCell className="w-full min-w-44 whitespace-normal">
        <div className="flex items-center gap-2">
          <TeamLogo team={lmbTeamLogo(row.team)} name={lmbTeamName(row.team)} className="h-4 w-4" />
          <span className={cn("font-semibold tracking-wide", picked && "text-primary")}>{row.team}</span>
          <span aria-live="polite" className="contents">
            {score != null && <span className="font-semibold tabular-nums">{score}</span>}
          </span>
        </div>
        <span className="mt-0.5 block text-xs leading-tight text-muted-foreground">{lmbTeamName(row.team)}</span>
        <Starter row={row} />
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatNumber(row.expected_runs)}
        {row.expected_runs_p10 != null && row.expected_runs_p90 != null && (
          <span className="block text-xs text-muted-foreground">
            {formatNumber(row.expected_runs_p10, 0)}&ndash;{formatNumber(row.expected_runs_p90, 0)}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right font-semibold tabular-nums">{formatPct(row.win_prob)}</TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">{formatPct(row.sim_win_prob)}</TableCell>
      <TableCell className="text-right tabular-nums">
        {formatPct(row.market_prob)}
        <span className="block text-xs text-muted-foreground">
          {row.kalshi_ask != null ? `ask ${formatCents(row.kalshi_ask)}` : "no quote"}
        </span>
      </TableCell>
      <TableCell className="text-right tabular-nums">{picked && <PickCell pick={pick} />}</TableCell>
    </TableRow>
  );
}

function GameStatusLabel({ matchup }: { matchup: LmbMatchup }) {
  const live = matchup.live;
  if (live?.abstract_state === "Final") return <span className="type-eyebrow text-muted-foreground">Final</span>;
  if (live?.abstract_state === "Live") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="type-eyebrow text-primary">
          {inningLabel(live.status, live.current_inning, live.inning_state)}
        </span>
        <MlbBaseOutState bases={live.bases} outs={live.outs} />
      </span>
    );
  }
  if (live?.status && live.status !== "Scheduled" && live.status !== "Pre-Game") {
    return <span className="type-eyebrow text-muted-foreground">{live.status}</span>;
  }
  const projected = [matchup.away, matchup.home].some((row) => row.lineup_source === "projected");
  return projected ? <span className="type-eyebrow text-muted-foreground">Projected lineups</span> : null;
}

export function LmbGamesTable({ matchups }: { matchups: LmbMatchup[] }) {
  return (
    <Table>
      <TableCaption className="sr-only">Today&apos;s LMB games with forecasts, Kalshi prices and live scores</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Team</TableHead>
          <TableHead className="text-right">xR</TableHead>
          <TableHead className="text-right">Win</TableHead>
          <TableHead className="text-right">Sim</TableHead>
          <TableHead className="text-right">Kalshi</TableHead>
          <TableHead className="text-right">Pick</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {matchups.map((matchup) => {
          const live = matchup.live;
          const showScores = live?.abstract_state === "Live" || live?.abstract_state === "Final";
          const written = matchup.home.prediction_updated_at;
          return (
            <Fragment key={matchup.game_pk}>
              <GameMatchupHeader
                away={matchup.away.team}
                home={matchup.home.team}
                hasPlay={matchup.pick != null}
                status={<GameStatusLabel matchup={matchup} />}
                detail={
                  <>
                    {matchup.venue && <>{matchup.venue} &middot; </>}
                    {matchup.start_time && <>{clock(matchup.start_time)} PT &middot; </>}
                    Forecast {matchup.frozen ? "frozen" : "updated"} {clock(written)} PT
                  </>
                }
              />
              <TeamRow row={matchup.away} pick={matchup.pick} score={showScores ? live?.away_score ?? null : null} />
              <TeamRow row={matchup.home} pick={matchup.pick} score={showScores ? live?.home_score ?? null : null} />
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="whitespace-normal pt-0">
                  <LmbRunDistribution away={matchup.away} home={matchup.home} />
                </TableCell>
              </TableRow>
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
