import { csvResponse } from "@/lib/csv-export";
import { LMB_EXPORTS } from "@/lib/exports";

// Both team rows of every LMB forecast, frozen at first pitch.
export const dynamic = "force-dynamic";

export function GET() {
  return csvResponse(LMB_EXPORTS.forecasts);
}
