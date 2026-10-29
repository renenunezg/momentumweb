import "server-only";
import { cache, type CSSProperties } from "react";
import { supabase, supabaseCfb, supabaseNfl, supabaseNhl } from "@/lib/supabase";
import { fetchLatestRatings as fetchCfbRatings, fetchLivePerformance } from "@/lib/cfb";
import { fetchForecastAccuracy as fetchNflAccuracy, fetchLatestRatings as fetchNflRatings } from "@/lib/nfl";
import { fetchForecastAccuracy as fetchNhlAccuracy, fetchLatestRatings as fetchNhlRatings } from "@/lib/nhl";
import {
  FORWARD_SYSTEM_LABELS,
  NFL_BASELINE_LABELS,
  describeGap,
  fetchCfbGradeValidation,
  fetchMlbForwardEvaluation,
  fetchNflGradeEvaluation,
  type ForwardComparison,
  type ForwardSystem,
} from "@/lib/grade-evaluation";
import { ratingHeatmap, sharedExtent } from "@/lib/rating-heatmap";
import type { TeamLogoSource } from "@/components/team-logo";

// Every number on the home page is read from what the model repos publish;
// this module only selects which published comparisons the page shows.

const range = (seasons: string) => seasons.replace("-", "–");

// The MLB grade's comparison with the public projection systems, from the
// evaluation block on the live model row.
const fetchMlbForward = cache(async () => {
  const current = await supabase.from("player_values").select("model_version").limit(1).maybeSingle();
  if (current.error || !current.data?.model_version) return null;
  return fetchMlbForwardEvaluation(current.data.model_version);
});

export interface SystemComparison {
  system: string;
  grade: number;
  benchmark: number;
  diff: number;
  ci: [number, number];
}

export interface MlbLead {
  seasons: number[];
  hitters: number;
  rows: SystemComparison[];
}

const SYSTEMS: ForwardSystem[] = ["zips", "steamer", "the_bat"];

export async function fetchMlbLead(): Promise<MlbLead | null> {
  const forward = await fetchMlbForward();
  const block = forward?.pools.hitter.full_grade_vs_war_rate_position_neutral?.preseason;
  if (!forward || !block) return null;
  const rows = SYSTEMS.flatMap((system) => {
    const c = block[system];
    return c ? [{ system: FORWARD_SYSTEM_LABELS[system], grade: c.rho_grade, benchmark: c.rho_system, diff: c.diff, ci: c.ci95 }] : [];
  });
  if (rows.length === 0) return null;
  return {
    seasons: forward.seasons,
    hitters: Math.round(Math.max(...SYSTEMS.map((s) => block[s]?.mean_n ?? 0))),
    rows,
  };
}

export type Verdict = "model" | "noise" | "benchmark";

export interface ComparisonRow {
  key: string;
  href: string;
  model: string;
  benchmark: string;
  measure: string;
  ours: string;
  theirs: string;
  diff: number;
  digits: number;
  extent: number;
  lowerIsBetter: boolean;
  verdict: Verdict;
  // Forecast errors are scored on every graded game and publish no interval,
  // so their verdict reads the sign alone and says so.
  hasInterval: boolean;
  sample: string;
}

function verdictOf(diff: number, ci: [number, number] | null, lowerIsBetter: boolean): Verdict {
  const flip = lowerIsBetter ? -1 : 1;
  if (!ci) return diff * flip > 0 ? "model" : diff * flip < 0 ? "benchmark" : "noise";
  const lo = Math.min(ci[0] * flip, ci[1] * flip);
  const hi = Math.max(ci[0] * flip, ci[1] * flip);
  const { verdict } = describeGap(diff * flip, lo, hi);
  return verdict === "clear of zero" ? "model" : verdict === "behind, clear of zero" ? "benchmark" : "noise";
}

// Steamer is the one system with a projection at every checkpoint for every
// pool; the MLB performance page lists ZiPS and THE BAT X beside it.
function mlbRow(key: string, model: string, benchmark: string, unit: string, c: ForwardComparison | undefined): ComparisonRow[] {
  if (!c) return [];
  return [{
    key,
    href: "/mlb/performance",
    model,
    benchmark,
    measure: "Rank correlation with rest-of-season value",
    ours: c.rho_grade.toFixed(2),
    theirs: c.rho_system.toFixed(2),
    diff: c.diff,
    digits: 2,
    extent: 0.15,
    lowerIsBetter: false,
    verdict: verdictOf(c.diff, c.ci95, false),
    hasInterval: true,
    sample: `${c.checkpoints} preseasons, about ${Math.round(c.mean_n)} ${unit}`,
  }];
}

async function mlbRows(): Promise<ComparisonRow[]> {
  const forward = await fetchMlbForward();
  if (!forward) return [];
  return [
    ...mlbRow("mlb-hitters", "MLB hitter grade", "Steamer WAR rate", "hitters", forward.pools.hitter.full_grade_vs_war_rate_position_neutral?.preseason.steamer),
    ...mlbRow("mlb-sp", "MLB starter grade", "Steamer projected FIP", "starters", forward.pools.SP.grade_vs_fip?.preseason.steamer),
    ...mlbRow("mlb-rp", "MLB reliever grade", "Steamer projected FIP", "relievers", forward.pools.RP.grade_vs_fip?.preseason.steamer),
  ];
}

// The QB rating against the public passer measures, on the cross-validated
// development seasons rather than the single, thinner validation season.
const QB_BASELINES = ["qbr", "dakota", "epa_prior"];

async function nflQbRows(): Promise<ComparisonRow[]> {
  const rows = await fetchNflGradeEvaluation();
  return QB_BASELINES.flatMap((baseline) => {
    const r = rows.find((row) => row.position_group === "QB" && row.evaluation === "rest_of_season"
      && row.sample_set === "development_cv" && row.baseline === baseline);
    if (!r || r.difference == null || r.grade_spearman == null || r.baseline_spearman == null) return [];
    const ci: [number, number] | null = r.difference_ci_low != null && r.difference_ci_high != null
      ? [r.difference_ci_low, r.difference_ci_high] : null;
    return [{
      key: `nfl-qb-${baseline}`,
      href: "/nfl/performance",
      model: "NFL QB rating",
      benchmark: NFL_BASELINE_LABELS[baseline] ?? baseline,
      measure: "Rank correlation with rest-of-season EPA per dropback",
      ours: r.grade_spearman.toFixed(2),
      theirs: r.baseline_spearman.toFixed(2),
      diff: r.difference,
      digits: 2,
      extent: 0.15,
      lowerIsBetter: false,
      verdict: verdictOf(r.difference, ci, false),
      hasInterval: ci != null,
      sample: `${r.player_seasons} passer-seasons, ${range(r.seasons)}`,
    }];
  });
}

function forecastRow(
  sport: "cfb" | "nfl" | "nhl",
  measure: string,
  ours: number,
  theirs: number,
  digits: number,
  extent: number,
  sample: string,
): ComparisonRow {
  const diff = ours - theirs;
  return {
    key: `${sport}-forecast`,
    href: `/${sport}/performance`,
    model: `${sport.toUpperCase()} game forecast`,
    benchmark: "Closing line",
    measure,
    ours: ours.toFixed(digits),
    theirs: theirs.toFixed(digits),
    diff,
    digits,
    extent,
    lowerIsBetter: true,
    verdict: verdictOf(diff, null, true),
    hasInterval: false,
    sample,
  };
}

// The published, market-informed forecast is graded, as on the performance page.
async function cfbForecastRow(): Promise<ComparisonRow[]> {
  const performance = await fetchLivePerformance();
  const overall = new Map(performance.metrics.filter((m) => m.segment_kind === "overall").map((m) => [m.prediction_source, m]));
  const published = overall.get("market_informed") ?? overall.get("pure_model");
  const market = overall.get("closing_market");
  if (!published?.games || published.margin_mae == null || market?.margin_mae == null) return [];
  return [forecastRow("cfb", "Margin MAE, points", published.margin_mae, market.margin_mae, 2, 1, `${published.games} games, ${performance.season}`)];
}

async function nflForecastRow(): Promise<ComparisonRow[]> {
  const accuracy = await fetchNflAccuracy("live");
  const latest = accuracy.bySeason.reduce<(typeof accuracy.bySeason)[number] | null>(
    (best, slice) => (!best || Number(slice.label) > Number(best.label) ? slice : best), null);
  if (!latest?.games) return [];
  return [forecastRow("nfl", "Margin MAE, points", latest.modelMae, latest.marketMae, 2, 1, `${latest.games} games, ${latest.label}`)];
}

// The closing moneyline is scored once 30 live games carry one, the site's
// thin-sample line; model and market are scored on the same games.
async function nhlForecastRow(): Promise<ComparisonRow[]> {
  const accuracy = await fetchNhlAccuracy("live");
  const latest = accuracy.by_season.reduce<(typeof accuracy.by_season)[number] | null>(
    (best, slice) => (!best || (slice.season ?? 0) > (best.season ?? 0) ? slice : best), null);
  const model = latest?.model_log_loss_on_market_games;
  const market = latest?.market_log_loss;
  if (!latest || model == null || market == null || latest.market_n < 30) return [];
  const season = latest.season == null ? "" : `, ${latest.season}-${String(latest.season + 1).slice(2)}`;
  return [forecastRow("nhl", "Log loss", model, market, 3, 0.02, `${latest.market_n} games with a close${season}`)];
}

// A failed source drops its rows rather than failing the page.
export async function fetchComparisons(): Promise<ComparisonRow[]> {
  const parts = await Promise.all(
    [mlbRows, nflQbRows, cfbForecastRow, nflForecastRow, nhlForecastRow].map((load) =>
      load().catch((error: unknown) => {
        console.error("home comparison unavailable:", error instanceof Error ? error.message : error);
        return [];
      }),
    ),
  );
  return parts.flat();
}

export interface PositionGap {
  position: string;
  diff: number;
  ci: [number, number] | null;
}

export interface PositionGaps {
  rows: PositionGap[];
  note: string;
}

const POSITION_ORDER = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB"];
const byPosition = (a: PositionGap, b: PositionGap) =>
  POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position);

// Both sports answer the same question: does this season's grade rank next
// season's EPA credit better than this season's EPA credit does?
export async function fetchPositionGaps(): Promise<{ nfl: PositionGaps | null; cfb: PositionGaps | null }> {
  const [nflRows, cfbRows] = await Promise.all([
    fetchNflGradeEvaluation().catch(() => []),
    fetchCfbGradeValidation().catch(() => []),
  ]);
  const nfl = nflRows.filter((r) => r.evaluation === "next_season" && r.sample_set === "development_cv"
    && r.baseline === "epa_credit" && r.difference != null);
  const cfb = cfbRows.filter((r) => r.eval_kind === "next_season" && r.diff_grade_minus_epa != null);
  const nflSeasons = nfl[0]?.seasons;
  const nflPlayers = nfl.reduce((sum, r) => sum + (r.player_seasons ?? 0), 0);
  const cfbPlayers = cfb.reduce((sum, r) => sum + (r.players ?? 0), 0);
  return {
    nfl: nfl.length ? {
      rows: nfl.map((r) => ({
        position: r.position_group,
        diff: r.difference!,
        ci: r.difference_ci_low != null && r.difference_ci_high != null ? [r.difference_ci_low, r.difference_ci_high] as [number, number] : null,
      })).sort(byPosition),
      note: `${nflPlayers.toLocaleString("en-US")} player-seasons, ${range(nflSeasons ?? "")}, each season held out in turn.`,
    } : null,
    cfb: cfb.length ? {
      rows: cfb.map((r) => ({
        position: r.position_group,
        diff: r.diff_grade_minus_epa!,
        ci: r.diff_lo_95 != null && r.diff_hi_95 != null ? [r.diff_lo_95, r.diff_hi_95] as [number, number] : null,
      })).sort(byPosition),
      note: `${cfbPlayers.toLocaleString("en-US")} players, ${range(cfb[0].seasons)} season pairs; ${cfb[0].holdout_status}.`,
    } : null,
  };
}

export interface CarryPuzzle {
  season: number;
  share: number;
  long: CarryBall;
  short: CarryBall;
}

export interface CarryBall {
  name: string;
  team: string | null;
  date: string;
  exit: number;
  launch: number;
  distance: number;
  expected: number;
}

interface PuzzleBall {
  player_id: number;
  date: string;
  exit: number;
  launch: number;
  distance: number;
  expected: number;
}

// Only the puzzle and the explained share are read from the study payload,
// and the two hitters' names from their rows, not the whole carry table.
export async function fetchCarryPuzzle(): Promise<CarryPuzzle | null> {
  const study = await supabase
    .from("carry_study")
    .select("season, balls:payload->puzzle->balls, share:payload->explained->share")
    .order("season", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (study.error || !study.data) return null;
  const balls = study.data.balls as unknown as PuzzleBall[] | null;
  const share = Number(study.data.share);
  // The pipeline lists the two best-carrying hitters' balls, then the two worst (worst first).
  const long = balls?.[0];
  const short = balls?.[2];
  if (!long || !short || !Number.isFinite(share)) return null;
  const names = await supabase
    .from("carry_hitters")
    .select("player_id, player_name, team")
    .eq("season", study.data.season)
    .in("player_id", [long.player_id, short.player_id]);
  if (names.error) return null;
  const who = new Map(names.data.map((h) => [h.player_id, h]));
  const ball = (b: PuzzleBall): CarryBall | null => {
    const hitter = who.get(b.player_id);
    return hitter ? { name: hitter.player_name, team: hitter.team, date: b.date, exit: b.exit, launch: b.launch, distance: b.distance, expected: b.expected } : null;
  };
  const longBall = ball(long);
  const shortBall = ball(short);
  return longBall && shortBall ? { season: study.data.season, share, long: longBall, short: shortBall } : null;
}

export interface RatedTeam {
  key: string;
  team: string;
  logo: TeamLogoSource | undefined;
  rating: number;
  heat: CSSProperties | undefined;
  offense: number | null;
  defense: number | null;
}

export interface LeagueRatings {
  period: string;
  digits: number;
  teams: RatedTeam[];
}

const SHOWN = 6;

// The heat scale spans the whole league, so the leaders read as they do on the
// ratings page, while only the top rows and their logos are sent.
function rank<T>(rows: T[], rating: (row: T) => number, build: (row: T) => Omit<RatedTeam, "heat" | "logo">) {
  const values = rows.map(rating);
  const heat = ratingHeatmap(values, { center: 0, extent: sharedExtent([values], 0.85) });
  return rows.slice(0, SHOWN).map((row) => ({ ...build(row), heat: heat(rating(row)) }));
}

async function logos<K extends string | number>(
  query: PromiseLike<{ data: ({ logo_light: string | null; logo_dark: string | null } & Record<string, unknown>)[] | null }>,
  key: string,
): Promise<Map<K, TeamLogoSource>> {
  const { data } = await query;
  return new Map((data ?? []).map((t) => [t[key] as K, t]));
}

export async function fetchHomeRatings(): Promise<{ cfb: LeagueRatings | null; nfl: LeagueRatings | null; nhl: LeagueRatings | null }> {
  const [cfb, nfl, nhl] = await Promise.all([
    fetchCfbRatings().catch(() => null),
    fetchNflRatings().catch(() => null),
    fetchNhlRatings().catch(() => null),
  ]);
  const fbs = cfb?.ratings.filter((r) => r.classification === "fbs") ?? [];
  const cfbTop = fbs.slice(0, SHOWN);
  const nflTop = nfl?.ratings.slice(0, SHOWN) ?? [];
  const nhlTop = nhl?.ratings.slice(0, SHOWN) ?? [];
  const [cfbLogos, nflLogos, nhlLogos] = await Promise.all([
    logos<number>(supabaseCfb.from("teams").select("team_id, logo_light, logo_dark").in("team_id", cfbTop.map((r) => r.team_id)), "team_id"),
    logos<string>(supabaseNfl.from("teams").select("team_abbr, logo_light, logo_dark").in("team_abbr", nflTop.map((r) => r.team_abbr)), "team_abbr"),
    logos<string>(supabaseNhl.from("teams").select("team_abbr, logo_light, logo_dark").in("team_abbr", nhlTop.map((r) => r.team_abbr)), "team_abbr"),
  ]);
  const asOf = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return {
    cfb: fbs.length && cfb ? {
      period: `Points better than average on a neutral field | ${cfb.season} week ${cfb.week} | ${fbs.length} FBS teams`,
      digits: 1,
      teams: rank(fbs, (r) => r.power_rating, (r) => ({ key: String(r.team_id), team: r.team, rating: r.power_rating, offense: r.offense_points, defense: r.defense_points }))
        .map((t, i) => ({ ...t, logo: cfbLogos.get(cfbTop[i].team_id) })),
    } : null,
    nfl: nflTop.length && nfl ? {
      period: `Points better than average on a neutral field | ${nfl.season} week ${nfl.week}`,
      digits: 1,
      teams: rank(nfl.ratings, (r) => r.power_rating, (r) => ({ key: r.team_abbr, team: r.team, rating: r.power_rating, offense: r.offense_points, defense: r.defense_points }))
        .map((t, i) => ({ ...t, logo: nflLogos.get(nflTop[i].team_abbr) })),
    } : null,
    nhl: nhlTop.length && nhl?.asOf ? {
      period: `Attack minus defense strength, home and away, 0 is average | ${asOf(nhl.asOf)}`,
      digits: 2,
      teams: rank(nhl.ratings, (r) => r.rating, (r) => ({ key: r.team_abbr, team: r.team, rating: r.rating, offense: null, defense: null }))
        .map((t, i) => ({ ...t, logo: nhlLogos.get(nhlTop[i].team_abbr) })),
    } : null,
  };
}
