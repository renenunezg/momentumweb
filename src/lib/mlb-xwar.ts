import { cache } from "react";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database-schema";

// xWAR, written by mlbmodel (v2.xwar.publish): fWAR with the luck on contact taken out. One jsonb row with what the
// page quotes and one row per player. The hitting columns are null for a player who did not bat and the pitching
// columns for one who did not pitch.

// `projected_war` is next season's WAR from the grade model (player_values), null for a player it does not project.
export type XwarRow = Omit<Tables<"mlb", "xwar">, "updated_at"> & { projected_war: number | null };

type Interval = [value: number, low: number, high: number];

// Whether a side's gap repeats a season later (correlation of the gap per tracked ball, players with `min_balls` in
// both seasons), on the pairs the method was designed on and on the later pairs kept back. A side whose gap did not
// repeat keeps none of it.
interface XwarSide {
  kept: boolean;
  min_balls: number;
  pairs: number;
  repeat: Interval;
  held_back: { pairs: number; repeat: Interval };
}

export interface XwarStudy {
  seasons: number[];
  players: number;
  first_season: number;
  // Runs that make a win in the published season, and the runs a home run costs in fWAR's pitching formula.
  runs_per_win: number;
  home_run_runs: number;
  hitter: XwarSide;
  pitcher: XwarSide;
  // A hitter's season per 600 plate appearances against his next season's hitting fWAR per 600, read as fWAR, as fWAR
  // with the whole gap removed (`expected`) and as xWAR, on the later pairs.
  next_season_fwar: {
    min_pa: number;
    pairs: number;
    r: Record<"fwar" | "expected" | "xwar", number>;
    lead: Record<"expected_over_fwar" | "xwar_over_fwar" | "xwar_over_expected", Interval>;
  };
}

export interface XwarData {
  study: XwarStudy | null;
  season: number | null;
  updatedAt: string | null;
  // The season the projections are for: the one after `season`, or null when the grades are not on it.
  projectionSeason: number | null;
  players: XwarRow[];
}

const PAGE = 1000;
const COLUMNS =
  "player_id, season, player_name, team, war, xwar, balls, realized_gap_runs, earned_gap_runs, woba_contact, expected_woba_contact, balls_allowed, home_runs_allowed, expected_home_runs, home_run_gap, earned_home_runs";

// Each request gets its own limit: a build's first read waits seconds on a cold API.
const timeout = () => AbortSignal.timeout(10_000);

// Projected WAR for `season` by player, from the grade model. Empty when the grades are for another season.
async function fetchProjections(season: number): Promise<Map<number, number>> {
  const projected = new Map<number, number>();
  for (let from = 0; ; from += PAGE) {
    const res = await supabase
      .from("player_values")
      .select("player_id, projected_war")
      .eq("season", season)
      .not("projected_war", "is", null)
      .order("player_id", { ascending: true })
      .range(from, from + PAGE - 1)
      .abortSignal(timeout());
    if (res.error) throw new Error(`player_values: ${res.error.message}`);
    for (const row of res.data) if (row.projected_war != null) projected.set(row.player_id, row.projected_war);
    if (res.data.length < PAGE) break;
  }
  return projected;
}

export const fetchXwar = cache(async (): Promise<XwarData> => {
  const studyRes = await supabase
    .from("xwar_study")
    .select("season, payload, updated_at")
    .order("season", { ascending: false })
    .limit(1)
    .abortSignal(timeout());
  if (studyRes.error) throw new Error(`xwar_study: ${studyRes.error.message}`);
  const row = studyRes.data[0];
  if (!row) return { study: null, season: null, updatedAt: null, projectionSeason: null, players: [] };

  // The table changes season weeks before the run value tables do, so the season is always named.
  const projected = await fetchProjections(row.season + 1);
  const players: XwarRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const res = await supabase
      .from("xwar")
      .select(COLUMNS)
      .eq("season", row.season)
      .order("player_id", { ascending: true })
      .range(from, from + PAGE - 1)
      .abortSignal(timeout());
    // Reject incomplete snapshots so ISR keeps the last successful page.
    if (res.error) throw new Error(`xwar: ${res.error.message}`);
    players.push(...res.data.map((p) => ({ ...p, projected_war: projected.get(p.player_id) ?? null })));
    if (res.data.length < PAGE) break;
  }
  return {
    study: row.payload as unknown as XwarStudy,
    season: row.season,
    updatedAt: row.updated_at,
    projectionSeason: projected.size > 0 ? row.season + 1 : null,
    players,
  };
});

// Wins of fWAR the player owes to luck on contact: positive when his results ran ahead of his contact.
export const luck = (row: { war: number; xwar: number }) => row.war - row.xwar;
