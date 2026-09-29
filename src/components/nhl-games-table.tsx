import { Fragment } from "react";
import { TeamLogo } from "@/components/team-logo";
import { TableCell, TableRow } from "@/components/ui/table";
import { GamesTableLayout, GameMatchupHeader } from "@/components/games-table-layout";
import { cn, formatNumber, formatOdds, formatPct } from "@/lib/utils";
import { americanToImplied, PROVIDER_NAMES } from "@/lib/nhl";
import type { NhlDecision } from "@/lib/nhl-picks";
import type { NhlLiveGame } from "@/lib/nhl-live";
import type { NhlGameProjection, NhlTeamIdentity } from "@/lib/types";

export type NhlBookPrice = { price: number; provider: string } | null;

export type NhlMatchup = {
  projection: NhlGameProjection;
  home: NhlTeamIdentity | undefined;
  away: NhlTeamIdentity | undefined;
  homeBook: NhlBookPrice;
  awayBook: NhlBookPrice;
  // The latest posted total and its prices, from the same provider.
  bookTotal: { line: number; over: number | null; under: number | null; provider: string } | null;
  moneyline: NhlDecision | null;
  total: NhlDecision | null;
  live: NhlLiveGame | null;
};

const SITE_TIME_ZONE = "America/Los_Angeles";

function startLabel(start: string): string {
  return (
    new Date(start).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: SITE_TIME_ZONE,
    }) + " PT"
  );
}

function providerName(key: string): string {
  return PROVIDER_NAMES[key] ?? key;
}

function TeamRow({
  matchup,
  side,
}: {
  matchup: NhlMatchup;
  side: "home" | "away";
}) {
  const { projection, moneyline, total, live } = matchup;
  const team = side === "home" ? matchup.home : matchup.away;
  const name = side === "home" ? projection.home_team : projection.away_team;
  const lambda = side === "home" ? projection.home_lambda : projection.away_lambda;
  const win = side === "home" ? projection.home_win_prob : projection.away_win_prob;
  const fair = side === "home" ? projection.home_fair_price : projection.away_fair_price;
  const minimum =
    side === "home" ? projection.home_minimum_price : projection.away_minimum_price;
  const book = side === "home" ? matchup.homeBook : matchup.awayBook;
  const edge = book ? win - americanToImplied(book.price) : null;
  const picked = moneyline?.status === "recommended" && moneyline.side === side;
  // A total belongs to the matchup; display it once in the second team's Play cell.
  const totalPicked = side === "home" && total?.status === "recommended";
  const score =
    live && live.state !== "pre"
      ? side === "home"
        ? live.home_score
        : live.away_score
      : null;

  return (
    <TableRow>
      <TableCell className="w-full min-w-40 whitespace-normal">
        <div className="flex items-center gap-2">
          <TeamLogo team={team} name={name} className="h-4 w-4 shrink-0" />
          <span className={cn("font-semibold tracking-wide", picked && "text-positive")}>
            {name}
          </span>
          <span aria-live="polite" className="contents">
            {score != null && (
              <span className="font-semibold tabular-nums">{score}</span>
            )}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatNumber(lambda, 2)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatPct(win)}</TableCell>
      <TableCell
        className={cn(
          "text-right font-semibold tabular-nums",
          edge == null
            ? "text-muted-foreground"
            : edge >= 0.13
              ? "text-positive"
              : edge < 0
                ? "text-negative"
                : "",
        )}
      >
        {edge == null ? "–" : formatPct(edge)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        <span>{formatOdds(fair)}</span>
        <span className="mx-0.5 text-muted-foreground">/</span>
        <span className="text-muted-foreground">{formatOdds(book?.price)}</span>
        <span className="block text-[10px] text-muted-foreground">
          min {formatOdds(minimum)}{book && <> · {providerName(book.provider)}</>}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="grid grid-cols-[4rem_5rem] justify-end gap-3 font-mono text-xs font-medium whitespace-nowrap">
          {picked && moneyline && (
            <div className="col-start-1">
              <span className="text-positive">ML {formatOdds(moneyline.price)}</span>
              <span className="block text-[10px] font-normal text-muted-foreground">
                {moneyline.provider ?? providerName(moneyline.provider_key ?? "")}
              </span>
              <span className="block text-[10px] font-normal text-muted-foreground">
                Kelly {formatPct(moneyline.kelly_fraction)}
              </span>
            </div>
          )}
          {totalPicked && total && (
            <div className="col-start-2">
              <span className="text-accent-amber">
                {total.side === "over" ? "O" : "U"} {formatNumber(total.point, 1)}
              </span>
              <span className="block text-[10px] font-normal text-muted-foreground">Game O/U</span>
              <span className="block text-[10px] font-normal text-muted-foreground">
                {formatOdds(total.price)} · {total.provider ?? providerName(total.provider_key ?? "")}
              </span>
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function NhlGamesTable({ matchups }: { matchups: NhlMatchup[] }) {
  return (
    <GamesTableLayout
      caption="Today's NHL games with model prices, partner-book prices, and live scores"
      projectionLabel="xG"
    >
      {matchups.map((matchup) => {
        const { projection, live, total, bookTotal } = matchup;
        const hasPlay = matchup.moneyline?.status === "recommended" || total?.status === "recommended";
        return (
          <Fragment key={projection.game_id}>
            <GameMatchupHeader
              away={projection.away_team}
              home={projection.home_team}
              hasPlay={hasPlay}
              status={live && live.state !== "pre" && (
                <span className={cn(
                  "text-[10px] uppercase tracking-wider",
                  live.state === "in" ? "text-positive" : "text-muted-foreground",
                )}>
                  {live.detail}
                </span>
              )}
              detail={
                <>
                  Total {formatNumber(projection.model_total, 2)}
                  {bookTotal && (
                    <> · book {formatNumber(bookTotal.line, 1)} ({providerName(bookTotal.provider)} O {formatOdds(bookTotal.over)} / U {formatOdds(bookTotal.under)})</>
                  )}
                  {" · "}{startLabel(projection.start_date)}
                </>
              }
            />
            <TeamRow matchup={matchup} side="away" />
            <TeamRow matchup={matchup} side="home" />
          </Fragment>
        );
      })}
    </GamesTableLayout>
  );
}
