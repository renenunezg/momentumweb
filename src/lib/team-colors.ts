import type { CfbTeamIdentity } from "@/lib/types";

// CFBD's team colors are dirty in ways that reach the browser if unchecked:
// a missing color is the literal string "#null" rather than null, and would
// land in a style attribute as an invalid CSS color.
//
// Only the primary is used, and only as an accent (edge bar and a faint
// tint), never as a text background. That matters, because the primary and
// secondary are not a usable pair: 55 of the 243 D1 teams have a secondary
// that fails WCAG AA against their own primary, and a few (San Diego) ship
// the same hex for both. Text stays on the theme's own foreground color, so
// none of that can make a row unreadable.
const HEX = /^#[0-9a-f]{6}$/;

export function teamColor(team: CfbTeamIdentity | undefined): string | null {
  if (!team?.color) return null;
  const hex = team.color.trim().toLowerCase();
  return HEX.test(hex) ? hex : null;
}
