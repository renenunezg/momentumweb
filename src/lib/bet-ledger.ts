import { supabase } from "@/lib/supabase";
import type { BetLedgerRow } from "@/lib/types";

const LEDGER_PAGE_SIZE = 1000;

// Supabase caps each response at 1000 rows, so load the ledger in stable
// pages. A single oversized range silently omitted every bet after row 1000.
export async function fetchFullBetLedger(): Promise<BetLedgerRow[]> {
  const rows: BetLedgerRow[] = [];

  for (let from = 0; ; from += LEDGER_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("bet_ledger_v")
      .select("date, team, game_pk, bet_type, stake, decimal_odds, american_odds, totals_side, won, edge, payout")
      .order("date", { ascending: true })
      .order("game_pk", { ascending: true })
      .order("bet_type", { ascending: true })
      .order("team", { ascending: true })
      .range(from, from + LEDGER_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to load bet ledger: ${error.message}`);
    }

    const page = (data ?? []) as BetLedgerRow[];
    rows.push(...page);
    if (page.length < LEDGER_PAGE_SIZE) return rows;
  }
}
