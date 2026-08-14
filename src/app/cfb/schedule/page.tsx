import { supabaseCfb } from "@/lib/supabase";
import {
  formatHomeLine,
  formatKickoffEt,
  marketHomeLine,
} from "@/lib/cfb";
import type { CfbGameProjection, CfbMarketComparison } from "@/lib/types";
import { LastUpdated } from "@/components/last-updated";
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

  const [projRes, marketRes] = await Promise.all([
    supabaseCfb
      .from("game_projections")
      .select("*")
      .eq("season", latest.season)
      .eq("week", latest.week)
      .order("start_date", { ascending: true })
      .order("game_id", { ascending: true }),
    supabaseCfb.from("market_comparisons").select("*"),
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kick</TableHead>
              <TableHead>Matchup</TableHead>
              <TableHead className="text-right">Proj score</TableHead>
              <TableHead className="text-right">Model line</TableHead>
              <TableHead className="text-right">Market line</TableHead>
              <TableHead className="text-right">Diff</TableHead>
              <TableHead className="text-right">Total</TableHead>
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
              const degraded =
                (g.home_missing_input_count ?? 0) >= 4 ||
                (g.away_missing_input_count ?? 0) >= 4;
              return (
                <TableRow key={g.game_id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {formatKickoffEt(g.start_date)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {g.away_team}
                      <span className="text-muted-foreground">
                        {" "}
                        {g.neutral_site ? "vs" : "@"}{" "}
                      </span>
                      {g.home_team}
                    </span>
                    {degraded && (
                      <span
                        className="ml-2 font-mono text-[10px] uppercase tracking-wider text-accent-amber"
                        title="Several rating inputs are unavailable for one side of this game; treat the line as degraded."
                      >
                        Limited data
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                    {fmt(g.expected_away_points, 0)}&ndash;
                    {fmt(g.expected_home_points, 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold tabular-nums">
                    {formatHomeLine(g.home_spread)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {marketLine != null ? formatHomeLine(marketLine) : "–"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {diff != null ? formatHomeLine(diff) : "–"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
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
        an edge, and nothing here is betting advice.
      </p>
    </main>
  );
}
