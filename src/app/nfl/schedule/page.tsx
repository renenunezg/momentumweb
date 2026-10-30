import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { Notice } from "@/components/notice";
import { buildSafe } from "@/lib/build-safe";
import { supabaseNfl } from "@/lib/supabase";
import { fetchLatestRatings, fetchTeams } from "@/lib/nfl";
import { formatHomeLine, marketHomeLine } from "@/lib/football";
import { groupFootballSlates } from "@/lib/football-slates";
import type { NflGameProjection, NflMarketComparison } from "@/lib/types";
import { formatNumber, formatSigned } from "@/lib/utils";
import { LastUpdated } from "@/components/last-updated";
import { KickoffCell, SlateRow } from "@/components/kickoff-cells";
import { liveKey } from "@/lib/football-live";
import { ScheduleFilters } from "@/components/schedule-filters";
import {
  ScheduleMatchupCell,
  ScheduleMatchupHead,
  type ScheduleMarker,
} from "@/components/schedule-matchup-cell";
import {
  ScheduleCards,
  type ScheduleCardGame,
} from "@/components/schedule-cards";
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
    note: `QB adjustment ${formatSigned(qb, 1)} pts: the projected starter differs meaningfully from the QB play in the team's rating.`,
  };
}

// Every read the page needs; a failed read throws so ISR keeps the last good
// page, except during the build (see buildSafe).
async function loadSchedule() {
  const latestRes = await supabaseNfl
    .from("game_projections")
    .select("season, week")
    .order("season", { ascending: false })
    .order("week", { ascending: false })
    .limit(1);
  if (latestRes.error) throw latestRes.error;
  const latest = latestRes.data?.[0];
  if (!latest) return { latest: null };

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
  const readError = projRes.error ?? marketRes.error ?? totalRes.error;
  if (readError) throw readError;
  return {
    latest,
    games: (projRes.data ?? []) as NflGameProjection[],
    markets: (marketRes.data ?? []) as NflMarketComparison[],
    totals: totalRes.data ?? [],
    teams,
    ratings,
  };
}

export default async function SchedulePage() {
  const read = await buildSafe("NFL schedule", loadSchedule);
  if (!read) {
    return (
      <PageShell>
        <PageTitle>NFL Schedule and Projections</PageTitle>
        <Notice role="status">Projections are temporarily unavailable.</Notice>
      </PageShell>
    );
  }
  if (read.latest === null) {
    return (
      <PageShell>
        <PageTitle>NFL Schedule and Projections</PageTitle>
        <p className="text-muted-foreground">
          No projections published yet. Run the publish pipeline to load them.
        </p>
      </PageShell>
    );
  }
  const { latest, games, markets, totals, teams, ratings } = read;

  // Ratings arrive sorted by power_rating desc, so position is the league
  // rank, the same number the ratings page shows.
  const rankByTeam = new Map(ratings.map((r, i) => [r.team_abbr, i + 1]));
  const marketByGame = new Map(markets.map((m) => [m.game_id, m]));
  const marketTotalByGame = new Map(
    totals.map((row) => [row.game_id, row.market_total])
  );
  const lastUpdated = games[0]?.as_of ?? null;

  // Everything the table row and the phone card both show, computed once.
  const slates = groupFootballSlates(games, "nfl").map((slate) => ({
    slate,
    hidden: false,
    games: slate.games.map((g) => {
      const market = marketByGame.get(g.game_id);
      const marketLine =
        marketHomeLine(
          market?.best_offer_market ?? null,
          market?.best_offer_selection ?? null,
          market?.best_offer_point ?? null,
          g.home_team
        ) ?? g.market_home_spread;
      const awayRank = g.away_team_abbr
        ? rankByTeam.get(g.away_team_abbr)
        : undefined;
      const homeRank = g.home_team_abbr
        ? rankByTeam.get(g.home_team_abbr)
        : undefined;
      const card: ScheduleCardGame = {
        gameId: g.game_id,
        liveKey: liveKey("nfl", g.game_id),
        start: g.start_date,
        away: {
          name: g.away_team,
          team:
            g.away_team_abbr != null ? teams.get(g.away_team_abbr) : undefined,
          rank: awayRank,
          markers: [qbMarker(g.away_qb_adjustment)],
        },
        home: {
          name: g.home_team,
          team:
            g.home_team_abbr != null ? teams.get(g.home_team_abbr) : undefined,
          rank: homeRank,
          markers: [g.neutral_site && NEUTRAL, qbMarker(g.home_qb_adjustment)],
        },
        // Rows published before the blended total existed carry only the
        // model's own.
        awayPoints: g.market_informed_away_points ?? g.expected_away_points,
        homePoints: g.market_informed_home_points ?? g.expected_home_points,
        homeLine: g.home_spread,
        marketLine,
        modelTotal: g.market_informed_total ?? g.model_total,
        marketTotal: marketTotalByGame.get(g.game_id) ?? null,
        picks: [],
        // The filters read these rather than the rendered cells, so a query
        // cannot accidentally hit a line, total or date.
        data: {
          "data-search":
            `${g.away_team} ${g.home_team} ${g.away_team_abbr ?? ""} ${g.home_team_abbr ?? ""}`.toLowerCase(),
          "data-division": String(g.div_game === true),
        },
        hidden: false,
      };
      return { g, card, pure: g.pure_home_spread };
    }),
  }));

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>NFL Schedule and Projections</PageTitle>
          <PageDescription className="type-eyebrow">
            {latest.season} · Week {latest.week} · {games.length} games
          </PageDescription>
        </div>
        <LastUpdated
          timestamp={lastUpdated}
          schedule="Updates when a new forecast is published"
        />
      </PageHeader>

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Model lines are quoted for the home team: a negative line means the
        model favors the home side. The published line blends the pure model
        with the market at a capped weight; Pure is the model&apos;s own
        opinion before that blend.
      </p>

      <ScheduleFilters
        league="nfl"
        views={VIEWS}
        defaultView="all"
        total={games.length}
        initialShown={games.length}
      >
        <ScheduleCards slates={slates} />
        {/* Everything is centered except the matchup column, whose ragged
            name lengths read badly off a center axis. */}
        <Table className="max-md:hidden">
          <TableCaption className="sr-only">
            Week {latest.week} projections against the market
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Time</TableHead>
              <ScheduleMatchupHead />
              <TableHead className="text-center">Pure</TableHead>
              <TableHead className="text-center">Model line</TableHead>
              <TableHead className="text-center">Market line</TableHead>
              <TableHead className="text-center">Diff</TableHead>
              <TableHead className="text-center">Proj score</TableHead>
              <TableHead className="text-center">Model total</TableHead>
              <TableHead className="text-center">Market total</TableHead>
            </TableRow>
          </TableHeader>
          {slates.map(({ slate, games }) => (
            <TableBody key={slate.id} data-slate>
              <SlateRow slate={slate} columns={9} />
              {games.map(({ g, card, pure }) => {
                const diff =
                  card.marketLine != null && card.homeLine != null
                    ? card.homeLine - card.marketLine
                    : null;
                return (
                  <TableRow
                    key={g.game_id}
                    data-live={card.liveKey}
                    data-game={g.game_id}
                    data-away={g.away_team}
                    data-home={g.home_team}
                    {...card.data}
                  >
                    <KickoffCell start={g.start_date} />
                    <ScheduleMatchupCell away={card.away} home={card.home} />
                    <TableCell className="text-center font-mono tabular-nums text-muted-foreground">
                      {formatHomeLine(pure)}
                    </TableCell>
                    <TableCell className="text-center font-mono font-semibold tabular-nums">
                      {formatHomeLine(card.homeLine)}
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums text-muted-foreground">
                      {formatHomeLine(card.marketLine)}
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums">
                      {formatHomeLine(diff)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-center font-mono tabular-nums">
                      {formatNumber(card.awayPoints, 0)}
                      &ndash;
                      {formatNumber(card.homePoints, 0)}
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums">
                      {formatNumber(card.modelTotal)}
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums text-muted-foreground">
                      {formatNumber(card.marketTotal)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          ))}
        </Table>
      </ScheduleFilters>

      <p className="max-w-4xl text-xs text-muted-foreground">
        Proj score is away&ndash;home expected points. Diff is model line minus
        market line. Market total is the consensus total when the total prediction
        was decided, and nothing here is wagering advice. QB marks a projected
        starter whose value differs meaningfully from the QB play baked into
        the team&apos;s rating; N marks a neutral site.
      </p>
    </PageShell>
  );
}
