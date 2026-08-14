import type { CfbTeamIdentity } from "@/lib/types";

const HEX = /^#[0-9a-f]{6}$/;

// CFBD writes a missing color as the literal string "#null", which would reach
// a style attribute as an invalid CSS color. Anything that is not a plain
// six-digit hex becomes null so callers fall back deliberately.
export function teamColor(team: CfbTeamIdentity | undefined): string | null {
  if (!team?.color) return null;
  const hex = team.color.trim().toLowerCase();
  return HEX.test(hex) ? hex : null;
}
