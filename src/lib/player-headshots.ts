// CFBD athlete ids match ESPN; missing CDN portraits use PlayerHeadshot's fallback.
export function cfbPlayerHeadshotUrl(athleteId: string, size?: number): string {
  const path = `/i/headshots/college-football/players/full/${athleteId}.png`;
  return size
    ? `https://a.espncdn.com/combiner/i?img=${path}&w=${size}`
    : `https://a.espncdn.com${path}`;
}

export function nflPlayerHeadshotUrl(
  athleteId: string | number,
  size = 112,
): string {
  return `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${athleteId}.png&w=${size}`;
}

// MLB's people CDN serves major and minor leaguers by Stats API person id (the same link the MLB tables store).
export function mlbPlayerHeadshotUrl(playerId: number): string {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_213,q_auto:best/v1/people/${playerId}/headshot/67/current`;
}
