import { pickLabel, type PickMarket } from "./football-picks.ts";

// One day of recommended picks across every model, normalized so the home
// page can list an MLB run line next to an NFL spread without knowing which
// pipeline wrote it.

export type DailyMarket = Exclude<PickMarket, "all">;

export type DailyPick = {
  market: DailyMarket;
  label: string;
  price: number | null;
  probability: number | null;
};

export type DailyGame = {
  key: string;
  start: string | null;
  away_team: string;
  home_team: string;
  picks: DailyPick[];
};

export type DailySport = {
  sport: "mlb" | "cfb" | "nfl";
  name: string;
  href: string;
  gameCount: number;
  // False until the pipeline has written a decision for the day; a slate with
  // no picks then reads as unpublished rather than as no edge.
  published: boolean;
  games: DailyGame[];
  unavailable: boolean;
};

// The site's day is the Pacific calendar date the MLB pipeline already keys
// on, so a 7 PM Pacific first pitch and a Sunday night kickoff stay on the
// day a US reader expects.
export const SITE_TIME_ZONE = "America/Los_Angeles";

const MARKET_ORDER: Record<DailyMarket, number> = {
  h2h: 0,
  spreads: 1,
  totals: 2,
};

export function siteDate(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: SITE_TIME_ZONE });
}

const wallClock = (timeZone: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

// The UTC instants bounding a calendar date in a zone. The zone's offset is
// read at the guessed instant, which is exact except within an hour of a DST
// change, and DST never changes at midnight in the zones used here.
export function zonedDayRange(
  date: string,
  timeZone: string,
): { from: string; to: string } {
  const clock = wallClock(timeZone);
  const midnight = (utcGuess: number) => {
    const parts = Object.fromEntries(
      clock.formatToParts(utcGuess).map((part) => [part.type, part.value]),
    );
    const wall = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    return utcGuess - (wall - utcGuess);
  };
  const [year, month, day] = date.split("-").map(Number);
  const start = Date.UTC(year, month - 1, day);
  return {
    from: new Date(midnight(start)).toISOString(),
    to: new Date(midnight(start + 86_400_000)).toISOString(),
  };
}

export type MlbPickRow = {
  team: string;
  ev_flag: string | null;
  run_line_ev_flag: string | null;
  total_play: string | null;
  moneyline: number | null;
  spread: number | null;
  spread_odds: number | null;
  total: number | null;
  total_over_odds: number | null;
  total_under_odds: number | null;
  win_prob: number | null;
  p_cover: number | null;
  p_over: number | null;
  p_under: number | null;
};

// Each team row flags its own moneyline and run line; the total is a game
// pick that both rows may carry, so it is taken once from the home row.
export function mlbGamePicks(rows: MlbPickRow[]): DailyPick[] {
  const picks: DailyPick[] = [];
  for (const row of rows) {
    if (row.ev_flag && row.ev_flag !== "No Play")
      picks.push({
        market: "h2h",
        label: `${row.team} ML`,
        price: row.moneyline,
        probability: row.win_prob,
      });
    if (row.run_line_ev_flag && row.run_line_ev_flag !== "No Play")
      picks.push({
        market: "spreads",
        label:
          row.spread == null
            ? `${row.team} RL`
            : `${row.team} ${row.spread > 0 ? "+" : ""}${row.spread}`,
        price: row.spread_odds,
        probability: row.p_cover,
      });
  }
  const total = rows.find(
    (row) => row.total_play === "Over" || row.total_play === "Under",
  );
  if (total)
    picks.push({
      market: "totals",
      label: `${total.total_play}${total.total == null ? "" : ` ${total.total}`}`,
      price:
        total.total_play === "Over"
          ? total.total_over_odds
          : total.total_under_odds,
      probability: total.total_play === "Over" ? total.p_over : total.p_under,
    });
  return sortPicks(picks);
}

export function sortPicks(picks: DailyPick[]): DailyPick[] {
  return [...picks].sort(
    (a, b) => MARKET_ORDER[a.market] - MARKET_ORDER[b.market],
  );
}

export type FootballDecision = {
  game_id: string | number;
  market: string;
  start_date: string | null;
  home_team: string;
  away_team: string;
  status: string;
  selection: string | null;
  point: number | null;
  price: number | null;
  win_probability: number | null;
};

function isDailyMarket(market: string): market is DailyMarket {
  return market in MARKET_ORDER;
}

export function footballGames(decisions: FootballDecision[]): DailyGame[] {
  const games = new Map<string, DailyGame>();
  for (const row of decisions) {
    const key = String(row.game_id);
    let game = games.get(key);
    if (!game) {
      game = {
        key,
        start: row.start_date,
        away_team: row.away_team,
        home_team: row.home_team,
        picks: [],
      };
      games.set(key, game);
    }
    if (row.status !== "recommended" || !isDailyMarket(row.market)) continue;
    game.picks.push({
      market: row.market,
      label: pickLabel({ ...row, status: "recommended" }),
      price: row.price,
      probability: row.win_probability,
    });
  }
  return [...games.values()].map((game) => ({
    ...game,
    picks: sortPicks(game.picks),
  }));
}
