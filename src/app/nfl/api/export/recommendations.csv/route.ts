import { csvResponse } from "@/lib/csv-export";
import { FOOTBALL_EXPORTS } from "@/lib/exports";

// Every recorded market decision, recommended or No Play, behind the
// prediction record.
export const dynamic = "force-dynamic";

export function GET() {
  return csvResponse(FOOTBALL_EXPORTS.nfl.recommendations);
}
