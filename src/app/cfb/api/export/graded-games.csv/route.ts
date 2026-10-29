import { csvResponse } from "@/lib/csv-export";
import { FOOTBALL_EXPORTS, withColumnsFromFirstRow } from "@/lib/exports";

// One frozen grading record per completed game behind the live accuracy tab.
export const dynamic = "force-dynamic";

export function GET() {
  return csvResponse(withColumnsFromFirstRow(FOOTBALL_EXPORTS.cfb.gradedGames));
}
