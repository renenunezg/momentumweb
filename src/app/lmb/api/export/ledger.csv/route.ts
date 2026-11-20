import { csvResponse } from "@/lib/csv-export";
import { LMB_EXPORTS } from "@/lib/exports";

// One row per graded LMB pick, as the performance page scores it.
export const dynamic = "force-dynamic";

export function GET() {
  return csvResponse(LMB_EXPORTS.ledger);
}
