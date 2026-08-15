// MLB Stats API team id by the canonical 3-letter code the model writes to
// `mlb.games` and `mlb.model_outputs`. The codes are Baseball-Reference style
// (SFG, SDP, TBR, WSN, KCR), not the Stats API's own abbreviations, so this
// cannot be derived and is transcribed instead. Verified against the 30
// distinct codes present in the database.
//
// Duplicated from the model repo on purpose: Supabase is the only interface
// between this site and a model repo, so the map is copied rather than
// imported. It changes only when a franchise relocates or rebrands.
const MLB_TEAM_ID: Record<string, number> = {
  ARI: 109, ATH: 133, ATL: 144, BAL: 110, BOS: 111, CHC: 112,
  CHW: 145, CIN: 113, CLE: 114, COL: 115, DET: 116, HOU: 117,
  KCR: 118, LAA: 108, LAD: 119, MIA: 146, MIL: 158, MIN: 142,
  NYM: 121, NYY: 147, PHI: 143, PIT: 134, SDP: 135, SEA: 136,
  SFG: 137, STL: 138, TBR: 139, TEX: 140, TOR: 141, WSN: 120,
};

// MLB serves cap logos as SVG off a public CDN keyed by team id, with separate
// artwork cut for light and dark backgrounds. Nothing is fetched or stored: the
// URL is a pure function of the code, so logos cost no request at build time
// and no column in Supabase.
const LOGO_BASE = "https://www.mlbstatic.com/team-logos";

// [primary, alternate] per team. MLB publishes no color feed, so these are
// transcribed once rather than fetched: they change only on a rebrand, and a
// live lookup would add a request that can fail for a value that never moves.
const MLB_TEAM_COLOR: Record<string, [string, string]> = {
  ARI: ["#aa182c", "#000000"], ATH: ["#003831", "#efb21e"], ATL: ["#0c2340", "#ba0c2f"],
  BAL: ["#df4601", "#000000"], BOS: ["#0d2b56", "#bd3039"], CHC: ["#0e3386", "#cc3433"],
  CHW: ["#000000", "#c4ced4"], CIN: ["#c6011f", "#ffffff"], CLE: ["#002b5c", "#e31937"],
  COL: ["#33006f", "#000000"], DET: ["#0a2240", "#ff4713"], HOU: ["#002d62", "#eb6e1f"],
  KCR: ["#004687", "#7ab2dd"], LAA: ["#ba0021", "#c4ced4"], LAD: ["#005a9c", "#ffffff"],
  MIA: ["#00a3e0", "#000000"], MIL: ["#13294b", "#ffc72c"], MIN: ["#031f40", "#e20e32"],
  NYM: ["#002d72", "#ff5910"], NYY: ["#132448", "#c4ced4"], PHI: ["#e81828", "#003278"],
  PIT: ["#000000", "#fdb827"], SDP: ["#2f241d", "#ffc425"], SEA: ["#005c5c", "#0c2c56"],
  SFG: ["#000000", "#fd5a1e"], STL: ["#be0a14", "#001541"], TBR: ["#092c5c", "#8fbce6"],
  TEX: ["#003278", "#c0111f"], TOR: ["#134a8e", "#6cace5"], WSN: ["#ab0003", "#11225b"],
};

export interface MlbTeamIdentity {
  logo_light: string | null;
  logo_dark: string | null;
  color: string | null;
}

// Three clubs list black as their primary, which vanishes as a rule or a tint
// against a dark background. Only near-black is swapped for the alternate, so
// the many navy clubs keep the color they are actually known by.
function displayColor([primary, alternate]: [string, string]): string {
  const max = Math.max(
    parseInt(primary.slice(1, 3), 16),
    parseInt(primary.slice(3, 5), 16),
    parseInt(primary.slice(5, 7), 16)
  );
  return max < 38 ? alternate : primary;
}

// An unknown code yields nulls rather than a guessed URL, so TeamLogo falls
// back to its monogram instead of rendering a broken image.
export function mlbTeamIdentity(code: string | null | undefined): MlbTeamIdentity | undefined {
  if (!code) return undefined;
  const key = code.trim().toUpperCase();
  const id = MLB_TEAM_ID[key];
  if (id === undefined) return undefined;
  const pair = MLB_TEAM_COLOR[key];
  return {
    logo_light: `${LOGO_BASE}/team-cap-on-light/${id}.svg`,
    logo_dark: `${LOGO_BASE}/team-cap-on-dark/${id}.svg`,
    color: pair ? displayColor(pair) : null,
  };
}
