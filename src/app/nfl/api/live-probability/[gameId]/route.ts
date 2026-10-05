import { parseFootballLiveProbability } from "@/lib/football-live-probability";
import { liveProbabilityRoute } from "@/lib/live-probability-route";

export const GET = liveProbabilityRoute({
  schema: "nfl",
  param: "gameId",
  column: "game_id",
  gameId: /^\d{4}_\d{2}_[A-Z]{2,3}_[A-Z]{2,3}$/,
  parse: parseFootballLiveProbability,
  cdnSeconds: 20,
});
