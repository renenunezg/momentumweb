import { csvResponse } from "@/lib/csv-export";
import { mlbPredictionsExport } from "@/lib/exports";

// Both team rows of every MLB game with a stored forecast, with the write
// time of each prediction against its first pitch.
export const dynamic = "force-dynamic";

export function GET() {
  return csvResponse(mlbPredictionsExport);
}
