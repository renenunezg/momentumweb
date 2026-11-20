import { csvResponse } from "@/lib/csv-export";
import { LMB_EXPORTS } from "@/lib/exports";

// Every LMB game with its official date, status and final score.
export const dynamic = "force-dynamic";

export function GET() {
  return csvResponse(LMB_EXPORTS.games);
}
