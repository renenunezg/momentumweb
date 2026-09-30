export interface MlbScheduleGame {
  gamePk: number;
  status?: { detailedState?: string; abstractGameState?: string };
  teams?: { home?: { score?: number }; away?: { score?: number } };
  linescore?: {
    currentInning?: number;
    inningState?: string;
    outs?: number;
    offense?: { first?: { id: number }; second?: { id: number }; third?: { id: number } };
  };
}

export interface LiveScore {
  game_pk: number;
  status: string | null;
  abstract_state: string | null;
  home_score: number | null;
  away_score: number | null;
  current_inning: number | null;
  inning_state: string | null;
  bases: number | null;
}

export function toLiveScore(game: MlbScheduleGame): LiveScore {
  const linescore = game.linescore;
  const offense = linescore?.offense;
  let bases: number | null = null;
  if (game.status?.abstractGameState === "Live") {
    if (linescore?.outs === 3 || ["Middle", "End"].includes(linescore?.inningState ?? "")) {
      bases = 0;
    } else if (offense && ["Top", "Bottom"].includes(linescore?.inningState ?? "")) {
      bases = (offense.first?.id ? 1 : 0) | (offense.second?.id ? 2 : 0) | (offense.third?.id ? 4 : 0);
    }
  }
  return {
    game_pk: game.gamePk,
    status: game.status?.detailedState ?? null,
    abstract_state: game.status?.abstractGameState ?? null,
    home_score: game.teams?.home?.score ?? null,
    away_score: game.teams?.away?.score ?? null,
    current_inning: linescore?.currentInning ?? null,
    inning_state: linescore?.inningState ?? null,
    bases,
  };
}
