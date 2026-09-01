import { supabaseCfb } from "@/lib/supabase";
import { fetchLiveGradedSeason } from "@/lib/cfb";
import type { CfbBacktestPrediction, CfbGradedGame } from "@/lib/types";
import { pageNumber } from "@/lib/utils";
import {
  GradedHistoryTable,
  HistoryPager,
  SeasonLinks,
  type GradedRow,
} from "@/components/graded-history";

export const revalidate = 300;

const PAGE_SIZE = 50;
const FIRST_BACKTEST_SEASON = 2021;

// The live record carries the pure projection and the blend; the history
// table grades the pure one, which is the model's own opinion.
function fromGraded(r: CfbGradedGame): GradedRow {
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

function historyUrl(params: Record<string, string | number>) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== "") sp.set(key, String(value));
  }
  const query = sp.toString();
  return query ? `/cfb/history?${query}` : "/cfb/history";
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

  const [liveSeason, backtestSeasonRes] = await Promise.all([
    fetchLiveGradedSeason(),
    supabaseCfb
      .from("backtest_predictions")
      .select("season")
      .order("season", { ascending: false })
      .limit(1),
  ]);
  // With live graded games, the page opens on the live season; "backtest"
  // selects the full frozen history and a year selects one backtest season.
  const isLive =
    liveSeason != null && (season === "" || season === String(liveSeason));
  const backtestSeason = season === "" || season === "backtest" ? "" : season;

  let rows: GradedRow[] = [];
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
    if (team) query = query.or(`home_team.eq.${team},away_team.eq.${team}`);
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
    if (backtestSeason) query = query.eq("season", parseInt(backtestSeason, 10));
    if (team) query = query.or(`home_team.eq.${team},away_team.eq.${team}`);
    const { data, count, error } = await query;
    rows = (data ?? []) as CfbBacktestPrediction[];
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

  const seasonOptions = [
    ...(liveSeason != null
      ? [{ key: "live", label: `${liveSeason} live`, href: historyUrl({ team }) }]
      : []),
    {
      key: "backtest",
      label: "Backtest",
      href: historyUrl({ season: liveSeason == null ? "" : "backtest", team }),
    },
    ...backtestSeasons.map((s) => ({
      key: s,
      label: s,
      href: historyUrl({ season: s, team }),
    })),
  ];
  const activeKey = isLive ? "live" : backtestSeason || "backtest";

  return (
    <main id="main" className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-heading text-2xl tracking-tight">
          {isLive ? `${liveSeason} Graded Games` : "Backtest History"}
        </h1>
        <div className="text-xs text-muted-foreground">{totalRows} graded games</div>
      </div>

      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        {isLive
          ? "Every completed game graded live this season: the projection published before kickoff, the CFBD closing spread, and the final margin. Nothing is re-fit after a result is known. Lines are quoted for the home team."
          : "Every graded prediction from the frozen walk-forward backtest, next to the closing spread and the final margin. Backtest seasons are historical stand-ins, not live results. Lines are quoted for the home team."}
      </p>

      <SeasonLinks
        options={seasonOptions}
        activeKey={activeKey}
        team={team}
        clearHref={historyUrl({ season })}
      />

      {errorMessage ? (
        <p className="text-sm text-destructive">Could not load history: {errorMessage}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isLive
            ? "No completed games have been graded yet this season."
            : "No graded games match these filters."}
        </p>
      ) : (
        <GradedHistoryTable
          rows={rows}
          caption={isLive ? `${liveSeason} graded games` : "CFB backtest history"}
        />
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
        {isLive ? " Model is the pure projection, not the market-informed blend." : ""}
      </p>
    </main>
  );
}
