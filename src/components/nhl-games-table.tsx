import { Fragment } from "react";
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
  const { projection, moneyline, live } = matchup;
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
      <TableCell className="text-right tabular-nums">
        <span>{formatOdds(fair)}</span>
        <span className="block text-[10px] text-muted-foreground">
          min {formatOdds(minimum)}
        </span>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {book ? (
          <>
            <span>{formatOdds(book.price)}</span>
            <span className="block text-[10px] text-muted-foreground">
              {providerName(book.provider)}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">–</span>
        )}
      </TableCell>
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
      <TableCell className="text-right font-mono text-xs whitespace-nowrap">
        {picked && moneyline ? (
          <>
            <span className="text-positive">ML {formatOdds(moneyline.price)}</span>
            <span className="block text-[10px] font-normal text-muted-foreground">
              Kelly {formatPct(moneyline.kelly_fraction)}
            </span>
          </>
        ) : (
          <span className="invisible">-</span>
        )}
      </TableCell>
    </TableRow>
  );
}

// The whole slate as one table: a titled two-row group per game, the total
// and its play in the title row so the team rows carry only their own
// numbers.
export function NhlGamesTable({ matchups }: { matchups: NhlMatchup[] }) {
  return (
    <Table>
      <TableCaption className="sr-only">
        Today&apos;s NHL games with model prices, partner-book prices, and live scores
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Team</TableHead>
          <TableHead className="text-right">xG</TableHead>
          <TableHead className="text-right">Win</TableHead>
          <TableHead className="text-right">Fair</TableHead>
          <TableHead className="text-right">Book</TableHead>
          <TableHead className="text-right">Edge</TableHead>
          <TableHead className="text-right">Play</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {matchups.map((matchup) => {
          const { projection, live, total, bookTotal } = matchup;
          const totalPicked = total?.status === "recommended";
          const hasPlay =
            matchup.moneyline?.status === "recommended" || totalPicked;
          return (
            <Fragment key={projection.game_id}>
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={7}
                  className="whitespace-normal border-t border-border pt-5 pb-1"
                >
                  <div className="sticky left-0 flex w-[calc(100vw-2.5rem)] max-w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-1 md:w-full">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-semibold", hasPlay && "text-positive")}>
                        {projection.away_team} @ {projection.home_team}
                      </span>
                      <span aria-live="polite" className="contents">
                        {live?.state === "post" && (
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {live.detail}
                          </span>
                        )}
                        {live?.state === "in" && (
                          <span className="text-[10px] uppercase tracking-wider text-positive">
                            {live.detail}
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="min-w-0 font-mono text-xs font-normal text-muted-foreground">
                      Total {formatNumber(projection.model_total, 2)}
                      {bookTotal && (
                        <>
                          {" "}
                          · book {formatNumber(bookTotal.line, 1)} (
                          {providerName(bookTotal.provider)} O {formatOdds(bookTotal.over)} / U{" "}
                          {formatOdds(bookTotal.under)})
                        </>
                      )}
                      {totalPicked && total && (
                        <span className="ml-2 text-accent-amber">
                          {total.side === "over" ? "O" : "U"} {formatNumber(total.point, 1)}{" "}
                          {formatOdds(total.price)}
                        </span>
                      )}
                      {" · "}
                      {startLabel(projection.start_date)}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
              <TeamRow matchup={matchup} side="away" />
              <TeamRow matchup={matchup} side="home" />
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
