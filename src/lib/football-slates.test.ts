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

// A real CFB Saturday (2026 week 2): dense noon, 3:30, and 7:00 ET windows
// with :15/:30/:45 stragglers between them.
const et = (day: number, time: string) =>
  new Date(`2026-09-${day}T${time}:00-04:00`).toISOString();

test("CFB slates keep dense windows whole and split staggered starts at their widest gaps", () => {
  const saturday = [
    "12:00", "12:30", "12:45", "13:00", "13:30", "14:00",
    "15:00", "15:30", "15:45", "16:00", "16:15",
    "17:00", "17:30", "18:00", "18:30",
    "19:00", "19:15", "19:30", "19:45", "20:00",
    "21:00", "22:00", "22:15", "22:30", "23:00", "23:59",
  ];
  const games = [
    game("thu", et(10, "20:00")),
    game("fri-1", et(11, "19:00")),
    game("fri-2", et(11, "19:30")),
    game("fri-3", et(11, "20:00")),
    ...saturday.map((time) => game(`sat-${time}`, et(12, time))),
    game("hawaii", et(13, "00:00")),
    game("tbd", null),
  ];
  const slates = groupFootballSlates(games, "cfb");
  assert.deepEqual(
    slates.map((slate) => slate.games.map((g) => g.id)),
    [
      ["thu"],
      ["fri-1", "fri-2", "fri-3"],
      ["sat-12:00", "sat-12:30", "sat-12:45", "sat-13:00", "sat-13:30", "sat-14:00"],
      ["sat-15:00", "sat-15:30", "sat-15:45", "sat-16:00", "sat-16:15"],
      ["sat-17:00", "sat-17:30", "sat-18:00", "sat-18:30"],
      ["sat-19:00", "sat-19:15", "sat-19:30", "sat-19:45", "sat-20:00"],
      ["sat-21:00"],
      ["sat-22:00", "sat-22:15", "sat-22:30", "sat-23:00", "sat-23:59", "hawaii"],
      ["tbd"],
    ],
  );
  assert.ok(slates.every((slate) => slate.broadcast === null));
  const eastern = footballSlateClock("America/New_York");
  assert.equal(eastern.title(slates[0]), "Thursday · 8:00 PM");
  assert.equal(eastern.title(slates[2]), "Saturday · 12:00 PM - 2:00 PM");
  assert.equal(eastern.title(slates[7]), "Saturday · 10:00 PM - 12:00 AM");
  const pacific = footballSlateClock("America/Los_Angeles");
  assert.equal(pacific.title(slates[2]), "Saturday · 9:00 AM - 11:00 AM");
  assert.equal(pacific.title(slates[7]), "Saturday · 7:00 PM - 9:00 PM");
  const tokyo = footballSlateClock("Asia/Tokyo");
  assert.equal(tokyo.title(slates[2]), "Sunday · 1:00 AM - 3:00 AM");
  assert.equal(tokyo.title(slates[8]), "Kickoff TBD");
});
