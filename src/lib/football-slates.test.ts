import assert from "node:assert/strict";
import test from "node:test";
import { footballSlateClock, groupFootballSlates } from "./football-slates.ts";

const game = (id: string, start_date: string | null) => ({ id, start_date });

test("slates are clock hours on the league clock, and NFL evening slates carry their broadcast name", () => {
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
  assert.equal(pacific.title(slates[0]), "Wednesday · 5 PM");
  assert.equal(pacific.title(slates[2]), "Sunday · 10 AM");
  assert.equal(pacific.title(slates[3]), "Sunday · 1 PM");
  assert.equal(pacific.hour(slates[3].start), "1 PM");
  assert.equal(pacific.time(slates[3].start), "1:05 PM");
  assert.equal(pacific.title(slates[6]), "Kickoff TBD");
  const revised = groupFootballSlates([game("opener", "2026-09-12T19:00:00Z")]);
  assert.equal(pacific.title(revised[0]), "Saturday · 12 PM");
});

test("visitor timezone changes dates and DST offsets without changing slate membership", () => {
  const slates = groupFootballSlates([
    game("early", "2026-09-13T17:00:00Z"),
    game("snf", "2026-09-14T00:20:00Z"),
  ]);
  assert.equal(
    footballSlateClock("America/New_York").title(slates[0]),
    "Sunday · 1 PM",
  );
  const tokyo = footballSlateClock("Asia/Tokyo");
  assert.equal(tokyo.title(slates[0]), "Monday · 2 AM");
  assert.equal(tokyo.title(slates[1]), "SNF");
  assert.match(tokyo.kickoff(slates[1].start), /Mon, Sep 14 · 9:20 AM/);
  assert.equal(
    footballSlateClock("Asia/Kolkata").title(slates[0]),
    "Sunday · 10 PM",
  );
  const pacific = footballSlateClock("America/Los_Angeles");
  assert.match(pacific.kickoff("2026-10-25T17:00:00Z"), /10:00 AM PDT/);
  assert.match(pacific.kickoff("2026-11-01T18:00:00Z"), /10:00 AM PST/);
  const sep = Date.parse("2026-09-13T17:00:00Z");
  const nov = Date.parse("2026-11-08T18:00:00Z");
  assert.equal(pacific.zone(sep), "Pacific Daylight Time (PDT)");
  assert.equal(pacific.zone(nov), "Pacific Standard Time (PST)");
  assert.equal(
    footballSlateClock("Europe/Berlin").zone(sep),
    "Central European Summer Time (GMT+2)",
  );
  assert.equal(
    footballSlateClock("UTC").zone(sep),
    "Coordinated Universal Time (UTC)",
  );
});

test("stragglers join their hour, the next hour starts a slate, and undated games come last", () => {
  const slates = groupFootballSlates(
    [
      game("tbd", null),
      game("12:45", "2026-09-12T16:45:00Z"),
      game("1:00", "2026-09-12T17:00:00Z"),
      game("12:00", "2026-09-12T16:00:00Z"),
      game("12:30", "2026-09-12T16:30:00Z"),
    ],
    "cfb",
  );
  assert.deepEqual(
    slates.map((slate) => slate.games.map((g) => g.id)),
    [["12:00", "12:30", "12:45"], ["1:00"], ["tbd"]],
  );
  assert.equal(slates[0].start, Date.parse("2026-09-12T16:00:00Z"));
  assert.ok(slates.every((slate) => slate.broadcast === null));
  const eastern = footballSlateClock("America/New_York");
  assert.equal(eastern.title(slates[0]), "Saturday · 12 PM");
  assert.equal(eastern.title(slates[1]), "Saturday · 1 PM");
  assert.equal(eastern.title(slates[2]), "Kickoff TBD");
});
