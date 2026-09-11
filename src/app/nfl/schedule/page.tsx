import type { Metadata } from "next";
import { supabaseNfl } from "@/lib/supabase";
import { fetchLatestRatings, fetchTeams } from "@/lib/nfl";
import { formatHomeLine, marketHomeLine } from "@/lib/football";
import { groupFootballSlates } from "@/lib/football-slates";
import type { NflGameProjection, NflMarketComparison } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { LastUpdated } from "@/components/last-updated";
import { KickoffCells } from "@/components/kickoff-cells";
import { liveKey } from "@/lib/football-live";
import { ScheduleFilters } from "@/components/schedule-filters";
import { ScheduleMarker, ScheduleTeamCell } from "@/components/schedule-team-cell";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "NFL Spread Projections and Model Lines",
  description:
    "Model spreads, projected scores, and totals for every NFL game this week, compared against the market line.",
};

const VIEWS = [
  { key: "all", label: "All", empty: "No games this week.", all: true },
  { key: "division", label: "Divisional", empty: "No divisional games this week." },
] as const;

const NEUTRAL: ScheduleMarker = {
  label: "N",
  note: "Neutral site: neither team is at home.",
};

// A projected starter whose value differs meaningfully from the QB play baked
// into the team's rating.
function qbMarker(adjustment: number | null): ScheduleMarker | null {
  const qb = adjustment ?? 0;
  if (Math.abs(qb) < 1.5) return null;
  return {
    label: "QB",
    note: `QB adjustment ${qb > 0 ? "+" : ""}${qb.toFixed(1)} pts: the projected starter differs meaningfully from the QB play in the team's rating.`,
  };
}

export default async function SchedulePage() {
  const latestRes = await supabaseNfl
    .from("game_projections")
    .select("season, week")
    .order("season", { ascending: false })
    .order("week", { ascending: false })
    .limit(1);
  const latest = latestRes.data?.[0];

  if (!latest) {
    return (
      <main id="main" className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8">
        <h1 className="font-heading text-2xl tracking-tight">NFL Schedule and Projections</h1>
        <p className="mt-4 text-muted-foreground">
          No projections published yet. Run the publish pipeline to load them.
        </p>
      </main>
    );
  }

  const [projRes, marketRes, totalRes, teams, { ratings }] = await Promise.all([
    supabaseNfl
      .from("game_projections")
      .select("*")
      .eq("season", latest.season)
      .eq("week", latest.week)
      .order("start_date", { ascending: true })
      .order("game_id", { ascending: true }),
    supabaseNfl.from("market_comparisons").select("*"),
    // The projections carry no market total; the totals decision records the
    // consensus total it was made against.
    supabaseNfl
      .from("recommendations")
      .select("game_id, market_total")
      .eq("season", latest.season)
      .eq("week", latest.week)
      .eq("market", "totals"),
    fetchTeams(),
    fetchLatestRatings(),
  ]);

  // Ratings arrive sorted by power_rating desc, so position is the league
  // rank, the same number the ratings page shows.
  const rankByTeam = new Map(ratings.map((r, i) => [r.team_abbr, i + 1]));

  const games = (projRes.data ?? []) as NflGameProjection[];
  const marketByGame = new Map(
    ((marketRes.data ?? []) as NflMarketComparison[]).map((m) => [
      m.game_id,
      m,
    ])
  );
  const marketTotalByGame = new Map(
    (totalRes.data ?? []).map((row) => [row.game_id, row.market_total])
  );
  const slates = groupFootballSlates(games, "nfl");
  const lastUpdated = games[0]?.as_of ?? null;

  return (
    <main id="main" className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">NFL Schedule and Projections</h1>
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
        Model lines are quoted for the home team: a negative line means the
        model favors the home side. The published line blends the pure model
        with the market at a capped weight; Pure is the model&apos;s own
        opinion before that blend. Market is the best priced spread offer
        found when the forecast ran, or the consensus line when no priced
        offer was available.
      </p>

      <ScheduleFilters
        league="nfl"
        views={VIEWS}
        defaultView="all"
        total={games.length}
        initialShown={games.length}
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
                <TableHead className="text-center">Time</TableHead>
                <TableHead>Away</TableHead>
                <TableHead>Home</TableHead>
                <TableHead className="text-center">Pure</TableHead>
                <TableHead className="text-center">Model line</TableHead>
                <TableHead className="text-center">Market line</TableHead>
                <TableHead className="text-center">Diff</TableHead>
                <TableHead className="text-center">Proj score</TableHead>
                <TableHead className="text-center">Model total</TableHead>
                <TableHead className="text-center">Market total</TableHead>
              </TableRow>
            </TableHeader>
            {slates.map((slate) => (
              <TableBody key={slate.id}>
                {slate.games.map((g) => {
                  const market = marketByGame.get(g.game_id);
                  const marketLine =
                    marketHomeLine(
                      market?.best_offer_market ?? null,
                      market?.best_offer_selection ?? null,
                      market?.best_offer_point ?? null,
                      g.home_team
                    ) ?? g.market_home_spread;
                  const diff =
                    marketLine != null && g.home_spread != null
                      ? g.home_spread - marketLine
                      : null;
                  const awayRank = g.away_team_abbr
                    ? rankByTeam.get(g.away_team_abbr)
                    : undefined;
                  const homeRank = g.home_team_abbr
                    ? rankByTeam.get(g.home_team_abbr)
                    : undefined;
                  return (
                    // The filters read these rather than the rendered cells, so
                    // a query cannot accidentally hit a line, total or date.
                    <TableRow
                      key={g.game_id}
                      data-live={liveKey("nfl", g.game_id)}
                      data-search={`${g.away_team} ${g.home_team} ${g.away_team_abbr ?? ""} ${g.home_team_abbr ?? ""}`.toLowerCase()}
                      data-division={String(g.div_game === true)}
                    >
                      <KickoffCells start={g.start_date} />
                      <ScheduleTeamCell
                        name={g.away_team}
                        team={g.away_team_abbr != null ? teams.get(g.away_team_abbr) : undefined}
                        rank={awayRank}
                        markers={[qbMarker(g.away_qb_adjustment)]}
                      />
                      <ScheduleTeamCell
                        name={g.home_team}
                        team={g.home_team_abbr != null ? teams.get(g.home_team_abbr) : undefined}
                        rank={homeRank}
                        markers={[g.neutral_site && NEUTRAL, qbMarker(g.home_qb_adjustment)]}
                      />
                      <TableCell className="text-center font-mono tabular-nums text-muted-foreground">
                        {formatHomeLine(g.pure_home_spread)}
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold tabular-nums">
                        {formatHomeLine(g.home_spread)}
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums text-muted-foreground">
                        {marketLine != null ? formatHomeLine(marketLine) : "–"}
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums">
                        {diff != null ? formatHomeLine(diff) : "–"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-center font-mono tabular-nums">
                        {formatNumber(g.expected_away_points, 0)}&ndash;
                        {formatNumber(g.expected_home_points, 0)}
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums">
                        {formatNumber(g.model_total)}
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums text-muted-foreground">
                        {formatNumber(marketTotalByGame.get(g.game_id))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            ))}
          </Table>
        </div>
      </ScheduleFilters>

      <p className="max-w-4xl text-xs text-muted-foreground">
        Proj score is away&ndash;home expected points. Diff is model line minus
        market line. Market total is the consensus total when the total pick
        was decided, and nothing here is betting advice. QB marks a projected
        starter whose value differs meaningfully from the QB play baked into
        the team&apos;s rating; N marks a neutral site.
      </p>
    </main>
  );
}
