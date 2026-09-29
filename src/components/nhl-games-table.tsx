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
  bookTotal: number | null;
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
  const picked = moneyline?.status === "recommended" && moneyline.side === side;
  // The displayed pick must use its recorded price and edge, even if a newer
  // quote exists or the current feed cannot pass freshness verification.
  const price = picked ? moneyline.price : book?.price;
  const edge = picked
    ? moneyline.probability_edge
    : book ? win - americanToImplied(book.price) : null;
  const provider = picked
    ? moneyline.provider ?? providerName(moneyline.provider_key ?? "")
    : book ? providerName(book.provider) : null;
  const totalPicked = total?.status === "recommended";
  const score =
    live && live.state !== "pre"
      ? side === "home"
        ? live.home_score
        : live.away_score
      : null;

  return (
    <TableRow className="h-12 [&>td]:py-1 [&>td]:leading-4 [&>td:not([rowspan])]:align-top">
      <TableCell className="whitespace-normal">
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
      <TableCell className="text-center tabular-nums">{formatNumber(lambda, 2)}</TableCell>
      <TableCell className="text-center tabular-nums">{formatPct(win)}</TableCell>
      <TableCell
        className={cn(
          "text-center font-semibold tabular-nums",
          edge == null
            ? "text-muted-foreground"
            : edge >= 0.13
              ? "text-positive"
              : edge < 0
                ? "text-negative"
                : "",
        )}
        title={edge == null ? "No verified book quote" : picked ? "Recorded edge at publication, in percentage points" : "Edge against the current book quote, in percentage points"}
      >
        {edge == null
          ? <span className="text-xs font-normal">No quote</span>
          : `${edge > 0 ? "+" : ""}${formatPct(edge)}`}
      </TableCell>
      <TableCell className="text-center tabular-nums">
        <span>{formatOdds(fair)}</span>
        <span className="mx-0.5 text-muted-foreground">/</span>
        <span className="text-muted-foreground">{formatOdds(price)}</span>
        {provider && (
          <span className="block text-[10px] leading-3 text-muted-foreground">
            {provider}{picked && " · recorded"}
          </span>
        )}
        <span className="block text-[10px] leading-3 text-muted-foreground">
          min {formatOdds(picked ? moneyline.minimum_price : minimum)}
        </span>
      </TableCell>
      <TableCell className="text-center">
        {picked && moneyline ? (
          <>
            <span className="font-semibold text-positive">ML {formatOdds(moneyline.price)}</span>
            <span className="block text-[10px] leading-3 text-muted-foreground">
              Kelly {formatPct(moneyline.kelly_fraction)}
            </span>
          </>
        ) : <span className="text-muted-foreground">–</span>}
      </TableCell>
      {side === "away" && (
        <>
          <TableCell rowSpan={2} className="border-l border-border align-middle text-center">
            <div className="grid grid-rows-[1.25rem_1rem_0.875rem]">
              <span className="font-semibold">{formatNumber(projection.model_total, 2)}</span>
              <span className="text-xs text-muted-foreground">
                {(totalPicked || matchup.bookTotal != null) && (
                  <>line {formatNumber(totalPicked ? total.point : matchup.bookTotal, 1)}</>
                )}
              </span>
            </div>
          </TableCell>
          <TableCell rowSpan={2} className="align-middle text-center">
            <div className="grid grid-rows-[1.25rem_1rem_0.875rem]">
              {totalPicked && total ? (
                <>
                  <span className="font-semibold text-accent-amber">
                    {total.side === "over" ? "O" : "U"} {formatNumber(total.point, 1)}
                  </span>
                  <span className="text-xs">{formatOdds(total.price)}</span>
                  <span className="text-[10px] leading-3 text-muted-foreground">
                    {total.provider ?? providerName(total.provider_key ?? "")}
                  </span>
                </>
              ) : <span className="text-xs text-muted-foreground">No play</span>}
            </div>
          </TableCell>
        </>
      )}
    </TableRow>
  );
}

export function NhlGamesTable({ matchups }: { matchups: NhlMatchup[] }) {
  return (
    <GamesTableLayout
      caption="Today's NHL games with model prices, partner-book prices, and live scores"
      projectionLabel="xG"
      showTotals
    >
      {matchups.map((matchup) => {
        const { projection, live } = matchup;
        return (
          <Fragment key={projection.game_id}>
            <GameMatchupHeader
              away={projection.away_team}
              home={projection.home_team}
              columnCount={8}
              status={live && live.state !== "pre" && (
                <span className={cn(
                  "text-[10px] uppercase tracking-wider",
                  live.state === "in" ? "text-positive" : "text-muted-foreground",
                )}>
                  {live.detail}
                </span>
              )}
              detail={startLabel(projection.start_date)}
            />
            <TeamRow matchup={matchup} side="away" />
            <TeamRow matchup={matchup} side="home" />
          </Fragment>
        );
      })}
    </GamesTableLayout>
  );
}
