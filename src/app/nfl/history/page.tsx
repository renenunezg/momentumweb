import { supabaseNfl } from "@/lib/supabase";
import type { NflBacktestPrediction } from "@/lib/types";
import { pageNumber } from "@/lib/utils";
import {
  GradedHistoryTable,
  HistoryPager,
  SeasonLinks,
} from "@/components/graded-history";

export const revalidate = 300;

const PAGE_SIZE = 50;
const FIRST_SEASON = 2016;

function historyUrl(params: Record<string, string | number>) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== "") sp.set(key, String(value));
  }
  const query = sp.toString();
  return query ? `/nfl/history?${query}` : "/nfl/history";
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; team?: string; page?: string }>;
}) {
  const params = await searchParams;
  const season = params.season ?? "";
  const team = params.team ?? "";
  const page = pageNumber(params.page);
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabaseNfl
    .from("backtest_predictions")
    .select("*", { count: "exact" })
    .order("season", { ascending: false })
    .order("week", { ascending: false })
    .order("game_id", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);
  if (season) query = query.eq("season", parseInt(season, 10));
  if (team) query = query.or(`home_team.eq.${team},away_team.eq.${team}`);

  const [{ data, count, error }, seasonsRes] = await Promise.all([
    query,
    supabaseNfl
      .from("backtest_predictions")
      .select("season")
      .order("season", { ascending: false })
      .limit(1),
  ]);

  const rows = (data ?? []) as NflBacktestPrediction[];
  const totalRows = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const latestSeason = seasonsRes.data?.[0]?.season ?? null;
  const seasonOptions =
    latestSeason == null
      ? []
      : Array.from({ length: latestSeason - FIRST_SEASON + 1 }, (_, i) =>
          String(latestSeason - i)
        );

  return (
    <main id="main" className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-heading text-2xl tracking-tight">Backtest History</h1>
        <div className="text-xs text-muted-foreground">{totalRows} graded games</div>
      </div>

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Every graded prediction from the frozen walk-forward backtest, next to
        the closing spread and the final margin. Lines are quoted for the home
        team.
      </p>

      <SeasonLinks
        options={[
          { key: "", label: "All", href: historyUrl({ team }) },
          ...seasonOptions.map((s) => ({
            key: s,
            label: s,
            href: historyUrl({ season: s, team }),
          })),
        ]}
        activeKey={season}
        team={team}
        clearHref={historyUrl({ season })}
      />

      {error ? (
        <p className="text-sm text-destructive">Could not load history: {error.message}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No graded games match these filters.
        </p>
      ) : (
        <GradedHistoryTable rows={rows} caption="NFL backtest history" />
      )}

      <HistoryPager
        page={page}
        totalPages={totalPages}
        pageUrl={(p) => historyUrl({ season, team, page: p })}
      />

      <p className="text-xs text-muted-foreground">
        Model and Close are home lines; Result is the final margin on the same
        axis. Model err is the absolute miss of the model&apos;s margin, shown
        green when the model was closer than the closing line.
      </p>
    </main>
  );
}
