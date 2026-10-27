import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database-schema";
import { seasonStatsLine, type SeasonStatsLine } from "@/lib/season-stats";
import { PROSPECT_PAGE, prospectSearchRegex, type ProspectFilters, type ProspectSort } from "@/lib/prospect-values";

// The prospect table, written weekly by mlbmodel: about 8,500 rows, so neither
// the page nor the browser ever holds all of it. Every read is one filtered,
// ordered page of forty with the card columns included, so opening a card
// costs no second request.

type ProspectValueRow = Tables<"mlb", "prospect_values">;

export type TipInput = [input: string, contribution: number];

export interface ProspectRow
  extends Omit<ProspectValueRow, "tip" | "trait_grades" | "trait_pcts" | "as_of" | "model_version" | "org_id" | "updated_at"> {
  tip: TipInput[];
  trait_grades: (number | null)[];
  trait_pcts: (number | null)[];
  season_stats: SeasonStatsLine | null;
}

export interface ProspectPage {
  rows: ProspectRow[];
  // Counted on the first page only; later pages extend a list whose size is known.
  total: number | null;
}

export interface ProspectSummary {
  updatedAt: string | null;
  season: number | null;
  graded: number;
  topGrade: Pick<ProspectRow, "player_name" | "org" | "position_group" | "peak_grade"> | null;
}

const TRAIT_COUNT = 9;

const COLUMNS =
  "player_id, player_name, org, team, team_id, level, position_group, age, bats, throws, headshot_url, season, draft_year, draft_round, draft_pick, signing_bonus_musd, acquired, peak_grade, peak_grade_low, peak_grade_high, peak_grade_percentile, grade_reason, p_regular, p_mlb, eta_season, trade_value_musd, trade_value_low, trade_value_high, market_value_musd, expected_control_war, peak_war, risk, on_40_man, mlb_ab_or_ip, service_days, season_sample, sample, tracked_share, trait_grades, trait_pcts, tip";

type OrderColumn = "trade_value_musd" | "peak_grade" | "p_regular" | "eta_season";

// Spec order: value, then grade, chance of a regular, and ETA. The leading
// column follows the chosen sort; sample and id keep ungraded rows (all nulls)
// in a stable, meaningful order so offsets never skip or repeat a row.
const ORDER: Record<ProspectSort, OrderColumn[]> = {
  value: ["trade_value_musd", "peak_grade", "p_regular", "eta_season"],
  grade: ["peak_grade", "trade_value_musd", "p_regular", "eta_season"],
  regular: ["p_regular", "trade_value_musd", "peak_grade", "eta_season"],
  eta: ["eta_season", "trade_value_musd", "peak_grade", "p_regular"],
};

function tipInputs(tip: unknown): TipInput[] {
  if (!Array.isArray(tip)) return [];
  return tip.filter(
    (pair): pair is TipInput =>
      Array.isArray(pair) && pair.length === 2 && typeof pair[0] === "string" && typeof pair[1] === "number" && Number.isFinite(pair[1])
  );
}

// A trait list is empty for an ungraded row or one entry per trait; any other
// length is a contract break, shown as missing traits rather than mislabeled ones.
function traitList(values: (number | null)[] | null): (number | null)[] {
  return Array.isArray(values) && values.length === TRAIT_COUNT ? values : [];
}

function toRow(row: Record<string, unknown>): ProspectRow {
  const raw = row as unknown as ProspectValueRow;
  return {
    ...(raw as unknown as ProspectRow),
    tip: tipInputs(raw.tip),
    trait_grades: traitList(raw.trait_grades as (number | null)[]),
    trait_pcts: traitList(raw.trait_pcts as (number | null)[]),
    season_stats: null,
  };
}

// The page's season lines, one keyed read; a prospect without a line this season has no stats block.
async function attachSeasonStats(rows: ProspectRow[]): Promise<void> {
  if (rows.length === 0) return;
  const res = await supabase
    .from("player_season_stats")
    .select("player_id, season, levels, stats")
    .eq("pool", "prospect")
    .in("player_id", rows.map((row) => row.player_id))
    .limit(PROSPECT_PAGE)
    .abortSignal(AbortSignal.timeout(10_000));
  if (res.error) throw new Error(`Prospect season stats read failed: ${res.error.message}`);
  const byId = new Map((res.data ?? []).map((row) => [row.player_id, seasonStatsLine(row)]));
  for (const row of rows) row.season_stats = byId.get(row.player_id) ?? null;
}

export async function fetchProspectPage(filters: ProspectFilters, offset: number): Promise<ProspectPage> {
  let query = supabase
    .from("prospect_values")
    .select(COLUMNS, offset === 0 ? { count: "exact" } : undefined);
  if (filters.org) query = query.eq("org", filters.org);
  if (filters.level) query = query.eq("level", filters.level);
  if (filters.position) query = query.eq("position_group", filters.position);
  if (filters.gradedOnly) query = query.not("peak_grade", "is", null);
  // A regex scan of under ten thousand short names, so no index is needed.
  if (filters.search) query = query.filter("player_name", "imatch", prospectSearchRegex(filters.search));
  for (const column of ORDER[filters.sort]) {
    query = query.order(column, { ascending: column === "eta_season", nullsFirst: false });
  }
  const res = await query
    .order("sample", { ascending: false, nullsFirst: false })
    .order("player_id", { ascending: true })
    .range(offset, offset + PROSPECT_PAGE - 1)
    .abortSignal(AbortSignal.timeout(10_000));
  // Callers turn a failed read into a kept ISR page or an uncached 503.
  if (res.error) throw new Error(`Prospect read failed: ${res.error.message}`);
  const rows = (res.data ?? []).map((row) => toRow(row as Record<string, unknown>));
  await attachSeasonStats(rows);
  return {
    rows,
    total: offset === 0 ? (res.count ?? null) : null,
  };
}

export async function fetchProspectSummary(): Promise<ProspectSummary> {
  const signal = AbortSignal.timeout(10_000);
  const [gradedRes, topRes] = await Promise.all([
    supabase.from("prospect_values").select("player_id", { count: "exact", head: true }).not("peak_grade", "is", null).abortSignal(signal),
    supabase
      .from("prospect_values")
      .select("player_name, org, position_group, peak_grade, season, updated_at")
      .order("peak_grade", { ascending: false, nullsFirst: false })
      .limit(1)
      .abortSignal(signal),
  ]);
  if (gradedRes.error) throw new Error(`Prospect count failed: ${gradedRes.error.message}`);
  if (topRes.error) throw new Error(`Prospect summary failed: ${topRes.error.message}`);
  const top = topRes.data?.[0] ?? null;
  return {
    updatedAt: top?.updated_at ?? null,
    season: top?.season ?? null,
    graded: gradedRes.count ?? 0,
    topGrade: top?.peak_grade != null ? top : null,
  };
}
