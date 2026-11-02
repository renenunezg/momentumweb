import "server-only";
import { tableCacheTag } from "./cache-tags";

export type AwardRow = {
  league: "AL" | "NL";
  award: "MVP" | "CY" | "ROY" | "RP" | "GG";
  position: string;
  player_id: number;
  player_name: string;
  team: string | null;
  rank: number | null;
  win_probability: number | null;
  vote_share: number | null;
  stat_line: string;
  won: boolean | null;
};

export type AwardBacktest = {
  hits: number;
  races: number;
  baseline: string;
  baseline_hits: number;
  seasons: number[];
};

export type AwardModel = {
  model: string;
  as_of: string;
  backtest: AwardBacktest;
};

// The boards are frozen, so the day is only a safety net: grading a race fires
// the revalidate trigger, which refreshes the page at once.
export const AWARDS_CACHE_SECONDS = 86400;

async function read<T>(table: string, query: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, process.env.NEXT_PUBLIC_SUPABASE_URL);
  url.search = new URLSearchParams(query).toString();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const response = await fetch(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Accept-Profile": "mlb" },
    next: { revalidate: AWARDS_CACHE_SECONDS, tags: ["mlb", tableCacheTag("mlb", table)] },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`MLB awards request failed (${response.status})`);
  return response.json() as Promise<T[]>;
}

// The newest frozen season. A failed read throws so ISR keeps the last good page.
export async function fetchAwards() {
  const models = await read<AwardModel & { season: number }>("award_models", {
    select: "season,model,as_of,backtest", order: "season.desc", limit: "20",
  });
  const season = models[0]?.season ?? null;
  if (season == null) return { season, models: [], rows: [] };
  const rows = await read<AwardRow>("award_boards", {
    select: "league,award,position,player_id,player_name,team,rank,win_probability,vote_share,stat_line,won",
    season: `eq.${season}`, order: "rank.asc.nullslast",
  });
  return { season, models: models.filter((model) => model.season === season), rows };
}
