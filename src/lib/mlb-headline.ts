import type { BetLedgerRow } from "./types.ts";
import type { MarketRecord } from "./football-picks.ts";

export type MlbHeadlineRow = {
  bet_type: string;
  wins: number;
  losses: number;
  pushes: number;
  total_stake: number;
  total_payout: number;
};

export function mlbHeadline(rows: MlbHeadlineRow[]): MarketRecord[] | null {
  if (rows.length === 0) return null;
  return ([
    ["ml", "h2h"],
    ["rl", "spreads"],
    ["total", "totals"],
  ] as const)
    .map(([betType, market]) => {
      const row = rows.find((r) => r.bet_type === betType);
      const roi = row && row.total_stake > 0
        ? Math.round(((row.total_payout - row.total_stake) / row.total_stake) * 10000) / 10000
        : null;
      return {
        market,
        wins: row?.wins ?? 0,
        losses: row?.losses ?? 0,
        pushes: row?.pushes ?? 0,
        pending: 0,
        roi,
      };
    });
}

// Used only during rolling deployment when PostgREST does not yet know the RPC.
export function summarizeMlbLedger(ledger: BetLedgerRow[]): MlbHeadlineRow[] {
  const markets = new Map<string, MlbHeadlineRow>();
  for (const row of ledger) {
    const summary = markets.get(row.bet_type) ?? {
      bet_type: row.bet_type, wins: 0, losses: 0, pushes: 0,
      total_stake: 0, total_payout: 0,
    };
    summary.wins += Number(row.won);
    summary.pushes += Number(row.push);
    summary.losses += 1 - Number(row.won) - Number(row.push);
    summary.total_stake += row.stake;
    summary.total_payout += row.payout;
    markets.set(row.bet_type, summary);
  }
  return [...markets.values()];
}
