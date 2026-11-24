// The unit ratings both football sports publish, in table order. Kept out of
// the "use client" components so the card routes can read the names too.
export const FOOTBALL_UNIT_COLUMNS = [
  { key: "rush_offense", label: "Rush O", name: "Rush offense" },
  { key: "pass_offense", label: "Pass O", name: "Pass offense" },
  { key: "rush_defense", label: "Rush D", name: "Rush defense" },
  { key: "pass_defense", label: "Pass D", name: "Pass defense" },
  { key: "pass_block", label: "Pass Blk", name: "Pass blocking" },
  { key: "run_block", label: "Run Blk", name: "Run blocking" },
] as const;

export const NFL_UNIT_COLUMNS = [
  ...FOOTBALL_UNIT_COLUMNS,
  { key: "special_teams", label: "ST", name: "Special teams" },
] as const;
