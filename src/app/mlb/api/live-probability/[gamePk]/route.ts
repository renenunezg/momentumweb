import { liveProbabilityRoute } from "@/lib/live-probability-route";
import { parseLiveProbability } from "@/lib/mlb-live-probability";

export const GET = liveProbabilityRoute({
  schema: "mlb",
  param: "gamePk",
  column: "game_pk",
  // Fifteen digits at most, so the id is always a safe integer.
  gameId: /^[1-9]\d{0,14}$/,
  parse: (payload, gamePk) => parseLiveProbability(payload, Number(gamePk)),
  cdnSeconds: 15,
});
