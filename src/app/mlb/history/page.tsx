import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";
import type { Narrow } from "@/lib/types";
import { EMPTY, cn, formatDate, formatNumber, formatOdds, formatPct, pageNumber } from "@/lib/utils";
import { V2_CUTOVER_DATE } from "@/lib/constants";
import { V2Badge } from "@/components/v2-badge";
import Filters from "@/components/filters";
import { LastUpdated } from "@/components/last-updated";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { TeamLogo } from "@/components/team-logo";
import { mlbTeamIdentity } from "@/lib/mlb-teams";
import Link from "next/link";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "MLB Prediction History",
  description:
    "Every MLB prediction this season next to the final score: moneyline, run line, and total picks frozen before first pitch, with results by team and date.",
};

const PAGE_SIZE = 50;

// Same treatment as the CFB schedule: a color rule down the leading edge plus a
// faint wash of the team's color, so a long table is scannable by club without
// the color fighting the win/loss text coloring the row already carries.
function TeamCell({ team }: { team: string }) {
  const identity = mlbTeamIdentity(team);
  const color = identity?.color ?? null;
  return (
    <TableCell
      className="font-medium"
      style={
        color
          ? {
              boxShadow: `inset 3px 0 0 ${color}`,
              // 14 hex = 8% alpha: enough to read as the team's color, light
              // enough to leave the theme's text contrast untouched.
              backgroundColor: `${color}14`,
            }
          : undefined
      }
    >
      <span className="flex items-center gap-2">
        <TeamLogo team={identity} name={team} />
        <span>{team}</span>
      </span>
    </TableCell>
  );
}

// The unified view joins games onto both model output tables, so row-level
// results render without a follow-up query per page. A view reports every
// column nullable; the keys and play flags are always written.
type HistoryRow = Narrow<
  Tables<"mlb", "model_outputs_season_unified">,
  {
    game_pk: number;
    team: string;
    ev_flag: string;
    run_line_ev_flag: string;
    total_play: string;
  }
>;

type BetRecord = { bet_type: string; wins: number; losses: number; pushes: number };

// Keyed by the ledger's bet_type. A selected market lists only the rows where
// that market is a play; No Play rows stay in the default All markets view.
const MARKETS = {
  ml: { label: "ML", play: (r: HistoryRow) => r.ev_flag !== "No Play" },
  rl: { label: "RL", play: (r: HistoryRow) => r.run_line_ev_flag !== "No Play" },
  total: {
    label: "Totals",
    play: (r: HistoryRow) => r.total_play === "Over" || r.total_play === "Under",
  },
} as const;
type Market = keyof typeof MARKETS;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; market?: string; from?: string; to?: string; page?: string; period?: string }>;
}) {
  const params = await searchParams;

  const team = params.team ?? "";
  const market: Market | "" =
    params.market && Object.hasOwn(MARKETS, params.market)
      ? (params.market as Market)
      : "";
  const from = params.from ?? "";
  const to = params.to ?? "";
  const period = params.period ?? "7";
  const page = pageNumber(params.page);
  const offset = (page - 1) * PAGE_SIZE;

  // 7D / 30D quick-filter applies a date floor to both the table and the
  // records widget. Explicit from/to in the URL overrides it for the table.
  const periodFloor =
    period === "7"
      ? new Date(new Date().getTime() - 7 * 86400000).toISOString().split("T")[0]
      : period === "30"
        ? new Date(new Date().getTime() - 30 * 86400000).toISOString().split("T")[0]
        : "";
  const effectiveFrom = from || periodFloor;

  // Read from the unified view so v1's pre-cutover history shows alongside
  // v2's post-cutover picks. start_time is the true chronological order;
  // date alone has no within-day granularity, and game_pk is unrelated to
  // first-pitch time, so sorting by it would scramble the daily schedule.
  function dated<Q extends { gte(c: "date", v: string): Q; lte(c: "date", v: string): Q }>(q: Q) {
    if (effectiveFrom) q = q.gte("date", effectiveFrom);
    if (to) q = q.lte("date", to);
    return q;
  }
  const ordered = (count?: "exact") =>
    dated(
      supabase
        .from("model_outputs_season_unified")
        .select("*", { count })
        .order("start_time", { ascending: false })
        .order("game_pk", { ascending: true })  // groups the two rows of a game adjacent
        .order("team", { ascending: true })     // deterministic home/away order within a game
    );
  // A side pick flags one team's row, and the opponent's row must ride along
  // so the matchup, starter, and line stay readable. That takes two reads:
  // the page of picked rows, then every row of those games. Total plays sit
  // on both rows of a game, so that market pages rows directly.
  const sidePick = market === "ml" || market === "rl";
  let pageQuery = sidePick ? null : ordered("exact");
  if (pageQuery) {
    if (team) pageQuery = pageQuery.eq("team", team);
    if (market === "total") pageQuery = pageQuery.in("total_play", ["Over", "Under"]);
    pageQuery = pageQuery.range(offset, offset + PAGE_SIZE - 1);
  }
  let picksQuery = sidePick
    ? dated(
        supabase
          .from("model_outputs_season_unified")
          .select("game_pk", { count: "exact" })
          .neq(market === "ml" ? "ev_flag" : "run_line_ev_flag", "No Play")
          .order("start_time", { ascending: false })
          .order("game_pk", { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1)
      )
    : null;
  if (picksQuery && team) picksQuery = picksQuery.eq("team", team);

  const [pageRes, picked, { data: recordRows }, { data: latest }, { data: firstV2GameRows }] = await Promise.all([
    pageQuery,
    picksQuery,
    // Win/loss record aggregated in the database: one tiny response instead
    // of paging the full bet ledger view across sequential requests.
    supabase.rpc("bet_record_summary", {
      p_from: periodFloor || null,
      p_team: team || null,
    }),
    supabase
      .from("games")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("games")
      .select("game_pk")
      .gte("game_date", V2_CUTOVER_DATE)
      .order("start_time", { ascending: true })
      .limit(1),
  ]);
  const pickedGames = [...new Set((picked?.data ?? []).map((r) => r.game_pk))];
  const gamesRes = pickedGames.length
    ? await ordered().in("game_pk", pickedGames)
    : null;
  const rows = pageRes?.data ?? gamesRes?.data;
  const error = pageRes?.error ?? picked?.error ?? gamesRes?.error;
  const totalRows = pageRes?.count ?? picked?.count ?? 0;

  const firstV2GamePk: number | null = firstV2GameRows?.[0]?.game_pk ?? null;

  const lastUpdated: string | null = latest?.[0]?.updated_at ?? null;

  const predictions = (rows ?? []) as HistoryRow[];
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  const records: Record<Market, { wins: number; losses: number; pushes: number }> = {
    ml: { wins: 0, losses: 0, pushes: 0 },
    rl: { wins: 0, losses: 0, pushes: 0 },
    total: { wins: 0, losses: 0, pushes: 0 },
  };
  for (const r of (recordRows ?? []) as BetRecord[]) {
    if (Object.hasOwn(records, r.bet_type)) records[r.bet_type as Market] = r;
  }

  // Pushes are bets with zero P&L: shown as a third number, excluded from the
  // win percentage.
  function fmtRecord(w: number, l: number, p = 0) {
    const decided = w + l;
    if (decided + p === 0) return "0-0";
    const rec = p > 0 ? `${w}-${l}-${p}` : `${w}-${l}`;
    if (decided === 0) return rec;
    const pct = ((w / decided) * 100).toFixed(0);
    return `${rec} (${pct}%)`;
  }

  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    if (team) sp.set("team", team);
    if (market) sp.set("market", market);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    if (period) sp.set("period", period);
    sp.set("page", String(p));
    return `/mlb/history?${sp.toString()}`;
  }

  return (
    <main id="main" className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-heading text-2xl tracking-tight">MLB Prediction History</h1>
        <LastUpdated
          timestamp={lastUpdated}
          schedule="Predictions ~5 AM PT • Results scored overnight"
        />
      </div>

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Every MLB prediction this season next to the final score: the
        moneyline, run line, and total picks frozen before first pitch and
        how each one graded.
      </p>

      <Filters />

      {/* Record Summary */}
      <div className="flex flex-wrap items-center gap-4 font-mono text-sm">
        {(Object.keys(MARKETS) as Market[])
          .filter((m) => !market || m === market)
          .map((m) => {
            const { wins, losses, pushes } = records[m];
            return (
              <div key={m} className="flex items-center gap-2">
                <span className="text-muted-foreground">{MARKETS[m].label}:</span>
                <span
                  className={cn(
                    "font-semibold",
                    wins + losses > 0 && wins > losses
                      ? "text-positive"
                      : wins < losses
                        ? "text-negative"
                        : ""
                  )}
                >
                  {fmtRecord(wins, losses, pushes)}
                </span>
              </div>
            );
          })}
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          Error loading data: {error.message}
        </p>
      ) : predictions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">
          No predictions found for the selected filters.
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Starter</TableHead>
                <TableHead className="text-right">xR</TableHead>
                <TableHead className="text-right">Win Prob</TableHead>
                <TableHead className="text-right">Model Odds</TableHead>
                <TableHead className="text-right">Book ML</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-center">Result</TableHead>
                <TableHead className="text-center">+EV</TableHead>
                <TableHead className="text-center">RL +EV</TableHead>
                <TableHead className="text-center">Total Play</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                // Badge appears once globally, on the first row of the
                // chronologically-first v2 game across the entire dataset.
                // If that game isn't on the current page, no badge here.
                const firstV2Idx = firstV2GamePk !== null
                  ? predictions.findIndex((r) => r.game_pk === firstV2GamePk)
                  : -1;
                return predictions.map((row, i) => {
                const nextRow = predictions[i + 1];
                // The date reads once per game, on the pair's top row.
                const sameGameAbove = predictions[i - 1]?.game_pk === row.game_pk;
                const showV2Badge = i === firstV2Idx;
                const isFinal = row.game_status === "Final";
                const isHome = row.home_team === row.team;
                const teamScore = isHome ? row.home_score : row.away_score;
                const oppScore = isHome ? row.away_score : row.home_score;
                const won = isFinal && teamScore != null && oppScore != null
                  ? teamScore > oppScore
                  : null;
                const mlIsPlay = MARKETS.ml.play(row);
                const rlIsPlay = MARKETS.rl.play(row);
                // A total belongs to the game, not a side, and the view stamps
                // it on both rows. It renders on the pair's first row only:
                // rows sort by team, so that is the alphabetically first club,
                // a rule that holds even when a pair splits across pages.
                const opponent = isHome ? row.away_team : row.home_team;
                const totalsIsPlay =
                  MARKETS.total.play(row) && (opponent == null || row.team < opponent);

                const mlWon: boolean | null =
                  mlIsPlay && won !== null ? won : null;

                // Must match bet_ledger_v's cover logic, keyed on spread sign.
                const rlWon: boolean | null =
                  rlIsPlay &&
                  isFinal &&
                  teamScore != null &&
                  oppScore != null &&
                  row.spread != null
                    ? row.spread < 0
                      ? teamScore - oppScore >= Math.abs(row.spread)
                      : teamScore > oppScore ||
                        teamScore - oppScore >= -row.spread
                    : null;

                const totalsWon: boolean | null = (() => {
                  if (!totalsIsPlay) return null;
                  if (
                    !isFinal ||
                    row.home_score == null ||
                    row.away_score == null
                  )
                    return null;
                  if (row.total == null) return null;
                  const actual = row.home_score + row.away_score;
                  const book = row.total;
                  if (actual === book) return null; // push
                  return row.total_play === "Over"
                    ? actual > book
                    : actual < book;
                })();

                // With a market selected the row is colored by that market's
                // result. Under All markets each pick cell carries its own
                // color and the row stays neutral, so a team that won but did
                // not cover reads green on ML and red on RL. Rows with nothing
                // played fade: the opponent of a side pick, or a game with no
                // pick at all.
                const played = {
                  ml: { isPlay: mlIsPlay, won: mlWon },
                  rl: { isPlay: rlIsPlay, won: rlWon },
                  total: { isPlay: totalsIsPlay, won: totalsWon },
                };
                const rowWon = market ? played[market].won : null;
                const faded = market
                  ? !played[market].isPlay
                  : !(mlIsPlay || rlIsPlay || totalsIsPlay);

                const cellClass = (outcome: boolean | null, isPlay: boolean) => {
                  if (!isPlay) return "text-muted-foreground";
                  if (outcome === true) return "text-positive font-semibold";
                  if (outcome === false) return "text-negative font-semibold";
                  return "font-semibold";
                };

                return (
                <TableRow
                  key={`${row.game_pk}-${row.team}`}
                  className={cn(
                    // No rule between a game's two rows; a heavier one
                    // after the pair keeps each game's rows paired.
                    nextRow?.game_pk === row.game_pk
                      ? "border-b-0"
                      : "border-b-2 border-b-rule-strong",
                    rowWon === true && "text-positive",
                    rowWon === false && "text-negative",
                    // Fade the cells, not the row, so the game rule keeps
                    // its weight under an unpicked game.
                    faded && "[&>td]:opacity-50"
                  )}
                >
                  <TableCell>
                    {sameGameAbove ? null : formatDate(row.date)}
                    {showV2Badge ? <V2Badge /> : null}
                  </TableCell>
                  <TeamCell team={row.team} />
                  <TableCell>{row.starter ?? EMPTY}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.expected_runs)}</TableCell>
                  <TableCell className="text-right">{formatPct(row.win_prob)}</TableCell>
                  <TableCell className="text-right">{formatOdds(row.our_odds)}</TableCell>
                  <TableCell className="text-right">{formatOdds(row.moneyline)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {isFinal && teamScore != null ? `${teamScore}` : EMPTY}
                  </TableCell>
                  <TableCell className="text-center">
                    {won != null ? (
                      <span
                        className={cn(
                          "font-semibold",
                          !faded && (won ? "text-positive" : "text-negative")
                        )}
                      >
                        {won ? "W" : "L"}
                      </span>
                    ) : (
                      EMPTY
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cellClass(mlWon, mlIsPlay)}>
                      {mlIsPlay ? row.ev_flag : EMPTY}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cellClass(rlWon, rlIsPlay)}>
                      {rlIsPlay ? row.run_line_ev_flag : EMPTY}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cellClass(totalsWon, totalsIsPlay)}>
                      {totalsIsPlay ? row.total_play : EMPTY}
                    </span>
                  </TableCell>
                </TableRow>
                );
              });
              })()}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Showing {offset + 1}-{Math.min(offset + PAGE_SIZE, totalRows)} of{" "}
              {totalRows} {sidePick ? "picks" : "rows"}
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  href={pageUrl(page - 1)}
                  className="inline-flex h-9 items-center justify-center border border-input bg-background px-3 font-mono text-xs hover:bg-muted transition-colors"
                >
                  Previous
                </Link>
              ) : (
                <span className="inline-flex h-9 items-center justify-center border border-input bg-background px-3 font-mono text-xs text-muted-foreground opacity-50">
                  Previous
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={pageUrl(page + 1)}
                  className="inline-flex h-9 items-center justify-center border border-input bg-background px-3 font-mono text-xs hover:bg-muted transition-colors"
                >
                  Next
                </Link>
              ) : (
                <span className="inline-flex h-9 items-center justify-center border border-input bg-background px-3 font-mono text-xs text-muted-foreground opacity-50">
                  Next
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
