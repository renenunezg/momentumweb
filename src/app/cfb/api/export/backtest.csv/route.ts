import { csvResponse } from "@/lib/csv-export";
import { FOOTBALL_EXPORTS, withColumnsFromFirstRow } from "@/lib/exports";

// Every row of the historical walk-forward backtest the performance page sums.
export const dynamic = "force-dynamic";

export function GET() {
  return csvResponse(withColumnsFromFirstRow(FOOTBALL_EXPORTS.cfb.backtest));
}
