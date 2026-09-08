import assert from "node:assert/strict";
import test from "node:test";
import { footballSlateClock, groupFootballSlates } from "./football-slates.ts";

const game = (id: string, start_date: string | null) => ({ id, start_date });

test("slates follow kickoff dates, combining staggered late starts and preserving special games", () => {
  const games = [
    game("late-25", "2026-09-13T20:25:00Z"),
    game("opener", "2026-09-10T00:20:00Z"),
    game("tnf", "2026-09-11T00:35:00Z"),
    game("early", "2026-09-13T17:00:00Z"),
    game("late-05", "2026-09-13T20:05:00Z"),
    game("snf", "2026-09-14T00:20:00Z"),
    game("mnf", "2026-09-15T00:15:00Z"),
    game("unknown", null),
  ];
  const slates = groupFootballSlates(games);
  assert.deepEqual(
    slates.map((slate) => slate.games.map((g) => g.id)),
    [
      ["opener"],
      ["tnf"],
      ["early"],
      ["late-05", "late-25"],
      ["snf"],
      ["mnf"],
      ["unknown"],
    ],
  );
  assert.deepEqual(
    slates.map((slate) => slate.broadcast),
    [null, "TNF", null, null, "SNF", "MNF", null],
  );
  const pacific = footballSlateClock("America/Los_Angeles");
  assert.equal(pacific.title(slates[0]), "Wednesday · 5:20 PM");
  assert.equal(pacific.title(slates[2]), "Sunday · 10:00 AM");
  assert.equal(pacific.title(slates[3]), "Sunday · 1:05 PM - 1:25 PM");
  assert.equal(pacific.title(slates[6]), "Kickoff TBD");
  const revised = groupFootballSlates([game("opener", "2026-09-12T19:00:00Z")]);
  assert.equal(pacific.title(revised[0]), "Saturday · 12:00 PM");
});

test("visitor timezone changes dates and DST offsets without changing slate membership", () => {
  const slates = groupFootballSlates([
    game("early", "2026-09-13T17:00:00Z"),
    game("snf", "2026-09-14T00:20:00Z"),
  ]);
  assert.equal(
    footballSlateClock("America/New_York").title(slates[0]),
    "Sunday · 1:00 PM",
  );
  const tokyo = footballSlateClock("Asia/Tokyo");
  assert.equal(tokyo.title(slates[0]), "Monday · 2:00 AM");
  assert.equal(tokyo.title(slates[1]), "SNF");
  assert.match(tokyo.kickoff(slates[1].start), /Mon, Sep 14 · 9:20 AM/);
  assert.equal(
    footballSlateClock("Asia/Kolkata").title(slates[0]),
    "Sunday · 10:30 PM",
  );
  const pacific = footballSlateClock("America/Los_Angeles");
  assert.match(pacific.kickoff("2026-10-25T17:00:00Z"), /10:00 AM PDT/);
  assert.match(pacific.kickoff("2026-11-01T18:00:00Z"), /10:00 AM PST/);
});

test("separate dates and anchored windows cannot chain into one oversized slate", () => {
  const slates = groupFootballSlates([
    game("first", "2026-09-13T17:00:00Z"),
    game("staggered", "2026-09-13T18:15:00Z"),
    game("next", "2026-09-13T19:30:00Z"),
    game("before-midnight", "2026-09-14T03:30:00Z"),
    game("after-midnight", "2026-09-14T04:15:00Z"),
  ]);
  assert.deepEqual(
    slates.map((slate) => slate.games.map((g) => g.id)),
    [["first", "staggered"], ["next"], ["before-midnight"], ["after-midnight"]],
  );
});
