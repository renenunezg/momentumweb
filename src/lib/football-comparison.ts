export interface ComparisonProjection {
  gameId: string;
  awayKey: string;
  homeKey: string;
  awayTeam: string;
  homeTeam: string;
  season: number;
  week: number;
  kickoff: string | null;
  neutralSite: boolean | null;
  forecastSpread: number | null;
  pureSpread: number | null;
  marketSpread: number | null;
  awayPoints: number | null;
  homePoints: number | null;
  asOf: string;
}

export interface ComparisonProjections {
  games: ComparisonProjection[];
  unavailable: boolean;
}
