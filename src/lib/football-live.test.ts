import { test } from "node:test";
import assert from "node:assert/strict";
import { fieldGeometry, liveKey, pollPlan, type LiveGame } from "./football-live.ts";

const MIN = 60_000;
const game = (over: Partial<LiveGame>): LiveGame => ({
  id: "1",
  home: "LAR",
  away: "SF",
  start: null,
  state: "pre",
  home_score: null,
  away_score: null,
  detail: null,
  possession: null,
  situation: null,
  yard_line: null,
  distance: null,
  ...over,
});

test("NFL ids resolve to the provider's home abbreviation", () => {
  assert.equal(liveKey("nfl", "2026_01_SF_LA"), "LAR");
  assert.equal(liveKey("nfl", "2026_01_NYG_WAS"), "WSH");
  assert.equal(liveKey("nfl", "2026_01_TB_CIN"), "CIN");
  assert.equal(liveKey("cfb", 401858439), "401858439");
});

test("a page with nothing near kickoff makes no request and sleeps to the next one", () => {
  const now = Date.parse("2026-09-10T12:00:00Z");
  const refs = [
    { key: "a", start: now + 2 * 24 * 60 * MIN },
    { key: "b", start: now + 3 * 24 * 60 * MIN },
  ];
  const plan = pollPlan(refs, new Map(), false, now);
  assert.equal(plan.action, "wait");
  // Capped so a long wait is re-planned, and never past the first kickoff.
  assert.ok(plan.action === "wait" && plan.delay <= 6 * 60 * MIN);
});

test("past kickoffs are read once for finals, then only live games keep polling", () => {
  const now = Date.parse("2026-09-13T03:00:00Z");
  const refs = [
    { key: "a", start: now - 5 * 60 * MIN },
    { key: "b", start: now - 3 * 60 * MIN },
  ];
  assert.equal(pollPlan(refs, new Map(), false, now).action, "poll");
  const allFinal = new Map([
    ["a", game({ state: "post" })],
    ["b", game({ state: "post" })],
  ]);
  assert.equal(pollPlan(refs, allFinal, true, now).action, "stop");
  const oneLive = new Map([
    ["a", game({ state: "post" })],
    ["b", game({ state: "in" })],
  ]);
  assert.equal(pollPlan(refs, oneLive, true, now).action, "poll");
});

test("the provider's moved kickoff replaces the published one", () => {
  const now = Date.parse("2026-09-12T20:00:00Z");
  const refs = [{ key: "a", start: now - 30 * MIN }];
  const moved = new Map([
    ["a", game({ start: new Date(now + 3 * 60 * MIN).toISOString() })],
  ]);
  const plan = pollPlan(refs, moved, true, now);
  assert.equal(plan.action, "wait");
  assert.ok(plan.action === "wait" && plan.delay === 3 * 60 * MIN - 5 * MIN);
});

test("the field strip puts the ball on the provider's absolute yard line and points the offense the right way", () => {
  // Rams (home) at their own 26: near the home end zone on the right, driving left.
  const home = fieldGeometry(
    game({ state: "in", possession: "home", yard_line: 26, distance: 7 }),
  );
  assert.deepEqual(home, { ball: 74, lineToGain: 67, direction: -1 });
  // 49ers (away) at their own 39 is 61 from the home goal line, driving right.
  const away = fieldGeometry(
    game({ state: "in", possession: "away", yard_line: 61, distance: 10 }),
  );
  assert.deepEqual(away, { ball: 39, lineToGain: 49, direction: 1 });
  assert.equal(fieldGeometry(game({ state: "post", yard_line: 26 })), null);
});
