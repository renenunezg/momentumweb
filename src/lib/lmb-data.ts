import { keepLastGood } from "./keep-last-good";
import { notPublished } from "./lmb";
import type {
  LmbAwardBoardRow,
  LmbAwardModelRow,
  LmbCalibrationRow,
  LmbEvaluationRow,
  LmbGameRow,
  LmbLedgerRow,
  LmbModelOutputRow,
  LmbPlayerRatingModelRow,
  LmbPlayerRatingRow,
  LmbPlayoffOddsRow,
  LmbProspectRow,
} from "./lmb-types";
import { supabaseLmb, supabaseLmbCached } from "./supabase";

// Reads behind the LMB pages. The games page renders per request, so its
// reads report failure for the page to show. The performance and history
// pages are cached, so a failed read throws (keepLastGood) unless the schema
// is simply not published yet, which is an honest empty state.

type ReadError = { code?: string; message: string } | null;

function cachedOutcome(label: string, errors: ReadError[]): boolean {
  const error = errors.find((e) => e != null) ?? null;
  if (notPublished(error)) return false;
  keepLastGood(label, error);
  return true;
}

export async function fetchLmbSlate(date: string): Promise<{
  today: LmbModelOutputRow[];
  frozen: LmbModelOutputRow[];
  notPublished: boolean;
  unavailable: boolean;
}> {
  const [today, frozen] = await Promise.all([
    supabaseLmb.from("model_outputs").select("*").eq("date", date),
    supabaseLmb.from("model_outputs_season").select("*").eq("date", date),
  ]);
  const error = today.error ?? frozen.error;
  if (error && !notPublished(error)) console.error("LMB forecasts unavailable:", error.message);
  return {
    today: today.data ?? [],
    frozen: frozen.data ?? [],
    notPublished: notPublished(error),
    unavailable: error != null && !notPublished(error),
  };
}

export type LmbPerformance = {
  published: boolean;
  evaluation: LmbEvaluationRow[];
  calibration: LmbCalibrationRow[];
  ledger: LmbLedgerRow[];
  season: number | null;
};

export async function fetchLmbPerformance(): Promise<LmbPerformance> {
  const [evaluation, calibration] = await Promise.all([
    supabaseLmbCached.from("model_evaluation").select("*"),
    supabaseLmbCached.from("model_calibration").select("*").order("season", { ascending: false }).order("bin"),
  ]);
  const empty = { published: false, evaluation: [], calibration: [], ledger: [], season: null };
  if (!cachedOutcome("LMB evaluation", [evaluation.error, calibration.error])) return empty;
  const evaluationRows = evaluation.data ?? [];
  const season =
    evaluationRows.find((row) => row.window === "season")?.season ?? calibration.data?.[0]?.season ?? null;
  let ledger: LmbLedgerRow[] = [];
  if (season != null) {
    const res = await supabaseLmbCached
      .from("bet_ledger_v")
      .select("*")
      .eq("season", season)
      .order("date", { ascending: true })
      .order("game_pk", { ascending: true });
    if (!cachedOutcome("LMB ledger", [res.error])) return empty;
    ledger = res.data ?? [];
  }
  return {
    published: true,
    evaluation: evaluationRows,
    calibration: (calibration.data ?? []).filter((row) => row.season === season),
    ledger,
    season,
  };
}

// Games per history page; forecasts come two team rows to a game.
export const LMB_HISTORY_PAGE_SIZE = 25;

export type LmbForecastGame = {
  game_pk: number;
  date: string;
  away: LmbModelOutputRow;
  home: LmbModelOutputRow;
  result: Pick<LmbGameRow, "status" | "home_score" | "away_score"> | null;
};

const RESULT_COLUMNS = "game_pk,home_team,away_team,status,home_score,away_score";
type ResultRow = Pick<LmbGameRow, "game_pk" | "home_team" | "away_team" | "status" | "home_score" | "away_score">;

async function fetchResults(gamePks: number[]): Promise<{ results: Map<number, ResultRow>; error: ReadError }> {
  if (gamePks.length === 0) return { results: new Map(), error: null };
  const res = await supabaseLmbCached.from("games").select(RESULT_COLUMNS).in("game_pk", gamePks);
  return { results: new Map((res.data ?? []).map((row) => [row.game_pk, row])), error: res.error };
}

export async function fetchLmbForecastHistory(page: number): Promise<{
  published: boolean;
  games: LmbForecastGame[];
  totalGames: number;
}> {
  const rows = LMB_HISTORY_PAGE_SIZE * 2;
  const from = (page - 1) * rows;
  const res = await supabaseLmbCached
    .from("model_outputs_season")
    .select("*", { count: "exact" })
    .order("date", { ascending: false })
    .order("game_pk", { ascending: false })
    .order("is_home", { ascending: true })
    .range(from, from + rows - 1);
  if (!cachedOutcome("LMB forecast history", [res.error])) return { published: false, games: [], totalGames: 0 };
  const byGame = new Map<number, LmbModelOutputRow[]>();
  for (const row of res.data ?? []) byGame.set(row.game_pk, [...(byGame.get(row.game_pk) ?? []), row]);
  const { results, error } = await fetchResults([...byGame.keys()]);
  if (!cachedOutcome("LMB results", [error])) return { published: false, games: [], totalGames: 0 };
  const games: LmbForecastGame[] = [];
  for (const [pk, pair] of byGame) {
    const home = pair.find((row) => row.is_home);
    const away = pair.find((row) => !row.is_home);
    if (!home || !away) continue;
    games.push({ game_pk: pk, date: home.date, away, home, result: results.get(pk) ?? null });
  }
  return { published: true, games, totalGames: Math.ceil((res.count ?? 0) / 2) };
}

export type LmbLedgerEntry = LmbLedgerRow & { game: ResultRow | null };

export async function fetchLmbPickHistory(page: number): Promise<{
  published: boolean;
  picks: LmbLedgerEntry[];
  totalPicks: number;
}> {
  const from = (page - 1) * LMB_HISTORY_PAGE_SIZE;
  const res = await supabaseLmbCached
    .from("bet_ledger_v")
    .select("*", { count: "exact" })
    .order("date", { ascending: false })
    .order("game_pk", { ascending: false })
    .range(from, from + LMB_HISTORY_PAGE_SIZE - 1);
  if (!cachedOutcome("LMB pick history", [res.error])) return { published: false, picks: [], totalPicks: 0 };
  const picks = res.data ?? [];
  const { results, error } = await fetchResults(
    picks.map((row) => row.game_pk).filter((pk): pk is number => pk != null),
  );
  if (!cachedOutcome("LMB results", [error])) return { published: false, picks: [], totalPicks: 0 };
  return {
    published: true,
    picks: picks.map((row) => ({ ...row, game: row.game_pk == null ? null : results.get(row.game_pk) ?? null })),
    totalPicks: res.count ?? 0,
  };
}

// The latest snapshot of playoff odds: twenty clubs a snapshot, so two
// snapshots' worth of rows always holds the whole newest one.
export async function fetchLmbPlayoffOdds(): Promise<LmbPlayoffOddsRow[]> {
  const res = await supabaseLmbCached
    .from("playoff_odds")
    .select("*")
    .order("as_of", { ascending: false })
    .order("p_playoffs", { ascending: false })
    .limit(40);
  if (!cachedOutcome("LMB playoff odds", [res.error])) return [];
  const rows = res.data ?? [];
  return rows.filter((row) => row.as_of === rows[0].as_of);
}

// Every prospect of the newest snapshot, in rank order. raw_score is left out
// of the read: it is uncalibrated and the page shows ranks only.
export async function fetchLmbProspects(): Promise<LmbProspectRow[]> {
  const res = await supabaseLmbCached
    .from("prospects")
    .select("snapshot_season,player_id,name,role,age,team_id,team,level,mexican_born,role_rank,model_version,scored_at")
    .order("snapshot_season", { ascending: false })
    .order("role_rank", { ascending: true })
    .limit(2000);
  if (!cachedOutcome("LMB prospects", [res.error])) return [];
  const rows = res.data ?? [];
  return rows.filter((row) => row.snapshot_season === rows[0].snapshot_season);
}

// The newest frozen season's award boards and their models.
export async function fetchLmbAwards(): Promise<{
  season: number | null;
  models: LmbAwardModelRow[];
  rows: LmbAwardBoardRow[];
}> {
  const empty = { season: null, models: [], rows: [] };
  const models = await supabaseLmbCached.from("award_models").select("*").order("season", { ascending: false }).limit(20);
  if (!cachedOutcome("LMB award models", [models.error])) return empty;
  const season = models.data?.[0]?.season ?? null;
  if (season == null) return empty;
  const rows = await supabaseLmbCached
    .from("award_boards")
    .select("*")
    .eq("season", season)
    .order("rank", { ascending: true, nullsFirst: false });
  if (!cachedOutcome("LMB award boards", [rows.error])) return empty;
  return { season, models: (models.data ?? []).filter((model) => model.season === season), rows: rows.data ?? [] };
}

// The newest season's player ratings and the model row behind them. The
// table sits near the REST API's 1000-row page, so it is read a page at a time.
const RATING_PAGE = 1000;

export async function fetchLmbPlayerRatings(): Promise<{
  model: LmbPlayerRatingModelRow | null;
  rows: LmbPlayerRatingRow[];
}> {
  const model = await supabaseLmbCached.from("player_rating_model").select("*").eq("id", 1).maybeSingle();
  if (!cachedOutcome("LMB player rating model", [model.error])) return { model: null, rows: [] };
  const rows: LmbPlayerRatingRow[] = [];
  for (let from = 0; ; from += RATING_PAGE) {
    const page = await supabaseLmbCached
      .from("player_ratings")
      .select("*")
      .order("season", { ascending: false })
      .order("player_id", { ascending: true })
      .range(from, from + RATING_PAGE - 1);
    if (!cachedOutcome("LMB player ratings", [page.error])) return { model: null, rows: [] };
    rows.push(...(page.data ?? []));
    if ((page.data?.length ?? 0) < RATING_PAGE) break;
  }
  return { model: model.data, rows: rows.filter((row) => row.season === rows[0].season) };
}
