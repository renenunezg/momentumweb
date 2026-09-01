import Link from "next/link";
import { supabaseCfb } from "@/lib/supabase";
import type { CfbBacktestPrediction, CfbGradedGame } from "@/lib/types";
import { cn } from "@/lib/utils";
import { fetchLiveGradedSeason, formatHomeLine } from "@/lib/cfb";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export const revalidate = 300;

const PAGE_SIZE = 50;
const FIRST_BACKTEST_SEASON = 2021;

// Both the live grading record and the frozen backtest render through the
// same row shape: a home-axis model margin, closing spread, and result.
interface HistoryRow {
  game_id: number;
  season: number;
  week: number;
  home_team: string;
  away_team: string;
  neutral_site: boolean | null;
  home_points: number | null;
  away_points: number | null;
  closing_spread: number | null;
  model_margin: number | null;
  actual_margin: number | null;
}

function fromBacktest(r: CfbBacktestPrediction): HistoryRow {
  return r;
}

function fromGraded(r: CfbGradedGame): HistoryRow {
  return {
    game_id: r.game_id,
    season: r.season,
    week: r.week,
    home_team: r.home_team,
    away_team: r.away_team,
    neutral_site: r.neutral_site,
    home_points: r.home_points,
    away_points: r.away_points,
    closing_spread: r.closing_spread,
    model_margin: r.pure_home_margin,
    actual_margin: r.actual_margin,
  };
}

function fmt(value: number | null, decimals = 1): string {
  if (value == null) return "–";
  return value.toFixed(decimals);
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; team?: string; page?: string }>;
}) {
  const params = await searchParams;
  const season = params.season ?? "";
  const team = params.team ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const [liveSeason, backtestSeasonRes] = await Promise.all([
    fetchLiveGradedSeason(),
    supabaseCfb
      .from("backtest_predictions")
      .select("season")
      .order("season", { ascending: false })
      .limit(1),
  ]);
  const isLive = liveSeason != null && season === String(liveSeason);

  let rows: HistoryRow[] = [];
  let totalRows = 0;
  let errorMessage: string | null = null;

  if (isLive) {
    let query = supabaseCfb
      .from("graded_games")
      .select("*", { count: "exact" })
      .eq("season", liveSeason)
      .order("start_date", { ascending: false })
      .order("game_id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (team) {
      query = query.or(`home_team.eq.${team},away_team.eq.${team}`);
    }
    const { data, count, error } = await query;
    rows = ((data ?? []) as CfbGradedGame[]).map(fromGraded);
    totalRows = count ?? 0;
    errorMessage = error?.message ?? null;
  } else {
    let query = supabaseCfb
      .from("backtest_predictions")
      .select("*", { count: "exact" })
      .order("season", { ascending: false })
      .order("week", { ascending: false })
      .order("game_id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (season) {
      query = query.eq("season", parseInt(season, 10));
    }
    if (team) {
      query = query.or(`home_team.eq.${team},away_team.eq.${team}`);
    }
    const { data, count, error } = await query;
    rows = ((data ?? []) as CfbBacktestPrediction[]).map(fromBacktest);
    totalRows = count ?? 0;
    errorMessage = error?.message ?? null;
  }

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const latestBacktestSeason = backtestSeasonRes.data?.[0]?.season ?? null;
  const backtestSeasons =
    latestBacktestSeason == null
      ? []
      : Array.from(
          { length: latestBacktestSeason - FIRST_BACKTEST_SEASON + 1 },
          (_, i) => String(latestBacktestSeason - i)
        );

  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    if (season) sp.set("season", season);
    if (team) sp.set("team", team);
    sp.set("page", String(p));
    return `/cfb/history?${sp.toString()}`;
  }

  function seasonUrl(s: string) {
    const sp = new URLSearchParams();
    if (s) sp.set("season", s);
    if (team) sp.set("team", team);
    return `/cfb/history?${sp.toString()}`;
  }

  const tabClass = (active: boolean) =>
    cn(
      "border-b-2 px-3 py-2 transition-colors",
      active
        ? "border-foreground text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground"
    );

  return (
    <main className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-heading text-2xl tracking-tight">
          {isLive ? `${liveSeason} Graded Games` : "Backtest History"}
        </h1>
        <div className="text-xs text-muted-foreground">
          {totalRows} graded games
        </div>
      </div>

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        {isLive
          ? "Every completed game graded live this season: the projection published before kickoff, the CFBD closing spread, and the final margin. Nothing is re-fit after a result is known. Lines are quoted for the home team."
          : "Every graded prediction from the frozen walk-forward backtest, next to the closing spread and the final margin. Backtest seasons are historical stand-ins, not live results. Lines are quoted for the home team."}
      </p>

      <div className="flex flex-wrap items-center gap-0 font-mono text-xs uppercase tracking-wider">
        {liveSeason != null && (
          <Link
            href={seasonUrl(String(liveSeason))}
            className={tabClass(isLive)}
          >
            {liveSeason} live
          </Link>
        )}
        <Link href={seasonUrl("")} className={tabClass(!season)}>
          Backtest
        </Link>
        {backtestSeasons.map((s) => (
          <Link
            key={s}
            href={seasonUrl(s)}
            className={tabClass(!isLive && season === s)}
          >
            {s}
          </Link>
        ))}
        {team && (
          <span className="ml-3 flex items-center gap-2 normal-case">
            <span className="text-muted-foreground">Team: {team}</span>
            <Link
              href={
                season ? `/cfb/history?season=${season}` : "/cfb/history"
              }
              className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              clear
            </Link>
          </span>
        )}
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive">
          Could not load history: {errorMessage}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isLive
            ? "No completed games have been graded yet this season."
            : "No graded games match these filters."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Season</TableHead>
                <TableHead className="text-right">Wk</TableHead>
                <TableHead>Matchup</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Model</TableHead>
                <TableHead className="text-right">Close</TableHead>
                <TableHead className="text-right">Result</TableHead>
                <TableHead className="text-right">Model err</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const modelLine =
                  r.model_margin != null ? -r.model_margin : null;
                const marketMargin =
                  r.closing_spread != null ? -r.closing_spread : null;
                const modelErr =
                  r.model_margin != null && r.actual_margin != null
                    ? r.model_margin - r.actual_margin
                    : null;
                const marketErr =
                  marketMargin != null && r.actual_margin != null
                    ? marketMargin - r.actual_margin
                    : null;
                const modelCloser =
                  modelErr != null && marketErr != null
                    ? Math.abs(modelErr) < Math.abs(marketErr)
                    : null;
                return (
                  <TableRow key={r.game_id}>
                    <TableCell className="font-mono tabular-nums text-muted-foreground">
                      {r.season}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {r.week}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {r.away_team}
                        <span className="text-muted-foreground">
                          {" "}
                          {r.neutral_site ? "vs" : "@"}{" "}
                        </span>
                        {r.home_team}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                      {r.away_points ?? "–"}&ndash;{r.home_points ?? "–"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {modelLine != null ? formatHomeLine(modelLine) : "–"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {r.closing_spread != null
                        ? formatHomeLine(r.closing_spread)
                        : "–"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {r.actual_margin != null
                        ? formatHomeLine(-r.actual_margin)
                        : "–"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono tabular-nums",
                        modelCloser === true && "text-positive",
                        modelCloser === false && "text-muted-foreground"
                      )}
                    >
                      {modelErr != null ? fmt(Math.abs(modelErr)) : "–"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageUrl(page - 1)}
                className="rounded-md border border-border px-3 py-1.5 transition-colors hover:border-foreground/30"
              >
                &larr; Newer
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageUrl(page + 1)}
                className="rounded-md border border-border px-3 py-1.5 transition-colors hover:border-foreground/30"
              >
                Older &rarr;
              </Link>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Model and Close are home lines; Result is the final margin on the same
        axis. Model err is the absolute miss of the model&apos;s margin, shown
        green when the model was closer than the closing line.
        {isLive
          ? " Model is the pure projection, not the market-informed blend."
          : ""}
      </p>
    </main>
  );
}
