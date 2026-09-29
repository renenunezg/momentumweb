export interface PlayoffTeam {
  code: string;
  name: string;
  id: number;
  seed: number;
  league: "AL" | "NL";
  wins: number;
  losses: number;
  ws_rank: number;
  lineup: string[];
  rotation: string[];
  unmodeled_players: string[];
}
export interface PlayoffNode {
  id: string;
  round: "WC" | "DS" | "CS" | "WS";
  league: string;
  best_of: number;
  left: string;
  right: string;
}
export interface SeriesOutcome {
  wins: [number, number];
  probability: number;
}
export interface PlayoffMatchup {
  teams: [string, string];
  home_field: string;
  current_wins: [number, number];
  game_probabilities: number[];
  outcomes: SeriesOutcome[];
}
export interface PlayoffOdds {
  team: string;
  DS: number;
  CS: number;
  WS: number;
  champion: number;
}
export interface PlayoffForecast {
  schema_version: 1;
  season: number;
  generated_at: string;
  model_version: string;
  training_max_date: string;
  n_sims: number;
  seed: number;
  probability_source: string;
  publishable: boolean;
  teams: PlayoffTeam[];
  nodes: PlayoffNode[];
  matchups: Record<string, PlayoffMatchup>;
  odds: PlayoffOdds[];
  warnings: string[];
  assumptions: string[];
}
export interface BracketSeries {
  node: PlayoffNode;
  matchup: PlayoffMatchup;
  outcome: SeriesOutcome;
  winner: string;
}

export function winnerProbability(
  matchup: PlayoffMatchup,
  index: number,
): number {
  return matchup.outcomes.reduce(
    (p, o) => p + (o.wins[index] > o.wins[1 - index] ? o.probability : 0),
    0,
  );
}

export function chooseBracket(
  forecast: PlayoffForecast,
  random?: () => number,
): BracketSeries[] {
  const winners = new Map(forecast.teams.map((t) => [t.code, t.code]));
  return forecast.nodes.map((node) => {
    const a = winners.get(node.left),
      b = winners.get(node.right);
    const matchup = forecast.matchups[`${node.id}:${a}:${b}`];
    if (!matchup) throw new Error("Incomplete playoff forecast");
    let outcome: SeriesOutcome;
    if (random) {
      const target = random();
      let mass = 0;
      outcome =
        matchup.outcomes.find((o) => {
          mass += o.probability;
          return target < mass;
        }) ?? matchup.outcomes.at(-1)!;
    } else {
      const favorite = winnerProbability(matchup, 0) >= 0.5 ? 0 : 1;
      outcome = matchup.outcomes
        .filter((o) => o.wins[favorite] > o.wins[1 - favorite])
        .reduce((best, o) => (o.probability > best.probability ? o : best));
    }
    const winner = matchup.teams[outcome.wins[0] > outcome.wins[1] ? 0 : 1];
    winners.set(node.id, winner);
    return { node, matchup, outcome, winner };
  });
}

export function parsePlayoffForecast(value: unknown): PlayoffForecast | null {
  // The payload is versioned separately from generated database types.
  try {
    const f = value as PlayoffForecast;
    const probability = (p: number) => Number.isFinite(p) && p >= 0 && p <= 1;
    if (
      f.schema_version !== 1 ||
      !Number.isInteger(f.season) ||
      !Number.isFinite(Date.parse(f.generated_at)) ||
      f.probability_source !== "pure_model_hfa" ||
      f.teams.length !== 12 ||
      f.nodes.length !== 11 ||
      new Set(f.teams.map((t) => t.code)).size !== 12 ||
      f.odds.length !== 12 ||
      !Array.isArray(f.warnings) ||
      !Array.isArray(f.assumptions)
    )
      return null;
    const codes = new Set(f.teams.map((t) => t.code));
    if (
      new Set(f.nodes.map((n) => n.id)).size !== 11 ||
      new Set(f.odds.map((o) => o.team)).size !== 12
    )
      return null;
    for (const o of f.odds) {
      if (
        !codes.has(o.team) ||
        ![o.DS, o.CS, o.WS, o.champion].every(probability) ||
        o.champion > o.WS + 1e-8 ||
        o.WS > o.CS + 1e-8 ||
        o.CS > o.DS + 1e-8
      )
        return null;
    }
    if (Math.abs(f.odds.reduce((s, o) => s + o.champion, 0) - 1) > 1e-6)
      return null;
    for (const m of Object.values(f.matchups)) {
      if (
        m.teams.length !== 2 ||
        m.teams[0] === m.teams[1] ||
        !m.teams.every((t) => codes.has(t)) ||
        !m.teams.includes(m.home_field) ||
        ![3, 5, 7].includes(m.game_probabilities.length) ||
        !m.game_probabilities.every(probability) ||
        !m.outcomes.length ||
        m.current_wins.length !== 2
      )
        return null;
      const target = Math.floor(m.game_probabilities.length / 2) + 1;
      if (
        !m.outcomes.every(
          (o) =>
            probability(o.probability) &&
            o.wins.length === 2 &&
            o.wins.every((w) => Number.isInteger(w) && w >= 0 && w <= target) &&
            Math.max(...o.wins) === target &&
            Math.min(...o.wins) < target,
        ) ||
        Math.abs(m.outcomes.reduce((s, o) => s + o.probability, 0) - 1) > 1e-6
      )
        return null;
    }
    const reachable = new Map(f.teams.map((t) => [t.code, new Set([t.code])]));
    for (const node of f.nodes) {
      const left = reachable.get(node.left),
        right = reachable.get(node.right);
      if (
        !left ||
        !right ||
        ![3, 5, 7].includes(node.best_of) ||
        reachable.has(node.id)
      )
        return null;
      const winners = new Set<string>();
      for (const a of left)
        for (const b of right) {
          const m = f.matchups[`${node.id}:${a}:${b}`];
          if (
            !m ||
            m.teams[0] !== a ||
            m.teams[1] !== b ||
            m.game_probabilities.length !== node.best_of
          )
            return null;
          for (const o of m.outcomes) {
            if (o.wins.some((w, i) => w < m.current_wins[i])) return null;
            if (o.probability > 1e-15)
              winners.add(m.teams[o.wins[0] > o.wins[1] ? 0 : 1]);
          }
        }
      reachable.set(node.id, winners);
    }
    if (f.nodes.at(-1)?.id !== "WS") return null;
    for (const team of f.teams) {
      if (
        typeof team.name !== "string" ||
        !team.lineup.every((n) => typeof n === "string") ||
        !team.rotation.every((n) => typeof n === "string") ||
        !Array.isArray(team.unmodeled_players)
      )
        return null;
    }
    chooseBracket(f);
    return f;
  } catch {
    return null;
  }
}
