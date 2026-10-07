// CFBD athlete ids match ESPN; missing CDN portraits use PlayerHeadshot's fallback.
export function cfbPlayerHeadshotUrl(athleteId: string, size?: number): string {
  const path = `/i/headshots/college-football/players/full/${athleteId}.png`;
  return size
    ? `https://a.espncdn.com/combiner/i?img=${path}&w=${size}&h=${size}`
    : `https://a.espncdn.com${path}`;
}

export function nflPlayerHeadshotUrl(
  athleteId: string | number,
  size = 112,
): string {
  return `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${athleteId}.png&w=${size}&h=${size}`;
}
