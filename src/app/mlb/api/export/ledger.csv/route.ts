import { csvResponse } from "@/lib/csv-export";
import { mlbLedgerExport } from "@/lib/exports";

// One row per graded MLB prediction, as the performance page scores it.
export const dynamic = "force-dynamic";

export function GET() {
  return csvResponse(mlbLedgerExport);
}
