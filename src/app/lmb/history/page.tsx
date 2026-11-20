import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HistoryPager } from "@/components/graded-history";
import { Notice } from "@/components/notice";
import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCents, lmbTeamName, tierLabel } from "@/lib/lmb";
import {
  LMB_HISTORY_PAGE_SIZE,
  fetchLmbForecastHistory,
  fetchLmbPickHistory,
  type LmbForecastGame,
  type LmbLedgerEntry,
} from "@/lib/lmb-data";
import { EMPTY, cn, formatDate, formatNumber, formatPct, formatSigned, pageNumber } from "@/lib/utils";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "LMB Forecast History",
  description:
    "Every LMB forecast frozen at first pitch next to the final score, and every moneyline pick with its Kalshi price, tier and result.",
};

type View = "forecasts" | "picks";

const VIEWS: { key: View; label: string }[] = [
  { key: "forecasts", label: "Forecasts" },
  { key: "picks", label: "Picks" },
];

const num = "text-right tabular-nums";
const FINAL = new Set(["Final", "Completed Early", "Game Over"]);

function ViewLinks({ active }: { active: View }) {
  return (
    <nav aria-label="History view" className="type-eyebrow flex flex-wrap items-center">
      {VIEWS.map((view) => (
        <Link
          key={view.key}
          href={view.key === "forecasts" ? "/lmb/history" : "/lmb/history?view=picks"}
          aria-current={view.key === active ? "page" : undefined}
          className={cn(
            "border-b-2 px-3 py-2 transition-colors",
            view.key === active
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {view.label}
        </Link>
      ))}
    </nav>
  );
}

function ForecastTable({ games }: { games: LmbForecastGame[] }) {
  return (
    <Table>
      <TableCaption className="sr-only">LMB forecasts frozen at first pitch, with results</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Game</TableHead>
          <TableHead className="text-right">Score</TableHead>
          <TableHead className="text-right">Home win</TableHead>
          <TableHead className="text-right">Sim</TableHead>
          <TableHead className="text-right">Kalshi</TableHead>
          <TableHead className="text-right">xR</TableHead>
          <TableHead className="text-right">Result</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {games.map(({ game_pk, date, away, home, result }) => {
          const final = result != null && FINAL.has(result.status) && result.home_score != null && result.away_score != null;
          const homeWon = final ? result.home_score! > result.away_score! : null;
          const called = homeWon == null || result!.home_score === result!.away_score ? null : homeWon === home.win_prob > 0.5;
          return (
            <TableRow key={game_pk}>
              <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(date)}</TableCell>
              <TableCell>
                <span className="font-medium" title={`${lmbTeamName(away.team)} at ${lmbTeamName(home.team)}`}>
                  {away.team} <span className="text-muted-foreground">@</span> {home.team}
                </span>
              </TableCell>
              <TableCell className={cn(num, "whitespace-nowrap")}>
                {final ? `${result.away_score}–${result.home_score}` : (result?.status ?? EMPTY)}
              </TableCell>
              <TableCell className={num}>{formatPct(home.win_prob)}</TableCell>
              <TableCell className={cn(num, "text-muted-foreground")}>{formatPct(home.sim_win_prob)}</TableCell>
              <TableCell className={cn(num, "text-muted-foreground")}>{formatPct(home.market_prob)}</TableCell>
              <TableCell className={cn(num, "whitespace-nowrap")}>
                {formatNumber(away.expected_runs)}&ndash;{formatNumber(home.expected_runs)}
              </TableCell>
              <TableCell className={cn(num, called === true && "text-positive", called === false && "text-negative")}>
                {called == null ? EMPTY : called ? "Hit" : "Miss"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function PickTable({ picks }: { picks: LmbLedgerEntry[] }) {
  return (
    <Table>
      <TableCaption className="sr-only">LMB moneyline picks with their frozen Kalshi prices and results</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Game</TableHead>
          <TableHead>Pick</TableHead>
          <TableHead>Tier</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Prob.</TableHead>
          <TableHead className="text-right">EV</TableHead>
          <TableHead className="text-right">Units</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {picks.map((pick) => (
          <TableRow key={`${pick.game_pk}-${pick.date}`}>
            <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(pick.date)}</TableCell>
            <TableCell className="whitespace-nowrap">
              {pick.game ? (
                <>
                  {pick.game.away_team} <span className="text-muted-foreground">@</span> {pick.game.home_team}
                  {pick.game.away_score != null && pick.game.home_score != null && (
                    <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                      {pick.game.away_score}&ndash;{pick.game.home_score}
                    </span>
                  )}
                </>
              ) : (
                EMPTY
              )}
            </TableCell>
            <TableCell className="font-semibold" title={pick.team ? lmbTeamName(pick.team) : undefined}>
              {pick.team ?? EMPTY}
            </TableCell>
            <TableCell className="text-muted-foreground">{tierLabel(pick.tier)}</TableCell>
            <TableCell className={num}>
              {formatCents(pick.price)}
              {pick.fee != null && (
                <span className="block text-xs text-muted-foreground">+{formatCents(pick.fee)} fee</span>
              )}
            </TableCell>
            <TableCell className={num}>{formatPct(pick.probability)}</TableCell>
            <TableCell className={num}>
              {pick.expected_value == null ? EMPTY : `${formatSigned(pick.expected_value * 100, 1)}%`}
            </TableCell>
            <TableCell
              className={cn(num, pick.won === true && "text-positive", pick.won === false && "text-negative")}
            >
              {pick.units == null ? (pick.status ?? EMPTY) : `${formatSigned(pick.units, 2)}u`}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  const params = await searchParams;
  const view: View = params.view === "picks" ? "picks" : "forecasts";
  const page = pageNumber(params.page);
  const pageUrl = (value: number) =>
    `/lmb/history?${new URLSearchParams({ ...(view === "picks" && { view }), page: String(value) })}`;

  const history =
    view === "picks"
      ? await fetchLmbPickHistory(page).then((h) => ({ ...h, total: h.totalPicks, count: h.picks.length }))
      : await fetchLmbForecastHistory(page).then((h) => ({ ...h, total: h.totalGames, count: h.games.length }));
  const totalPages = Math.max(1, Math.ceil(history.total / LMB_HISTORY_PAGE_SIZE));
  if (history.published && page > totalPages) redirect(pageUrl(totalPages));

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>LMB Forecast History</PageTitle>
          <PageDescription>
            {view === "picks"
              ? "Each moneyline pick with the Kalshi ask and fee frozen at first pitch, graded at one unit."
              : "Each game's forecast frozen at first pitch, beside the final score. Home win is the published probability."}
          </PageDescription>
        </div>
        <Link href="/lmb/performance" className="text-sm underline underline-offset-4">
          Performance
        </Link>
      </PageHeader>
      <ViewLinks active={view} />
      {history.count === 0 ? (
        <Notice>
          {view === "picks" ? "No picks have been recorded yet." : "No forecasts have been recorded yet."} The LMB season
          runs from April to September, and forecasts appear here once its games start.
        </Notice>
      ) : (
        <>
          {"games" in history ? <ForecastTable games={history.games} /> : <PickTable picks={history.picks} />}
          <p className="type-meta text-muted-foreground">
            {history.total} {view === "picks" ? "picks" : "games"}, newest first.
          </p>
          <HistoryPager page={page} totalPages={totalPages} pageUrl={pageUrl} />
        </>
      )}
    </PageShell>
  );
}
