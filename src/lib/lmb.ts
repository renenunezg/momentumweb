import type { TeamLogoSource } from "@/components/team-logo";
import type { Json } from "./database.types";
import { toLiveScore, type LiveScore, type MlbScheduleGame } from "./mlb-live-scores";
import type { LmbLedgerRow, LmbModelOutputRow, LmbPlayerRatingRow } from "./lmb-types";
import type { SeasonStat, SeasonStatsData } from "./season-stats";
import { EMPTY, formatNumber, formatSigned } from "./utils";

// The Stats API serves the LMB as sport 23, league 125. These game types are
// the ones lmb.games accepts (regular season and the playoff rounds), which
// leaves out spring and exhibition games.
export const LMB_SCHEDULE_SCOPE = "sportId=23&leagueId=125&gameType=R,F,D,L,W";

// Display names by the code the model writes to lmb.games, with the Stats API
// team id behind each logo. The Stats API spells the names without accents,
// so they are transcribed here rather than read from it.
const LMB_TEAMS: Record<string, { name: string; id: number }> = {
  AGS: { name: "Rieleros de Aguascalientes", id: 528 },
  CAM: { name: "Piratas de Campeche", id: 523 },
  CHI: { name: "Dorados de Chihuahua", id: 575 },
  DUR: { name: "Caliente de Durango", id: 4444 },
  JAL: { name: "Charros de Jalisco", id: 6304 },
  LAG: { name: "Algodoneros Unión Laguna", id: 447 },
  LAR: { name: "Tecos de los Dos Laredos", id: 536 },
  LEO: { name: "Bravos de León", id: 434 },
  MEX: { name: "Diablos Rojos del México", id: 532 },
  MTY: { name: "Sultanes de Monterrey", id: 562 },
  MVA: { name: "Acereros del Norte", id: 560 },
  OAX: { name: "Guerreros de Oaxaca", id: 579 },
  PUE: { name: "Pericos de Puebla", id: 520 },
  QRO: { name: "Conspiradores de Querétaro", id: 6303 },
  SLW: { name: "Saraperos de Saltillo", id: 502 },
  TAB: { name: "Olmecas de Tabasco", id: 442 },
  TIG: { name: "Tigres de Quintana Roo", id: 569 },
  TIJ: { name: "Toros de Tijuana", id: 5010 },
  VER: { name: "El Águila de Veracruz", id: 5567 },
  YUC: { name: "Leones de Yucatán", id: 496 },
};

const CODE_BY_ID = new Map(Object.entries(LMB_TEAMS).map(([code, team]) => [team.id, code]));

export function lmbTeamName(code: string): string {
  return LMB_TEAMS[code]?.name ?? code;
}

export function lmbTeamCode(statsApiId: number | undefined): string | undefined {
  return statsApiId == null ? undefined : CODE_BY_ID.get(statsApiId);
}

// Accents and case dropped, since the Stats API's names come without accents.
const fold = (name: string) => name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const CODE_BY_NAME = new Map(Object.entries(LMB_TEAMS).map(([code, team]) => [fold(team.name), code]));

// The code for a club's full name as the Stats API spells it ("Diablos Rojos del Mexico").
export function lmbTeamCodeByName(name: string | null | undefined): string | undefined {
  return name ? CODE_BY_NAME.get(fold(name)) : undefined;
}

// The Stats API's logo CDN carries every club it serves under its team id:
// the LMB, the Mexican Pacific League and the affiliated minors.
export function statsApiTeamLogo(teamId: number | null | undefined): TeamLogoSource | undefined {
  if (teamId == null) return undefined;
  const url = `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
  return { logo_light: url, logo_dark: url };
}

export function lmbTeamLogo(code: string): TeamLogoSource | undefined {
  return statsApiTeamLogo(LMB_TEAMS[code]?.id);
}

// lmb.prospects levels join the leagues a prospect played in with "+".
const LEVEL_LABELS: Record<string, string> = { lmb: "LMB", lmp: "LMP", milb: "MiLB" };

export function lmbLevelLabel(level: string): string {
  return level.split("+").map((part) => LEVEL_LABELS[part] ?? part.toUpperCase()).join(" + ");
}

// Kalshi quotes yes contracts in dollars; a price of 0.54 is 54 cents and
// implies a 54% chance. Sub-cent prices keep one decimal.
export function formatCents(price: number | null | undefined): string {
  if (price == null) return EMPTY;
  const cents = Math.round(price * 1000) / 10;
  return `${Number.isInteger(cents) ? cents.toFixed(0) : cents.toFixed(1)}¢`;
}

export type LmbPickTier = "value" | "lean" | "minimum";

export const TIER_LABELS: Record<LmbPickTier, string> = {
  value: "Value",
  lean: "Lean",
  minimum: "Daily minimum",
};

export type LmbPick = {
  team: string;
  probability: number;
  price: number;
  fee: number;
  expected_value: number;
  tier: LmbPickTier;
};

function isTier(value: unknown): value is LmbPickTier {
  return value === "value" || value === "lean" || value === "minimum";
}

function contextObject(context: Json, key: string): { [key: string]: Json | undefined } | null {
  if (!context || typeof context !== "object" || Array.isArray(context)) return null;
  const value = context[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

// prediction_context.pick, written on both of a game's rows. A pick missing a
// field it is graded on is not shown, since it could not be the graded one.
export function parsePick(context: Json): LmbPick | null {
  const pick = contextObject(context, "pick");
  if (!pick) return null;
  const { team, probability, price, fee, expected_value, tier } = pick;
  if (
    typeof team !== "string" ||
    typeof probability !== "number" ||
    typeof price !== "number" ||
    typeof fee !== "number" ||
    typeof expected_value !== "number" ||
    !isTier(tier)
  ) {
    return null;
  }
  return { team, probability, price, fee, expected_value, tier };
}

// The row's own team's probable starter, by Stats API person id; null until
// one is announced.
export type LmbStarter = { id: number; name: string };

export function parseStarter(context: Json): LmbStarter | null {
  const starter = contextObject(context, "starter");
  if (!starter) return null;
  const { id, name } = starter;
  return typeof id === "number" && typeof name === "string" ? { id, name } : null;
}

export function tierLabel(tier: string | null): string {
  return isTier(tier) ? TIER_LABELS[tier] : (tier ?? EMPTY);
}

// PostgREST answers PGRST106 while the lmb schema is not exposed to the REST
// API, which until the model repo's migration is applied means nothing has
// been published. Any other failure is an outage.
export function notPublished(error: { code?: string } | null): boolean {
  return error?.code === "PGRST106";
}

export type LmbScheduleGame = MlbScheduleGame & {
  gameDate?: string;
  venue?: { name?: string };
  teams?: { home?: { team?: { id?: number; name?: string } }; away?: { team?: { id?: number; name?: string } } };
};

export type LmbMatchup = {
  game_pk: number;
  start_time: string | null;
  venue: string | null;
  away: LmbModelOutputRow;
  home: LmbModelOutputRow;
  // Only a frozen row's pick is shown once a game starts, so the pick on the
  // page is the one bet_ledger_v grades.
  pick: LmbPick | null;
  // The rows shown are the ones model_outputs_season froze at first pitch.
  frozen: boolean;
  live: LiveScore | null;
};

const LIVE_STATES = new Set(["Live", "Final"]);

// A game's rows from model_outputs before first pitch; after it, the rows
// model_outputs_season froze at first pitch, or no pick when none were frozen.
export function slateMatchups(
  today: LmbModelOutputRow[],
  frozen: LmbModelOutputRow[],
  schedule: Map<number, LmbScheduleGame>,
  now = Date.now(),
): LmbMatchup[] {
  const byGame = (rows: LmbModelOutputRow[]) => {
    const games = new Map<number, LmbModelOutputRow[]>();
    for (const row of rows) games.set(row.game_pk, [...(games.get(row.game_pk) ?? []), row]);
    return games;
  };
  const todayRows = byGame(today);
  const frozenRows = byGame(frozen);
  const matchups: LmbMatchup[] = [];
  for (const pk of new Set([...todayRows.keys(), ...frozenRows.keys()])) {
    const game = schedule.get(pk);
    const live = game ? toLiveScore(game) : null;
    const anyRow = (todayRows.get(pk) ?? frozenRows.get(pk))![0];
    const start = anyRow.start_time ? Date.parse(anyRow.start_time) : NaN;
    const started =
      LIVE_STATES.has(live?.abstract_state ?? "") || (!Number.isNaN(start) && start <= now);
    const isFrozen = started && frozenRows.has(pk);
    const rows = isFrozen ? frozenRows.get(pk)! : todayRows.get(pk) ?? frozenRows.get(pk)!;
    const home = rows.find((row) => row.is_home);
    const away = rows.find((row) => !row.is_home);
    if (!home || !away) continue;
    matchups.push({
      game_pk: pk,
      start_time: home.start_time,
      venue: game?.venue?.name ?? null,
      away,
      home,
      pick: !started || isFrozen ? parsePick(home.prediction_context) : null,
      frozen: isFrozen,
      live,
    });
  }
  return matchups.sort(
    (a, b) =>
      Number(b.pick != null) - Number(a.pick != null) ||
      (a.start_time ?? "").localeCompare(b.start_time ?? ""),
  );
}

// Per-tier record of graded picks: flat 1u stakes, so ROI is units per pick.
export type TierRecord = {
  tier: string;
  picks: number;
  wins: number;
  losses: number;
  units: number;
  meanPrice: number | null;
};

export function ledgerByTier(rows: LmbLedgerRow[]): TierRecord[] {
  const records = new Map<string, TierRecord>();
  for (const row of rows) {
    if (row.won == null || row.units == null) continue;
    const tier = row.tier ?? "unknown";
    const record = records.get(tier) ?? { tier, picks: 0, wins: 0, losses: 0, units: 0, meanPrice: 0 };
    record.picks += 1;
    record.wins += row.won ? 1 : 0;
    record.losses += row.won ? 0 : 1;
    record.units += row.units;
    record.meanPrice = (record.meanPrice ?? 0) + (row.price ?? 0) + (row.fee ?? 0);
    records.set(tier, record);
  }
  const order = ["value", "lean", "minimum"];
  return [...records.values()]
    .map((record) => ({ ...record, meanPrice: record.picks ? (record.meanPrice ?? 0) / record.picks : null }))
    .sort((a, b) => (order.indexOf(a.tier) + 1 || 99) - (order.indexOf(b.tier) + 1 || 99));
}

// The validation block of an lmb.award_models backtest: how often the model's
// favorite won the held-out races, beside a baseline that names no stat.
export type LmbAwardValidation = { hits: number; races: number; baseline_hits: number; years: number[] };

export function parseAwardValidation(backtest: Json): LmbAwardValidation | null {
  const validation = contextObject(backtest, "validation");
  if (!validation) return null;
  const { hits, races, baseline_hits, years } = validation;
  if (
    typeof hits !== "number" ||
    typeof races !== "number" ||
    races <= 0 ||
    typeof baseline_hits !== "number" ||
    !Array.isArray(years) ||
    !years.every((year) => typeof year === "number")
  ) {
    return null;
  }
  return { hits, races, baseline_hits, years: years as number[] };
}

// The parts of lmb.player_rating_model.details the players page explains
// itself with: the season's runs per win, the team-wins check, replacement
// level and the position adjustment per 162 games.
export type LmbRatingModel = {
  runsPerWin: number | null;
  reconciliation: { r: number; teams: number } | null;
  replacementWinPct: number | null;
  positional: Record<string, number>;
};

const finite = (value: Json | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export function parseRatingModel(details: Json, season: number): LmbRatingModel {
  const check = contextObject(contextObject(details, "validation") ?? {}, "team_reconciliation");
  const r = finite(check?.r);
  const teams = finite(check?.teams);
  const positional = Object.entries(contextObject(details, "positional_runs_per_162") ?? {}).flatMap(([pos, runs]) => {
    const value = finite(runs);
    return value == null ? [] : [[pos, value] as const];
  });
  return {
    runsPerWin: finite(contextObject(details, "runs_per_win")?.[String(season)]),
    reconciliation: r != null && teams != null ? { r, teams } : null,
    replacementWinPct: finite(contextObject(details, "replacement")?.team),
    positional: Object.fromEntries(positional),
  };
}

const MILB_LEVEL_LABELS: Record<number, string> = {
  1: "Rookie",
  2: "Single-A",
  3: "High-A",
  4: "Double-A",
  5: "Triple-A",
};

export function milbLevelName(level: number): string | null {
  return MILB_LEVEL_LABELS[level] ?? null;
}

export type LmbProspectStatLine = {
  source?: string;
  g: number;
  gs?: number;
  pa?: number;
  ab?: number;
  h: number;
  d2?: number;
  d3?: number;
  hr: number;
  bb: number;
  hbp: number;
  so: number;
  bf?: number;
  outs?: number;
};

export type LmbProspectDetails = {
  position: string | null;
  throws: string | null;
  milbLevel: number;
  ageRel: number | null;
  windowOpp: number;
  seasonOpp: number;
  oppBySource: { lmb: number; lmp: number; milb: number };
  drivers: [string, number][];
  percentiles: Record<string, number>;
  seasonStats: LmbProspectStatLine | null;
  splits: LmbProspectStatLine[];
};

function parseStatLine(value: Json | undefined): LmbProspectStatLine | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const g = finite(value.g);
  const h = finite(value.h);
  const hr = finite(value.hr);
  const bb = finite(value.bb);
  const hbp = finite(value.hbp);
  const so = finite(value.so);
  if (g == null || h == null || hr == null || bb == null || hbp == null || so == null) return null;
  return {
    source: typeof value.source === "string" ? value.source : undefined,
    g,
    gs: finite(value.gs) ?? undefined,
    pa: finite(value.pa) ?? undefined,
    ab: finite(value.ab) ?? undefined,
    h,
    d2: finite(value.d2) ?? undefined,
    d3: finite(value.d3) ?? undefined,
    hr,
    bb,
    hbp,
    so,
    bf: finite(value.bf) ?? undefined,
    outs: finite(value.outs) ?? undefined,
  };
}

export function parseProspectDetails(details: Json): LmbProspectDetails | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const opp = contextObject(details, "opp_by_source");
  const rawDrivers = Array.isArray(details.drivers) ? details.drivers : [];
  const drivers: [string, number][] = [];
  for (const entry of rawDrivers) {
    if (Array.isArray(entry) && typeof entry[0] === "string" && typeof entry[1] === "number" && Number.isFinite(entry[1])) {
      drivers.push([entry[0], entry[1]]);
    }
  }
  const rawPcts = contextObject(details, "percentiles") ?? {};
  const percentiles: Record<string, number> = {};
  for (const [key, val] of Object.entries(rawPcts)) {
    const n = finite(val);
    if (n != null) percentiles[key] = n;
  }
  const rawSplits = Array.isArray(details.splits) ? details.splits : [];
  const splits = rawSplits.map((item) => parseStatLine(item)).filter((item): item is LmbProspectStatLine => item != null);
  return {
    position: typeof details.position === "string" ? details.position : null,
    throws: typeof details.throws === "string" ? details.throws : null,
    milbLevel: finite(details.milb_level) ?? 0,
    ageRel: finite(details.age_rel),
    windowOpp: finite(details.window_opp) ?? 0,
    seasonOpp: finite(details.season_opp) ?? 0,
    oppBySource: {
      lmb: finite(opp?.lmb) ?? 0,
      lmp: finite(opp?.lmp) ?? 0,
      milb: finite(opp?.milb) ?? 0,
    },
    drivers,
    percentiles,
    seasonStats: parseStatLine(details.season_stats),
    splits,
  };
}

const fmtRate = (v: number | null) => (v == null ? null : v >= 1 ? v.toFixed(3) : v.toFixed(3).replace(/^0/, ""));
const fmtPct = (v: number | null) => (v == null ? null : `${v.toFixed(1)}%`);
const fmtFixed = (v: number | null, digits: number) => (v == null ? null : v.toFixed(digits));
const fmtInt = (v: number | null | undefined) => (v == null ? null : v.toLocaleString("en-US"));
const fmtInnings = (outs: number) => `${Math.floor(outs / 3)}.${outs % 3}`;
const statCell = (label: string, value: string | null, tip: string | null): SeasonStat => ({ label, value, tip });

function hitterSlash(s: LmbProspectStatLine): { avg: number | null; obp: number | null; slg: number | null; ops: number | null } {
  const ab = s.ab ?? 0;
  const d2 = s.d2 ?? 0;
  const d3 = s.d3 ?? 0;
  const obpDen = ab + s.bb + s.hbp;
  const avg = ab > 0 ? s.h / ab : null;
  const obp = obpDen > 0 ? (s.h + s.bb + s.hbp) / obpDen : null;
  const slg = ab > 0 ? (s.h + d2 + 2 * d3 + 3 * s.hr) / ab : null;
  const ops = obp != null && slg != null ? obp + slg : null;
  return { avg, obp, slg, ops };
}

export function lmbProspectSeasonStats(
  details: LmbProspectDetails,
  season: number,
  level: string,
  role: string,
): SeasonStatsData | null {
  const s = details.seasonStats;
  if (!s) return null;
  const leagueLabel = lmbLevelLabel(level);

  if (role === "P") {
    const bf = s.bf ?? 0;
    const outs = s.outs ?? 0;
    if (bf <= 0) return null;
    const kPct = (100 * s.so) / bf;
    const bbPct = (100 * s.bb) / bf;
    const whip = outs > 0 ? (s.bb + s.h) / (outs / 3) : null;
    const per9 = (count: number) => (outs > 0 ? (27 * count) / outs : null);
    const splitNote =
      details.splits.length > 1
        ? `${season} splits: ${details.splits
            .map((sp) => `${lmbLevelLabel(sp.source ?? "")} ${fmtInnings(sp.outs ?? 0)} IP (${sp.so} K, ${sp.bb} BB)`)
            .join(", ")}.`
        : "Season totals from the MLB Stats API across the leagues listed above.";
    return {
      season,
      context: `${leagueLabel} · ${fmtInnings(outs)} IP · ${fmtInt(bf)} BF`,
      tiers: [
        {
          label: "Production",
          stats: [
            statCell("IP", fmtInnings(outs), "Innings pitched. The .2 means two outs, not two tenths of an inning."),
            statCell("BF", fmtInt(bf), "Batters faced across the leagues listed above."),
            statCell("G", fmtInt(s.g), "Games pitched."),
            statCell("GS", fmtInt(s.gs ?? 0), "Games started."),
            statCell("WHIP", fmtFixed(whip, 2), "Walks plus hits allowed per inning."),
            statCell("K", fmtInt(s.so), null),
            statCell("BB", fmtInt(s.bb), "Walks allowed."),
            statCell("HR", fmtInt(s.hr), "Home runs allowed."),
          ],
        },
        {
          label: "Rate stats",
          stats: [
            statCell("K%", fmtPct(kPct), "Strikeouts divided by batters faced."),
            statCell("BB%", fmtPct(bbPct), "Walks divided by batters faced."),
            statCell("K−BB%", fmtPct(kPct - bbPct), "Strikeout rate minus walk rate, in percentage points. Primary pitching skill input in the prospect model."),
            statCell("K/9", fmtFixed(per9(s.so), 1), "Strikeouts per nine innings."),
            statCell("BB/9", fmtFixed(per9(s.bb), 1), "Walks per nine innings."),
            statCell("H/9", fmtFixed(per9(s.h), 1), "Hits allowed per nine innings."),
            statCell("HR/9", fmtFixed(per9(s.hr), 2), "Home runs allowed per nine innings."),
          ],
        },
      ],
      note: splitNote,
    };
  }

  const pa = s.pa ?? 0;
  if (pa <= 0) return null;
  const { avg, obp, slg, ops } = hitterSlash(s);
  const kPct = (100 * s.so) / pa;
  const bbPct = (100 * s.bb) / pa;
  const xbh = (s.d2 ?? 0) + (s.d3 ?? 0) + s.hr;
  const splitNote =
    details.splits.length > 1
      ? `${season} splits: ${details.splits
          .map((sp) => {
            const sl = hitterSlash(sp);
            return `${lmbLevelLabel(sp.source ?? "")} ${sp.pa ?? 0} PA (${fmtRate(sl.avg) ?? EMPTY}/${fmtRate(sl.obp) ?? EMPTY}/${fmtRate(sl.slg) ?? EMPTY}, ${sp.hr} HR)`;
          })
          .join(", ")}.`
      : "Season totals from the MLB Stats API across the leagues listed above.";
  return {
    season,
    context: `${leagueLabel} · ${fmtInt(s.g)} G · ${fmtInt(pa)} PA`,
    tiers: [
      {
        label: "Production",
        stats: [
          statCell("PA", fmtInt(pa), "Plate appearances across the leagues listed above."),
          statCell("AVG", fmtRate(avg), "Hits divided by at-bats."),
          statCell("OBP", fmtRate(obp), "Hits, walks and hit-by-pitches divided by at-bats, walks and hit-by-pitches."),
          statCell("SLG", fmtRate(slg), "Total bases per at-bat."),
          statCell("OPS", fmtRate(ops), "On-base percentage plus slugging percentage."),
          statCell("HR", fmtInt(s.hr), null),
          statCell("XBH", fmtInt(xbh), "Doubles, triples and home runs."),
          statCell("G", fmtInt(s.g), "Games played."),
        ],
      },
      {
        label: "Plate discipline",
        stats: [
          statCell("K%", fmtPct(kPct), "Strikeouts divided by plate appearances."),
          statCell("BB%", fmtPct(bbPct), "Walks divided by plate appearances."),
          statCell("K−BB%", fmtPct(kPct - bbPct), "Strikeout rate minus walk rate; lower is better for hitters."),
          statCell("H", fmtInt(s.h), "Total hits."),
          statCell("BB", fmtInt(s.bb), "Total walks."),
          statCell("SO", fmtInt(s.so), "Total strikeouts."),
        ],
      },
    ],
    note: splitNote,
  };
}

type RatedPlayer = Pick<
  LmbPlayerRatingRow,
  "season" | "grade" | "proj_war" | "war" | "pa" | "bf" | "batting" | "baserunning" | "fielding" | "positional" | "pitching" | "leverage" | "replacement"
>;

export function lmbPlayingTime(row: Pick<RatedPlayer, "pa" | "bf">): string {
  const parts = [row.pa > 0 && `${row.pa} PA`, row.bf > 0 && `${row.bf} BF`].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : EMPTY;
}

// The rows of a two-player comparison: grade and wins, then each part of the
// runs ledger either player has.
export function lmbComparisonMetrics(rows: [RatedPlayer, RatedPlayer]): { label: string; values: [string, string] }[] {
  const pair = (value: (row: RatedPlayer) => string): [string, string] => [value(rows[0]), value(rows[1])];
  return [
    { label: "Grade", values: pair((row) => formatNumber(row.grade, 0)) },
    { label: "Projected WAR", values: pair((row) => formatNumber(row.proj_war, 1)) },
    { label: `${rows[0].season} WAR`, values: pair((row) => formatSigned(row.war, 1)) },
    { label: "Playing time", values: pair(lmbPlayingTime) },
    ...(
      [
        ["Batting runs", "batting"],
        ["Baserunning runs", "baserunning"],
        ["Fielding runs", "fielding"],
        ["Positional runs", "positional"],
        ["Pitching runs", "pitching"],
        ["Leverage runs", "leverage"],
        ["Replacement runs", "replacement"],
      ] as const
    )
      .filter(([, key]) => rows.some((row) => row[key] !== 0))
      .map(([label, key]) => ({ label, values: pair((row) => formatSigned(row[key], 0)) })),
  ];
}
