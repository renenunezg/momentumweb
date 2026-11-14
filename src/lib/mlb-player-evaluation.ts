// Frozen report read from mlb.player_value_models.payload (model player-value-v3-grade)
// in Supabase on 2026-11-14. Shared by methodology and performance; not live scores.
//
// The current grade has no untouched holdout yet: its development pairs run
// 2021 to 2022 through 2025 to 2026, and the 2026 to 2027 pair is the first
// test the design never saw. The numbers below are leave-one-pair-out means
// over the five development pairs; hyperparameters were chosen on the same
// pairs, so they are development results, not a holdout.
export const MLB_PLAYER_EVALUATION = {
  modelVersion: "player-value-v3-grade",
  fittedAt: "2026-11-01T00:18:18.765044Z",
  devSeasons: [2021, 2022, 2023, 2024, 2025, 2026],
  pairs: 5,
  holdoutPair: [2026, 2027],
  groups: [
    {
      key: "hitter",
      label: "Batters",
      n: 345,
      grade: 0.47431216731384424,
      shrunkOnly: 0.37103925299805085,
      priorProduction: 0.3544086987253151,
      marcel: 0.3691826865934715,
    },
    {
      key: "SP",
      label: "Starting pitchers",
      n: 171,
      grade: 0.41736033991468596,
      shrunkOnly: 0.3184064756122278,
      priorProduction: 0.3434322715867311,
      marcel: 0.3119454958837305,
    },
    {
      key: "RP",
      label: "Relievers",
      n: 175,
      grade: 0.29291088150601624,
      shrunkOnly: 0.18100198876846135,
      priorProduction: 0.12683863249540714,
      marcel: 0.1661812281681556,
    },
  ],
  // The retired player-value-v1 grade, scored once on the 2025 to 2026 pair it
  // never saw. Kept so the page can say what the previous version did out of
  // sample while the current one waits for 2027.
  previous: {
    modelVersion: "player-value-v1",
    inputSeason: 2025,
    outcomeSeason: 2026,
    groups: [
      { key: "hitter", label: "Batters", n: 335, grade: 0.40387178734216006, priorXwoba: 0.38397207194243194, marcel: 0.3276971643067809 },
      { key: "SP", label: "Starting pitchers", n: 175, grade: 0.38886699507389166, priorProduction: 0.3337303487220521, marcel: 0.2898454993282579 },
      { key: "RP", label: "Relievers", n: 167, grade: 0.19183577767013307, priorProduction: 0.02526380466433361, marcel: 0.10482906819751205 },
    ],
  },
} as const;
