import type { Metadata } from "next";
import { supabaseCfb } from "@/lib/supabase";
import { fetchLatestRatings, fetchTeams } from "@/lib/cfb";
import {
  formatHomeLine,
  formatKickoffDay,
  formatKickoffTime,
  marketHomeLine,
} from "@/lib/football";
import type { CfbGameProjection, CfbMarketComparison } from "@/lib/types";
import { pickLabel, pickReason, type CfbPick } from "@/lib/cfb-picks";
import { formatOdds, formatPct } from "@/lib/utils";
import Link from "next/link";
import { formatNumber } from "@/lib/utils";
import { LastUpdated } from "@/components/last-updated";
import { ScheduleFilters } from "@/components/schedule-filters";
import {
  ScheduleMarker,
  ScheduleTeamCell,
} from "@/components/schedule-team-cell";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "College Football Spread Projections and Picks",
  description:
    "Model spreads, projected scores, and totals for every FBS and FCS game this week, compared against the market line with recorded moneyline, spread and total picks.",
};

const VIEWS = [
  { key: "fbs", label: "FBS", empty: "No FBS games this week." },
  { key: "fcs", label: "FCS", empty: "No FCS games this week." },
  {
    key: "top25",
    label: "Top 25",
    // Early-season weeks legitimately have none of these, so the empty state
    // says why rather than reading as a broken filter.
    empty: "No game this week is between two top 25 teams.",
  },
  {
    key: "conference",
    label: "Conference",
    empty: "No conference games this week.",
  },
] as const;

const DEGRADED: ScheduleMarker = {
  label: "*",
  note: "Several rating inputs are unavailable for this team; treat the line as degraded.",
};
const NEUTRAL: ScheduleMarker = {
  label: "N",
  note: "Neutral site: neither team is at home.",
};

export default async function SchedulePage() {
  const latestRes = await supabaseCfb
    .from("game_projections")
    .select("season, week")
    .order("season", { ascending: false })
    .order("week", { ascending: false })
    .limit(1);
  const latest = latestRes.data?.[0];

  if (!latest) {
    return (
      <main id="main" className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8">
        <h1 className="font-heading text-2xl tracking-tight">
          College Football Schedule and Projections
        </h1>
        <p className="mt-4 text-muted-foreground">
          No projections published yet. Run the publish pipeline to load them.
        </p>
      </main>
    );
  }

  const [projRes, teams, { ratings }] = await Promise.all([
    supabaseCfb
      .from("game_projections")
      .select("*")
      .eq("season", latest.season)
      .eq("week", latest.week)
      .order("start_date", { ascending: true })
      .order("game_id", { ascending: true }),
    fetchTeams(),
    fetchLatestRatings(),
  ]);

  // Ratings arrive sorted by power_rating desc, so position is the D1 rank,
  // the same number the ratings page shows.
  const rankByTeam = new Map(ratings.map((r, i) => [r.team_id, i + 1]));

  const games = (projRes.data ?? []) as CfbGameProjection[];
  const gameIds = games.map((game) => game.game_id);
  // The frozen decision keeps its original week when the schedule moves.
  const [marketRes, pickRes] = gameIds.length
    ? await Promise.all([
        supabaseCfb
          .from("market_comparisons")
          .select("*")
          .in("game_id", gameIds),
        supabaseCfb
          .from("recommendations")
          .select("*")
          .eq("season", latest.season)
          .in("game_id", gameIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  const fbsGameCount = games.filter(
    (game) =>
      game.away_classification === "fbs" || game.home_classification === "fbs",
  ).length;
  const marketByGame = new Map(
    ((marketRes.data ?? []) as CfbMarketComparison[]).map((m) => [
      m.game_id,
      m,
    ]),
  );
  const lastUpdated = games[0]?.as_of ?? null;
  const picks = new Map(
    (pickRes.data ?? []).map((pick: CfbPick) => [
      `${pick.game_id}-${pick.market}`,
      pick,
    ]),
  );
  function pickCell(gameId: number, market: string) {
    const pick = picks.get(`${gameId}-${market}`);
    if (!pick)
      return (
        <span className="text-xs text-muted-foreground">
          {pickRes.error ? "Unavailable" : "Not recorded"}
        </span>
      );
    return (
      <div
        className="min-w-36 text-left text-xs"
        title={`Recorded ${pick.decision_at}. ${pickReason(pick.reason)}`}
      >
        <div
          className={
            pick.status === "recommended"
              ? "font-semibold"
              : "text-muted-foreground"
          }
        >
          {pickLabel(pick)}
        </div>
        {pick.outcome === "void" ? (
          <div className="mt-1 text-muted-foreground">
            Void: kickoff changed
          </div>
        ) : pick.status === "recommended" ? (
          <div className="mt-1 font-mono text-muted-foreground">
            {formatOdds(pick.price)} · EV{" "}
            {formatPct(pick.expected_value_per_unit)}
          </div>
        ) : (
          <div className="mt-1 max-w-44 text-[10px] text-muted-foreground">
            {pickReason(pick.reason)}
          </div>
        )}
      </div>
    );
  }

  return (
    <main
      id="main"
      className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8 space-y-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">
            College Football Schedule and Projections
          </h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {latest.season} · Week {latest.week} · {games.length} games
          </p>
        </div>
        <LastUpdated
          timestamp={lastUpdated}
          schedule="Updates when a new forecast is published"
        />
      </div>

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Every college football game this week with the model&apos;s spread,
        projected score, and total next to the market. Model lines are quoted
        for the home team: a negative line means the model favors the home side.
        Market is the best priced spread offer found when the forecast ran, or
        the consensus spread when the best offer was a total or moneyline,
        converted to the same home axis.
      </p>

      <p className="text-xs text-muted-foreground">
        Picks show the line and odds frozen when recommended, not a live quote.
        No Play means the market did not qualify.{" "}
        <Link href="/cfb/history" className="underline underline-offset-4">
          View recorded decisions and results
        </Link>
        .
      </p>

      <ScheduleFilters
        views={VIEWS}
        defaultView="fbs"
        total={games.length}
        initialShown={fbsGameCount}
      >
        <div className="overflow-x-auto">
          {/* Everything is centered except the two team columns, whose ragged
              name lengths read badly off a center axis. */}
          <Table>
            <TableCaption className="sr-only">
              Week {latest.week} projections against the market
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Day</TableHead>
                <TableHead className="text-center">Time ET</TableHead>
                <TableHead>Away</TableHead>
                <TableHead>Home</TableHead>
                <TableHead className="text-center">Model line</TableHead>
                <TableHead className="text-center">Proj score</TableHead>
                <TableHead className="text-center">Market line</TableHead>
                <TableHead className="text-center">Diff</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead>Moneyline pick</TableHead>
                <TableHead>Spread pick</TableHead>
                <TableHead>Total pick</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {games.map((g) => {
                const market = marketByGame.get(g.game_id);
                // The best priced offer can be a total or moneyline; the
                // consensus spread the forecast was shrunk toward still exists.
                const marketLine =
                  marketHomeLine(
                    market?.best_offer_market ?? null,
                    market?.best_offer_selection ?? null,
                    market?.best_offer_point ?? null,
                    g.home_team,
                  ) ?? g.market_home_spread;
                const diff =
                  marketLine != null && g.home_spread != null
                    ? g.home_spread - marketLine
                    : null;
                const awayRank = g.away_team_id
                  ? rankByTeam.get(g.away_team_id)
                  : undefined;
                const homeRank = g.home_team_id
                  ? rankByTeam.get(g.home_team_id)
                  : undefined;
                const isFbsGame =
                  g.away_classification === "fbs" ||
                  g.home_classification === "fbs";
                return (
                  // The filters read these rather than the rendered cells, so
                  // a query cannot accidentally hit a line, total or date.
                  <TableRow
                    key={g.game_id}
                    hidden={!isFbsGame}
                    data-search={`${g.away_team} ${g.home_team}`.toLowerCase()}
                    data-fbs={String(isFbsGame)}
                    data-fcs={String(
                      g.away_classification === "fcs" &&
                        g.home_classification === "fcs",
                    )}
                    data-top25={String(
                      awayRank != null &&
                        awayRank <= 25 &&
                        homeRank != null &&
                        homeRank <= 25,
                    )}
                    data-conference={String(
                      g.conference_game === true &&
                        g.away_classification === "fbs" &&
                        g.home_classification === "fbs",
                    )}
                  >
                    <TableCell className="whitespace-nowrap text-center text-xs text-muted-foreground">
                      {formatKickoffDay(g.start_date)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-center text-xs text-muted-foreground">
                      {formatKickoffTime(g.start_date)}
                    </TableCell>
                    <ScheduleTeamCell
                      name={g.away_team}
                      team={
                        g.away_team_id != null
                          ? teams.get(g.away_team_id)
                          : undefined
                      }
                      rank={awayRank}
                      markers={[
                        (g.away_missing_input_count ?? 0) >= 4 && DEGRADED,
                      ]}
                    />
                    <ScheduleTeamCell
                      name={g.home_team}
                      team={
                        g.home_team_id != null
                          ? teams.get(g.home_team_id)
                          : undefined
                      }
                      rank={homeRank}
                      markers={[
                        g.neutral_site && NEUTRAL,
                        (g.home_missing_input_count ?? 0) >= 4 && DEGRADED,
                      ]}
                    />
                    <TableCell className="text-center font-mono font-semibold tabular-nums">
                      {formatHomeLine(g.home_spread)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-center font-mono tabular-nums">
                      {formatNumber(g.expected_away_points, 0)}&ndash;
                      {formatNumber(g.expected_home_points, 0)}
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums text-muted-foreground">
                      {marketLine != null ? formatHomeLine(marketLine) : "–"}
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums">
                      {diff != null ? formatHomeLine(diff) : "–"}
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums">
                      {formatNumber(g.model_total)}
                    </TableCell>
                    <TableCell>{pickCell(g.game_id, "h2h")}</TableCell>
                    <TableCell>{pickCell(g.game_id, "spreads")}</TableCell>
                    <TableCell>{pickCell(g.game_id, "totals")}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </ScheduleFilters>

      <p className="max-w-4xl text-xs text-muted-foreground">
        Proj score is away&ndash;home expected points. Diff is model line minus
        market line. Picks require qualifying probabilities, prices, and input
        flags; a large point difference alone does not qualify. A star marks a
        team whose rating inputs are incomplete; N marks a neutral site.
      </p>
    </main>
  );
}
