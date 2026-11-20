import type { TeamLogoSource } from "@/components/team-logo";
import type { Json } from "./database.types";
import { toLiveScore, type LiveScore, type MlbScheduleGame } from "./mlb-live-scores";
import type { LmbLedgerRow, LmbModelOutputRow } from "./lmb-types";
import { EMPTY } from "./utils";

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

// The Stats API's logo CDN carries every LMB club under its team id.
export function lmbTeamLogo(code: string): TeamLogoSource | undefined {
  const team = LMB_TEAMS[code];
  if (!team) return undefined;
  const url = `https://www.mlbstatic.com/team-logos/${team.id}.svg`;
  return { logo_light: url, logo_dark: url };
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
