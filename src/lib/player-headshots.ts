// CFBD athlete ids match ESPN; missing CDN portraits use PlayerHeadshot's fallback.
export function cfbPlayerHeadshotUrl(athleteId: string): string {
  return `https://a.espncdn.com/i/headshots/college-football/players/full/${athleteId}.png`;
}
