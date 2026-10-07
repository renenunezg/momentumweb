export type DraftPosition =
  "QB" | "RB" | "WR" | "TE" | "OT" | "IOL" | "EDGE" | "DT" | "LB" | "CB" | "S";
export const positionNames: Record<DraftPosition, string> = {
  QB: "Quarterback",
  RB: "Running back",
  WR: "Wide receiver",
  TE: "Tight end",
  OT: "Offensive tackle",
  IOL: "Interior offensive line",
  EDGE: "Edge rusher",
  DT: "Interior defensive line",
  LB: "Linebacker",
  CB: "Cornerback",
  S: "Safety",
};
export const priorityLabel = (index: number) =>
  ["Outside top priorities", "1st priority", "2nd priority", "3rd priority"][
    index
  ] ?? "Outside top priorities";
export type Prospect = {
  id: string;
  name: string;
  athlete_id?: string;
  school: string;
  position: DraftPosition;
  rank: number | null;
};
export type DraftPick = {
  pick: number;
  original: string;
  owner: string;
  ownership_note: string;
  ownership_source: string;
  playoff_projection: boolean;
};
export type Board = {
  edition: string;
  season: number;
  order_date: string;
  rank_date: string;
  needs_date: string;
  sources: Record<"order" | "rank" | "needs", string>;
  teams: Record<string, { name: string; needs: DraftPosition[] }>;
  prospects: Prospect[];
  picks: DraftPick[];
};
export type RosterPlayer = {
  team: string;
  pos_grp: string;
  pos_abb: string;
  pos_slot: number;
  pos_rank: number;
  player_name: string;
  espn_id?: number | string;
  apy_cap_pct?: number;
  draft_position?: DraftPosition;
  display_group: string;
  position_name: string;
};
export type CollegePlayer = {
  athlete_id: string;
  athlete_name: string;
  team: string;
  position?: string;
  position_group?: string;
  games?: number;
  value_above_replacement?: number;
  position_rank?: number;
};
export type HistoricalPlayer = {
  draft_year: number;
  pick: number;
  college_name: string;
  collegeTeam: string;
  draft_position: string;
  identity_verified: boolean;
  value_above_replacement?: number;
  nfl_first3_scrimmage_snaps?: number;
  outcome_status: string;
};
export type DraftMeta = {
  published_at: string;
  college_as_of: string;
  college_week: number;
  depth_as_of: string;
  history_as_of: string;
};
export type DraftWorkspace = {
  schema_version: number;
  board: Board;
  meta: DraftMeta;
};
export type MockPick = DraftPick & {
  player: Prospect;
  best: Prospect;
  remainingNeeds: DraftPosition[];
  priority: number;
  custom: boolean;
};
export type MockMode = "needs" | "value";

export function buildMock(
  board: Board,
  mode: MockMode,
  overrides: Record<number, string>,
): MockPick[] {
  let available = [...board.prospects].sort(
    (a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity),
  );
  const filled: Record<string, DraftPosition[]> = {};
  return board.picks.map((pick) => {
    const needs = board.teams[pick.owner].needs;
    const remainingNeeds = needs.filter(
      (p) => !(filled[pick.owner] ?? []).includes(p),
    );
    const best = available.find((p) => p.rank != null);
    if (!best)
      throw new Error("Not enough ranked prospects for a complete first round");
    const eligible = available.filter(
      (p) =>
        p.rank != null &&
        (mode === "value" ||
          p.position !== "QB" ||
          remainingNeeds.includes("QB")),
    );
    let player = available.find((p) => p.id === overrides[pick.pick]);
    const custom = !!player;
    if (!player && mode === "needs") {
      const shortlist = eligible.slice(0, 5);
      for (const need of remainingNeeds) {
        player = shortlist.find((p) => p.position === need);
        if (player) break;
      }
    }
    player ??= eligible[0] ?? best;
    (filled[pick.owner] ??= []).push(player.position);
    available = available.filter((p) => p.id !== player.id);
    return {
      ...pick,
      player,
      best,
      remainingNeeds,
      priority: needs.indexOf(player.position) + 1,
      custom,
    };
  });
}
export function pickReason(pick: MockPick, mode: MockMode) {
  return pick.custom
    ? "Your selection"
    : mode === "value"
      ? "Best available"
      : pick.remainingNeeds.includes(pick.player.position)
        ? priorityLabel(pick.priority)
        : "Player ranking";
}

export type PlayerComparison = {
  low: number;
  high: number;
  bins: number[];
  count: number;
  median: number | null;
};
export type PlayerPage = {
  rows: CollegePlayer[];
  total: number;
  positions: string[];
  comparison: PlayerComparison;
};
export type HistoryPage = { rows: HistoricalPlayer[]; total: number };
