export interface CfbPlayoffTeam {
  id: number;
  team: string;
  conference: string;
  ap_rank: number | null;
  wins: number;
  losses: number;
  conference_wins: number;
  conference_losses: number;
  playoff: number;
  bye: number;
  champion: number;
  conference_champion: number;
  conference_title_game: number;
  expected_wins: number;
  expected_losses: number;
  selection_sensitivity: number;
  dependence_tiebreak_sensitivity: number;
}
export interface CfbPlayoffGame {
  id: number;
  home_id: number;
  away_id: number;
  date: string;
  home_win_probability: number;
  neutral: boolean;
  provisional: boolean;
}
export interface CfbPlayoffSlot {
  seed: number;
  team_id: number;
  conference_champion: boolean;
}
export interface CfbPlayoffPayload {
  schema_version: 2;
  season: number;
  status: string;
  model: string;
  model_as_of: string;
  results_as_of: string;
  ap_week: number;
  draws: number;
  team_columns: string[];
  teams: unknown[][];
  game_columns: string[];
  games: unknown[][];
  opponent_names: Record<string, string>;
  bracket: CfbPlayoffSlot[];
  limitations: string[];
}
export interface CfbPlayoffForecast {
  teams: CfbPlayoffTeam[];
  games: CfbPlayoffGame[];
  names: Map<number, string>;
  byId: Map<number, CfbPlayoffTeam>;
}
const TEAM_COLUMNS = [
  "id",
  "team",
  "conference",
  "ap_rank",
  "wins",
  "losses",
  "conference_wins",
  "conference_losses",
  "playoff",
  "bye",
  "champion",
  "conference_champion",
  "conference_title_game",
  "expected_wins",
  "expected_losses",
  "selection_sensitivity",
  "dependence_tiebreak_sensitivity",
];
const GAME_COLUMNS = [
  "id",
  "home_id",
  "away_id",
  "date",
  "home_win_probability",
  "neutral",
  "provisional",
];
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Expected an object");
  return value as Record<string, unknown>;
}
function string(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 1000)
    throw Error("Invalid text");
  return value;
}
function number(
  value: unknown,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw Error("Invalid number");
  return value;
}
function integer(
  value: unknown,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): number {
  const n = number(value, min, max);
  if (!Number.isSafeInteger(n)) throw Error("Invalid integer");
  return n;
}
function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw Error("Invalid flag");
  return value;
}
function date(value: unknown): string {
  const s = string(value);
  if (!Number.isFinite(Date.parse(s)) || !/(Z|[+-]\d\d:\d\d)$/.test(s))
    throw Error("Invalid date");
  return s;
}
function array(value: unknown, min: number, max: number): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max)
    throw Error("Invalid list");
  return value;
}
function rows(
  columns: unknown,
  values: unknown,
  expected: string[],
  min: number,
  max: number,
) {
  const keys = array(columns, expected.length, expected.length).map(string);
  if (
    new Set(keys).size !== keys.length ||
    expected.some((k) => !keys.includes(k))
  )
    throw Error("Invalid columns");
  return array(values, min, max).map((value) => {
    const row = array(value, keys.length, keys.length);
    return Object.fromEntries(keys.map((key, i) => [key, row[i]]));
  });
}
const probability = (n: unknown) => number(n, 0, 1);
function unique(ids: number[]) {
  if (new Set(ids).size !== ids.length) throw Error("Duplicate identity");
}
function mass(values: number[], target: number) {
  if (Math.abs(values.reduce((a, b) => a + b, 0) - target) > 1e-7)
    throw Error("Invalid probability total");
}

export function decodeCfbPlayoffs(
  payload: CfbPlayoffPayload,
): CfbPlayoffForecast {
  const teams: CfbPlayoffTeam[] = rows(
    payload.team_columns,
    payload.teams,
    TEAM_COLUMNS,
    12,
    200,
  ).map((t) => ({
    id: integer(t.id, 1),
    team: string(t.team),
    conference: string(t.conference),
    ap_rank: t.ap_rank === null ? null : integer(t.ap_rank, 1, 25),
    wins: integer(t.wins, 0, 20),
    losses: integer(t.losses, 0, 20),
    conference_wins: integer(t.conference_wins, 0, 20),
    conference_losses: integer(t.conference_losses, 0, 20),
    playoff: probability(t.playoff),
    bye: probability(t.bye),
    champion: probability(t.champion),
    conference_champion: probability(t.conference_champion),
    conference_title_game: probability(t.conference_title_game),
    expected_wins: number(t.expected_wins, 0, 20),
    expected_losses: number(t.expected_losses, 0, 20),
    selection_sensitivity: probability(t.selection_sensitivity),
    dependence_tiebreak_sensitivity: probability(
      t.dependence_tiebreak_sensitivity,
    ),
  }));
  unique(teams.map((t) => t.id));
  const byId = new Map(teams.map((t) => [t.id, t]));
  const names = new Map(
    Object.entries(object(payload.opponent_names)).map(([id, name]) => [
      integer(Number(id), 1),
      string(name),
    ]),
  );
  for (const t of teams) {
    names.set(t.id, t.team);
    if (
      t.bye > t.playoff ||
      t.champion > t.playoff ||
      t.conference_champion > t.conference_title_game
    )
      throw Error("Inconsistent probabilities");
  }
  mass(
    teams.map((t) => t.playoff),
    12,
  );
  mass(
    teams.map((t) => t.bye),
    4,
  );
  mass(
    teams.map((t) => t.champion),
    1,
  );
  for (const conf of new Set(teams.map((t) => t.conference))) {
    const members = teams.filter((t) => t.conference === conf);
    mass(
      members.map((t) => t.conference_champion),
      conf === "Independent" ? 0 : 1,
    );
    mass(
      members.map((t) => t.conference_title_game),
      conf === "Independent" ? 0 : 2,
    );
  }
  const games: CfbPlayoffGame[] = rows(
    payload.game_columns,
    payload.games,
    GAME_COLUMNS,
    0,
    2000,
  ).map((g) => ({
    id: integer(g.id, 1),
    home_id: integer(g.home_id, 1),
    away_id: integer(g.away_id, 1),
    date: date(g.date),
    home_win_probability: probability(g.home_win_probability),
    neutral: boolean(g.neutral),
    provisional: boolean(g.provisional),
  }));
  unique(games.map((g) => g.id));
  for (const g of games)
    if (
      g.home_id === g.away_id ||
      !names.has(g.home_id) ||
      !names.has(g.away_id) ||
      (!byId.has(g.home_id) && !byId.has(g.away_id))
    )
      throw Error("Unknown matchup");
  games.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  unique(payload.bracket.map((s) => s.team_id));
  unique(payload.bracket.map((s) => s.seed));
  for (const s of payload.bracket)
    if (!byId.has(s.team_id)) throw Error("Unknown bracket team");
  return { teams, games, names, byId };
}

// Keep the compact representation across the server/client boundary. Expanded
// schedules are derived in the viewer, never serialized once per team.
export function parseCfbPlayoffPayload(
  input: unknown,
): CfbPlayoffPayload | null {
  try {
    const p = object(input);
    if (p.schema_version !== 2) return null;
    const payload: CfbPlayoffPayload = {
      schema_version: 2,
      season: integer(p.season, 2026, 2100),
      status: string(p.status),
      model: string(p.model),
      model_as_of: date(p.model_as_of),
      results_as_of: date(p.results_as_of),
      ap_week: integer(p.ap_week, 1, 20),
      draws: integer(p.draws, 1000),
      team_columns: array(
        p.team_columns,
        TEAM_COLUMNS.length,
        TEAM_COLUMNS.length,
      ).map(string),
      teams: array(p.teams, 12, 200).map((r) =>
        array(r, TEAM_COLUMNS.length, TEAM_COLUMNS.length),
      ),
      game_columns: array(
        p.game_columns,
        GAME_COLUMNS.length,
        GAME_COLUMNS.length,
      ).map(string),
      games: array(p.games, 0, 2000).map((r) =>
        array(r, GAME_COLUMNS.length, GAME_COLUMNS.length),
      ),
      opponent_names: Object.fromEntries(
        Object.entries(object(p.opponent_names)).map(([id, name]) => [
          id,
          string(name),
        ]),
      ),
      bracket: array(p.bracket, 12, 12).map((value) => {
        const s = object(value);
        return {
          seed: integer(s.seed, 1, 12),
          team_id: integer(s.team_id, 1),
          conference_champion: boolean(s.conference_champion),
        };
      }),
      limitations: array(p.limitations, 0, 30).map(string),
    };
    if (Date.parse(payload.model_as_of) > Date.parse(payload.results_as_of))
      return null;
    decodeCfbPlayoffs(payload);
    return payload;
  } catch {
    return null;
  }
}

// Record and AP rank ride on the playoff forecast, which carries them for
// every FBS team, keyed by team id as one short label.
export function cfbStandings(payload: CfbPlayoffPayload): Record<number, string> {
  return Object.fromEntries(
    decodeCfbPlayoffs(payload).teams.map((t) => [
      t.id,
      `${t.wins}-${t.losses}${t.ap_rank != null ? ` · AP ${t.ap_rank}` : ""}`,
    ]),
  );
}
