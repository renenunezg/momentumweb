const HEX = /^#[0-9a-f]{6}$/;

// Structural, so CfbTeamIdentity and NflTeamIdentity both satisfy it without
// this module knowing which sport it is coloring.
interface TeamColorSource {
  color: string | null;
}

// CFBD writes a missing color as the literal string "#null", which would reach
// a style attribute as an invalid CSS color. Anything that is not a plain
// six-digit hex becomes null so callers fall back deliberately.
export function teamColor(team: TeamColorSource | undefined): string | null {
  if (!team?.color) return null;
  const hex = team.color.trim().toLowerCase();
  return HEX.test(hex) ? hex : null;
}
