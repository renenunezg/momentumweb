import { supabase } from "@/lib/supabase";

// The newest write to today's picks or games. The live-scores poll carries
// it so an open games page reloads its picks only when the pipeline or the
// grader has actually written something, with no Realtime connection.
export function latestStamp(stamps: (string | null | undefined)[]) {
  return stamps.reduce<string | null>((best, stamp) => {
    if (!stamp) return best;
    return best == null || Date.parse(stamp) > Date.parse(best) ? stamp : best;
  }, null);
}

export async function fetchPicksVersion(today: string) {
  const [outputs, games] = await Promise.all([
    supabase
      .from("model_outputs")
      .select("updated_at")
      .eq("date", today)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("games")
      .select("updated_at")
      .eq("game_date", today)
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);
  return latestStamp([
    outputs.data?.[0]?.updated_at,
    games.data?.[0]?.updated_at,
  ]);
}
