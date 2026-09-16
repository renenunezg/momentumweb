import type { AwardBoard, AwardTrajectoryPoint } from "./nfl-awards-types.ts";
import { EMPTY, formatSigned } from "./utils.ts";

const count = (value: number, digits = 0) => value.toLocaleString("en-US", { maximumFractionDigits: digits });

/** Season-to-date line for the board, in the same shape as the Heisman tracker's. */
export function seasonLine(row: Pick<AwardBoard, "position" | "games" | "season_stats">): string {
  const stats = row.season_stats;
  if (!stats) return EMPTY;
  const n = (key: string) => stats[key] ?? 0;
  if (row.position === "HC") {
    if (!row.games) return EMPTY;
    const ties = n("ties");
    const record = `${count(n("wins"))}-${count(row.games - n("wins") - ties)}${ties ? `-${count(ties)}` : ""}`;
    return `${record}, ${formatSigned(n("point_margin"), 1)} margin`;
  }
  const parts: string[] = [];
  if (n("passing_yards") > 0) parts.push(`${count(n("passing_yards"))} pass yds, ${count(n("passing_tds"))} TD, ${count(n("passing_interceptions"))} INT`);
  if (n("rushing_yards") > 0) parts.push(`${count(n("rushing_yards"))} rush yds, ${count(n("rushing_tds"))} TD`);
  if (n("receiving_yards") > 0) parts.push(`${count(n("receiving_yards"))} rec yds, ${count(n("receiving_tds"))} TD`);
  // A defender's line only when there is no offensive production to report.
  if (parts.length === 0 && (n("def_tackles_solo") > 0 || n("def_sacks") > 0 || n("def_interceptions") > 0)) {
    parts.push(`${count(n("def_tackles_solo"))} tkl, ${count(n("def_sacks"), 1)} sacks, ${count(n("def_interceptions"))} INT`);
    if (n("def_fumbles_forced") > 0) parts.push(`${count(n("def_fumbles_forced"))} FF`);
  }
  return parts.join(" · ") || EMPTY;
}

export interface TrajectorySeries {
  data: Record<string, number>[];
  players: { id: string; name: string }[];
}

/** One row per week with each leader's published rank under their candidate id. */
export function trajectorySeries(points: AwardTrajectoryPoint[], leaders: Pick<AwardBoard, "candidate_id" | "candidate_name">[]): TrajectorySeries {
  const byWeek = new Map<number, Record<string, number>>();
  for (const point of points) {
    if (point.predicted_rank == null) continue;
    const row = byWeek.get(point.week) ?? { week: point.week };
    row[point.candidate_id] = point.predicted_rank;
    byWeek.set(point.week, row);
  }
  return {
    data: [...byWeek.values()].sort((a, b) => a.week - b.week),
    players: leaders.map((row) => ({ id: row.candidate_id, name: row.candidate_name })),
  };
}
