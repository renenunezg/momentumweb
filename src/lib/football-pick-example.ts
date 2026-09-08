import { supabaseCfb, supabaseNfl } from "@/lib/supabase";

export type PickExampleMarket = "h2h" | "spreads" | "totals";
export type PickExampleSide = "home" | "away" | "over" | "under";

// One recommendation row plus the projection fields that explain how its
// pricing mean was built, in a shape both football methodology pages share.
export interface PickExample {
  sport: "cfb" | "nfl";
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  startDate: string | null;
  market: PickExampleMarket;
  side: PickExampleSide;
  selection: string;
  point: number | null;
  price: number;
  provider: string | null;
  policyVersion: string;
  decisionAt: string;
  winProbability: number;
  pushProbability: number;
  probabilityEdge: number;
  expectedValuePerUnit: number;
  stakeUnits: number;
  pricingMean: number;
  sd: number;
  df: number;
  pureMean: number | null;
  marketMean: number | null;
  marketWeight: number | null;
  weights: number[] | null;
  outcome: string;
  profitUnits: number | null;
  homePoints: number | null;
  awayPoints: number | null;
}

const REC_COLUMNS =
  "game_id,season,week,start_date,home_team,away_team,market,side,selection,point,price,provider,policy_version,decision_at,win_probability,push_probability,probability_edge,expected_value_per_unit,stake_units,model_home_margin,model_total,margin_sd,total_sd,degrees_of_freedom,outcome,profit_units,home_points,away_points";

interface RecRow {
  game_id: string | number;
  season: number;
  week: number;
  start_date: string | null;
  home_team: string;
  away_team: string;
  market: string;
  side: string | null;
  selection: string | null;
  point: number | null;
  price: number | null;
  provider: string | null;
  policy_version: string;
  decision_at: string;
  win_probability: number | null;
  push_probability: number | null;
  probability_edge: number | null;
  expected_value_per_unit: number | null;
  stake_units: number;
  model_home_margin: number;
  model_total: number;
  margin_sd: number;
  total_sd: number;
  degrees_of_freedom: number | null;
  outcome: string;
  profit_units: number | null;
  home_points: number | null;
  away_points: number | null;
}

interface ProjRow {
  pure_home_margin: number | null;
  market_home_spread: number | null;
  market_weight: number | null;
  model_total: number | null;
}

const SETTLED = ["win", "loss", "push"];

function buildExample(
  sport: PickExample["sport"],
  rec: RecRow,
  proj: ProjRow | null,
  weights: number[] | null,
): PickExample | null {
  const market = rec.market;
  const side = rec.side;
  if (
    (market !== "h2h" && market !== "spreads" && market !== "totals") ||
    (side !== "home" && side !== "away" && side !== "over" && side !== "under") ||
    rec.price == null ||
    rec.win_probability == null ||
    rec.push_probability == null ||
    rec.probability_edge == null ||
    rec.expected_value_per_unit == null ||
    rec.degrees_of_freedom == null ||
    rec.selection == null
  )
    return null;

  const totals = market === "totals";
  const pricingMean = totals ? rec.model_total : rec.model_home_margin;
  const pureMean = totals
    ? (proj?.model_total ?? null)
    : (proj?.pure_home_margin ?? null);
  const weight = proj?.market_weight ?? null;
  // The totals row stores the already shrunk total, so the market total is
  // backed out of the blend; sides store the market spread directly.
  let marketMean: number | null = null;
  if (totals) {
    if (pureMean != null && weight != null && weight > 0 && pricingMean !== pureMean)
      marketMean = (pricingMean - (1 - weight) * pureMean) / weight;
  } else if (proj?.market_home_spread != null) {
    marketMean = -proj.market_home_spread;
  }

  return {
    sport,
    gameId: String(rec.game_id),
    homeTeam: rec.home_team,
    awayTeam: rec.away_team,
    startDate: rec.start_date,
    market,
    side,
    selection: rec.selection,
    point: rec.point,
    price: rec.price,
    provider: rec.provider,
    policyVersion: rec.policy_version,
    decisionAt: rec.decision_at,
    winProbability: rec.win_probability,
    pushProbability: rec.push_probability,
    probabilityEdge: rec.probability_edge,
    expectedValuePerUnit: rec.expected_value_per_unit,
    stakeUnits: rec.stake_units,
    pricingMean,
    sd: totals ? rec.total_sd : rec.margin_sd,
    df: rec.degrees_of_freedom,
    pureMean,
    marketMean,
    marketWeight: weight,
    weights,
    outcome: rec.outcome,
    profitUnits: rec.profit_units,
    homePoints: rec.home_points,
    awayPoints: rec.away_points,
  };
}

// The soonest unstarted recommended pick, or the most recently settled one
// when nothing is pending, so the example never shows a game in progress.
export async function fetchCfbPickExample(): Promise<PickExample | null> {
  const now = new Date().toISOString();
  const base = () =>
    supabaseCfb.from("recommendations").select(REC_COLUMNS).eq("status", "recommended");
  const upcoming = await base()
    .gt("start_date", now)
    .order("start_date", { ascending: true })
    .order("decision_at", { ascending: false })
    .limit(1);
  let rec = upcoming.data?.[0] as RecRow | undefined;
  if (!rec) {
    const settled = await base()
      .in("outcome", SETTLED)
      .order("start_date", { ascending: false })
      .limit(1);
    rec = settled.data?.[0] as RecRow | undefined;
  }
  if (!rec) return null;
  const proj = await supabaseCfb
    .from("game_projections")
    .select("pure_home_margin,market_home_spread,market_weight,model_total")
    .eq("game_id", Number(rec.game_id))
    .eq("season", rec.season)
    .eq("week", rec.week)
    .limit(1);
  return buildExample("cfb", rec, proj.data?.[0] ?? null, null);
}

export async function fetchNflPickExample(): Promise<PickExample | null> {
  const now = new Date().toISOString();
  const columns = `${REC_COLUMNS},pricing_weights`;
  const base = () =>
    supabaseNfl.from("recommendations").select(columns).eq("status", "recommended");
  const upcoming = await base()
    .gt("start_date", now)
    .order("start_date", { ascending: true })
    .order("decision_at", { ascending: false })
    .limit(1);
  let rec = upcoming.data?.[0] as (RecRow & { pricing_weights: unknown }) | undefined;
  if (!rec) {
    const settled = await base()
      .in("outcome", SETTLED)
      .order("start_date", { ascending: false })
      .limit(1);
    rec = settled.data?.[0] as (RecRow & { pricing_weights: unknown }) | undefined;
  }
  if (!rec) return null;
  const proj = await supabaseNfl
    .from("game_projections")
    .select("pure_home_margin,market_home_spread,market_weight,model_total")
    .eq("game_id", String(rec.game_id))
    .eq("season", rec.season)
    .eq("week", rec.week)
    .limit(1);
  const weights =
    Array.isArray(rec.pricing_weights) &&
    rec.pricing_weights.length === 201 &&
    rec.pricing_weights.every((w) => typeof w === "number")
      ? (rec.pricing_weights as number[])
      : null;
  return buildExample("nfl", rec, proj.data?.[0] ?? null, weights);
}
