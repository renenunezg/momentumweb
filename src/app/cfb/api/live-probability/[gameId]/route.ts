import { parseFootballLiveProbability } from "@/lib/football-live-probability";
import { liveProbabilityRoute } from "@/lib/live-probability-route";

export const GET = liveProbabilityRoute({
  schema: "cfb",
  param: "gameId",
  column: "game_id",
  gameId: /^[1-9]\d{0,15}$/,
  parse: parseFootballLiveProbability,
  cdnSeconds: 20,
});
