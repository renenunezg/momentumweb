import "server-only";
import type { AwardBoard, AwardMeta, AwardKey, AwardLeader } from "./nfl-awards-types";

// The pending awards migration is a separate, schema-pinned read contract.
// Keep REST errors distinct from a successfully published empty board.
async function read<T>(table: string, query: Record<string, string>): Promise<T[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("NFL awards data connection is unavailable");
  const response = await fetch(`${url}/rest/v1/${table}?${new URLSearchParams(query)}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Accept-Profile": "nfl" },
    next: { revalidate: 3600, tags: ["nfl"] },
  });
  if (!response.ok) throw new Error(`NFL awards request failed (${response.status})`);
  return response.json() as Promise<T[]>;
}

export async function fetchAwards(award: AwardKey, season?: number, week?: number) {
  try {
    const snapshots = await read<AwardMeta>("award_model_meta", {
      select: "*", award: `eq.${award}`, order: "season.desc,week.desc", limit: "500",
    });
    const meta = snapshots.find((row) => (season == null || row.season === season)
      && (week == null || row.week === week));
    if (!meta) return { snapshots, meta: null, board: [], history: [], unavailable: false };
    const [board, history] = await Promise.all([
      readBoard(award, meta),
      read<AwardLeader>("award_boards", {
        select: "season,week,candidate_name,team", award: `eq.${award}`,
        season: `eq.${meta.season}`, week: `lte.${meta.week}`,
        predicted_rank: "eq.1", order: "week.asc", limit: "100",
      }),
    ]);
    return { snapshots, meta, board, history, unavailable: false };
  } catch (error) {
    console.error("NFL awards unavailable:", error instanceof Error ? error.message : "Unknown error");
    return { snapshots: [], meta: null, board: [], history: [], unavailable: true };
  }
}

async function readBoard(award: AwardKey, meta: AwardMeta): Promise<AwardBoard[]> {
  if (!["ready", "watchlist"].includes(meta.status)) return [];
  const board: AwardBoard[] = [];
  for (let offset = 0; ; offset += 1000) {
    const rows = await read<AwardBoard>("award_boards", {
      select: "*", award: `eq.${award}`, season: `eq.${meta.season}`,
      week: `eq.${meta.week}`, order: "predicted_rank.asc,candidate_id.asc",
      limit: "1000", offset: String(offset),
    });
    board.push(...rows);
    if (rows.length < 1000) break;
  }
  if (board.length !== meta.candidate_count || new Set(board.map((r) => r.candidate_id)).size !== board.length
    || board.some((r) => r.as_of !== meta.as_of || r.model_version !== meta.model_version)) {
    throw new Error("NFL awards snapshot is incomplete or mixed");
  }
  return board;
}
