import type { GameMatchup } from "@/lib/types";

export interface GameStatus {
  isFinal: boolean;
  isLive: boolean;
  /** Scores are only meaningful once a game is live or final. */
  showScores: boolean;
  lineupsPending: boolean;
  liveLabel: string | null;
  startTime: string | null;
  hasEvPlay: boolean;
}

export function gameStatus(matchup: GameMatchup): GameStatus {
  const hasEvPlay =
    matchup.away.ev_flag !== "No Play" ||
    matchup.home.ev_flag !== "No Play" ||
    matchup.away.run_line_ev_flag !== "No Play" ||
    matchup.home.run_line_ev_flag !== "No Play" ||
    matchup.away.total_play !== "No Play" ||
    matchup.home.total_play !== "No Play" ||
    matchup.away.high_variance_flag === "Yes" ||
    matchup.home.high_variance_flag === "Yes";

  const isFinal =
    matchup.status === "Final" &&
    matchup.home_score != null &&
    matchup.away_score != null;

  // In progress = a status that isn't pregame/final, and we have scores.
  const isLive =
    !isFinal &&
    matchup.status != null &&
    matchup.status !== "Scheduled" &&
    matchup.status !== "Pre-Game" &&
    matchup.status !== "Warmup" &&
    matchup.status !== "Delayed Start" &&
    (matchup.home_score != null || matchup.away_score != null);

  // Pre-game and scored on the top9-by-PA fallback (no real lineup yet), so the
  // model suppresses pick flags. Mark it so an empty pick slate reads as
  // "waiting on lineups", not "no edges".
  const lineupsPending =
    !isFinal &&
    !isLive &&
    !(matchup.home.lineup_source ?? "").startsWith("lineup_live");

  const liveLabel = (() => {
    if (!isLive) return null;
    const inning = matchup.current_inning;
    const state = matchup.inning_state;
    if (!inning) return matchup.status;
    const half =
      state === "Top"
        ? "Top"
        : state === "Bottom"
          ? "Bot"
          : state === "Middle"
            ? "Mid"
            : state === "End"
              ? "End"
              : "";
    return half ? `${half} ${inning}` : `Inn ${inning}`;
  })();

  const startTime = matchup.start_time
    ? new Date(matchup.start_time).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Los_Angeles",
      }) + " PT"
    : null;

  return {
    isFinal,
    isLive,
    showScores: isFinal || isLive,
    lineupsPending,
    liveLabel,
    startTime,
    hasEvPlay,
  };
}
