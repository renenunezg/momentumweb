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

// The NHL's own portrait of a player, for a graded player the published row
// has no headshot for because he is off his club's current roster.
export function nhlPlayerHeadshotUrl(playerId: string): string {
  return `https://assets.nhle.com/mugs/nhl/latest/${playerId}.png`;
}

// MLB's people CDN serves major and minor leaguers by Stats API person id. The silo
// cut is a transparent square like ESPN's portraits, so it sits in the round frame whole;
// the tables' stored headshot_url is the opaque 2:3 photo and goes unread.
export function mlbPlayerHeadshotUrl(playerId: number): string {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_213,q_auto:best/v1/people/${playerId}/headshot/silo/current`;
}

// LMB players are minor leaguers to the Stats API, and the milb cut covers about 93% of
// them (the MLB headshot only about 43%). It is an opaque 2:3 photo, so crop it to the
// round frame. The d_ default makes the CDN answer MLB's silhouette for a missing photo.
export function lmbPlayerHeadshotUrl(playerId: number): string {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_120,q_auto:best/v1/people/${playerId}/headshot/milb/current`;
}
