import { impliedProbability } from "@/lib/utils";

// Pure helpers over NHL quote rows, apart from the loader so client components
// do not bundle supabase-js.

// Home win probability of a two-sided close with the vig removed
// proportionally, the same definition the accuracy RPC scores.
export function closingHomeProb(
  homePrice: number | null,
  awayPrice: number | null,
): number | null {
  if (homePrice == null || awayPrice == null) return null;
  const home = impliedProbability(homePrice);
  return home / (home + impliedProbability(awayPrice));
}

export const PROVIDER_NAMES: Record<string, string> = {
  draftkings: "DraftKings",
  fanduel: "FanDuel",
};
