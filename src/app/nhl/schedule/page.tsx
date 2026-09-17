import type { Metadata } from "next";
import { Fragment } from "react";
import { Kickoff } from "@/components/kickoff-cells";
import { LastUpdated } from "@/components/last-updated";
import { LocalKickoffs } from "@/components/local-kickoffs";
import { Notice } from "@/components/notice";
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
import { SITE_TIME_ZONE, siteDate, zonedDayRange } from "@/lib/daily-picks";
import {
  bestMoneyline,
  fetchLatestSnapshots,
  fetchProjections,
  fetchTeams,
  PROVIDER_NAMES,
} from "@/lib/nhl";
import { fetchNhlDecisions, pickLabel } from "@/lib/nhl-picks";
import { cn, formatNumber, formatOdds, formatPct } from "@/lib/utils";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "NHL Schedule and Projections",
  description:
    "Expected goals, win probabilities, and model totals for every NHL game in the next seven days, with the partner sportsbook lines where posted.",
};

const num = "text-right font-mono tabular-nums";
const DAYS = 7;

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function SchedulePage() {
  const today = siteDate();
  const from = zonedDayRange(today, SITE_TIME_ZONE).from;
  const to = zonedDayRange(addDays(today, DAYS), SITE_TIME_ZONE).from;
  const [{ games, unavailable }, teams, decisionsRes] = await Promise.all([
    fetchProjections(from, to),
    fetchTeams(),
    fetchNhlDecisions(from, to),
  ]);
  const snapshots = await fetchLatestSnapshots(games.map((g) => g.game_id));
  const picks = new Map<string, string[]>();
  for (const d of decisionsRes.decisions)
    if (d.status === "recommended")
      picks.set(d.game_id, [
        ...(picks.get(d.game_id) ?? []),
        `${pickLabel(d)} ${formatOdds(d.price)}`,
      ]);

  if (games.length === 0) {
    return (
      <main id="main" className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8">
        <h1 className="font-heading text-2xl">NHL Schedule and Projections</h1>
        <Notice className="mt-6">
          {unavailable
            ? "Projections are temporarily unavailable."
            : "No projected games in the next seven days."}
        </Notice>
      </main>
    );
  }

  const byDate = new Map<string, typeof games>();
  for (const game of games)
    byDate.set(game.game_date, [...(byDate.get(game.game_date) ?? []), game]);

  return (
    <main id="main" className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl">NHL Schedule and Projections</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Next {DAYS} days · {games.length} games
          </p>
        </div>
        <LastUpdated
          timestamp={games[0]?.as_of ?? null}
          schedule="Updates every morning in season"
        />
      </div>
      <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">
        Projections use the ratings as of the morning run. The partner
        sportsbooks post lines only for the current slate, so book columns fill
        in on game day and picks are decided then.
      </p>
      <LocalKickoffs>
        <Table>
          <TableCaption className="sr-only">NHL projections for the next seven days</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Matchup</TableHead>
              <TableHead className="text-right">Away xG</TableHead>
              <TableHead className="text-right">Home xG</TableHead>
              <TableHead className="text-right">Home win</TableHead>
              <TableHead className="text-right">Fair (H)</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Book ML (A / H)</TableHead>
              <TableHead className="text-right">Book total</TableHead>
              <TableHead>Play</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...byDate.entries()].map(([date, slate]) => (
              <Fragment key={date}>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="rowgroup" colSpan={10} className="h-auto px-2 pt-4 pb-1">
                    <Kickoff start={slate[0].start_date} part="day" />
                  </TableHead>
                </TableRow>
                {slate.map((g) => {
                  const rows = snapshots.get(g.game_id);
                  const away = bestMoneyline(rows, "away");
                  const home = bestMoneyline(rows, "home");
                  const total = rows?.find((r) => r.total_line != null);
                  const play = picks.get(g.game_id);
                  return (
                    <TableRow key={g.game_id} className={cn(play && "font-medium")}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        <Kickoff start={g.start_date} part="time" />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <TeamLogo team={teams.get(g.away_team_abbr)} name={g.away_team} className="h-4 w-4" />
                          {g.away_team_abbr}
                          <span className="text-muted-foreground">@</span>
                          <TeamLogo team={teams.get(g.home_team_abbr)} name={g.home_team} className="h-4 w-4" />
                          {g.home_team_abbr}
                        </span>
                      </TableCell>
                      <TableCell className={num}>{formatNumber(g.away_lambda, 2)}</TableCell>
                      <TableCell className={num}>{formatNumber(g.home_lambda, 2)}</TableCell>
                      <TableCell className={num}>{formatPct(g.home_win_prob)}</TableCell>
                      <TableCell className={num}>{formatOdds(g.home_fair_price)}</TableCell>
                      <TableCell className={num}>{formatNumber(g.model_total, 2)}</TableCell>
                      <TableCell className={`${num} text-muted-foreground`}>
                        {away && home ? (
                          <span title={`${PROVIDER_NAMES[away.provider] ?? away.provider} / ${PROVIDER_NAMES[home.provider] ?? home.provider}`}>
                            {formatOdds(away.price)} / {formatOdds(home.price)}
                          </span>
                        ) : (
                          "–"
                        )}
                      </TableCell>
                      <TableCell className={`${num} text-muted-foreground`}>
                        {total ? formatNumber(total.total_line, 1) : "–"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-positive">
                        {play?.join(" · ") ?? ""}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </LocalKickoffs>
    </main>
  );
}
