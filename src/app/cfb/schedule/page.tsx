import { supabaseCfb } from "@/lib/supabase";
import {
  fetchTeams,
  formatHomeLine,
  formatKickoffDay,
  formatKickoffTime,
  marketHomeLine,
} from "@/lib/cfb";
import { teamColor } from "@/lib/team-colors";
import type {
  CfbGameProjection,
  CfbMarketComparison,
  CfbTeamIdentity,
} from "@/lib/types";
import { LastUpdated } from "@/components/last-updated";
import { TeamLogo } from "@/components/team-logo";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export const revalidate = 300;

function fmt(value: number | null, decimals = 1): string {
  if (value == null) return "–";
  return value.toFixed(decimals);
}

// One side of a matchup: logo, name, and the team's primary color as an edge
// bar plus a faint tint. A cell with no bar means CFBD has no primary color on
// file for that team (four in D1, including Chicago State and West Florida).
function TeamCell({
  name,
  team,
  degraded,
  marker,
}: {
  name: string;
  team: CfbTeamIdentity | undefined;
  degraded: boolean;
  marker?: string;
}) {
  const color = teamColor(team);
  return (
    <TableCell
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
        <TeamLogo team={team} />
        <span className="font-medium">{name}</span>
        {marker && (
          <span
            className="font-mono text-[10px] uppercase tracking-wider opacity-70"
            title="Neutral site: neither team is at home."
          >
            {marker}
          </span>
        )}
        {degraded && (
          <span
            className="font-mono text-xs opacity-70"
            title="Several rating inputs are unavailable for this team; treat the line as degraded."
          >
            *
          </span>
        )}
      </span>
    </TableCell>
  );
}

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
      <main className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8">
        <h1 className="font-heading text-2xl tracking-tight">Schedule</h1>
        <p className="mt-4 text-muted-foreground">
          No projections published yet. Run the publish pipeline to load them.
        </p>
      </main>
    );
  }

  const [projRes, marketRes, teams] = await Promise.all([
    supabaseCfb
      .from("game_projections")
      .select("*")
      .eq("season", latest.season)
      .eq("week", latest.week)
      .order("start_date", { ascending: true })
      .order("game_id", { ascending: true }),
    supabaseCfb.from("market_comparisons").select("*"),
    fetchTeams(),
  ]);

  const games = (projRes.data ?? []) as CfbGameProjection[];
  const marketByGame = new Map(
    ((marketRes.data ?? []) as CfbMarketComparison[]).map((m) => [
      m.game_id,
      m,
    ])
  );
  const lastUpdated = games[0]?.as_of ?? null;

  return (
    <main className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Schedule</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {latest.season} · Week {latest.week} · {games.length} games
          </p>
        </div>
        <LastUpdated
          timestamp={lastUpdated}
          schedule="Updates when a new forecast is published"
        />
      </div>

      <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
        Model lines are quoted for the home team: a negative line means the
        model favors the home side. Market is the best priced spread offer
        found when the forecast ran, converted to the same home axis. No plays
        are recommended pregame.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        {/* Everything is centered except the two team columns, whose ragged
            name lengths read badly off a center axis. */}
        <Table>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {games.map((g) => {
              const market = marketByGame.get(g.game_id);
              const marketLine = marketHomeLine(
                market?.best_offer_market ?? null,
                market?.best_offer_selection ?? null,
                market?.best_offer_point ?? null,
                g.home_team
              );
              const diff =
                marketLine != null && g.home_spread != null
                  ? g.home_spread - marketLine
                  : null;
              return (
                <TableRow key={g.game_id}>
                  <TableCell className="whitespace-nowrap text-center text-xs text-muted-foreground">
                    {formatKickoffDay(g.start_date)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-center text-xs text-muted-foreground">
                    {formatKickoffTime(g.start_date)}
                  </TableCell>
                  <TeamCell
                    name={g.away_team}
                    team={
                      g.away_team_id != null
                        ? teams.get(g.away_team_id)
                        : undefined
                    }
                    degraded={(g.away_missing_input_count ?? 0) >= 4}
                  />
                  <TeamCell
                    name={g.home_team}
                    team={
                      g.home_team_id != null
                        ? teams.get(g.home_team_id)
                        : undefined
                    }
                    degraded={(g.home_missing_input_count ?? 0) >= 4}
                    marker={g.neutral_site ? "N" : undefined}
                  />
                  <TableCell className="text-center font-mono font-semibold tabular-nums">
                    {formatHomeLine(g.home_spread)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-center font-mono tabular-nums">
                    {fmt(g.expected_away_points, 0)}&ndash;
                    {fmt(g.expected_home_points, 0)}
                  </TableCell>
                  <TableCell className="text-center font-mono tabular-nums text-muted-foreground">
                    {marketLine != null ? formatHomeLine(marketLine) : "–"}
                  </TableCell>
                  <TableCell className="text-center font-mono tabular-nums">
                    {diff != null ? formatHomeLine(diff) : "–"}
                  </TableCell>
                  <TableCell className="text-center font-mono tabular-nums">
                    {fmt(g.model_total)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Proj score is away&ndash;home expected points. Diff is model line minus
        market line: a large gap usually reflects degraded inputs rather than
        an edge, and nothing here is betting advice. A star marks a team whose
        rating inputs are incomplete; N marks a neutral site.
      </p>
    </main>
  );
}
