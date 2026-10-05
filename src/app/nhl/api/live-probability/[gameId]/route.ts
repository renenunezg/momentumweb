import { liveProbabilityRoute } from "@/lib/live-probability-route";
import { parseNhlLiveProbability } from "@/lib/nhl-live-probability";

export const GET = liveProbabilityRoute({
  schema: "nhl",
  param: "gameId",
  column: "game_id",
  gameId: /^\d{10}$/,
  parse: parseNhlLiveProbability,
  cdnSeconds: 20,
});
