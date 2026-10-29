import test from "node:test";
import assert from "node:assert/strict";
import { csvLine } from "./csv-export.ts";

test("cells with commas, quotes or newlines are quoted and quotes doubled", () => {
  const line = csvLine(["a", "b", "c", "d"], { a: 'say "hi"', b: "x,y", c: "line\nbreak", d: 1.5 });
  assert.equal(line, '"say ""hi""","x,y","line\nbreak",1.5\n');
});

test("nulls are empty, objects are JSON, column order is the spec's", () => {
  const line = csvLine(["z", "y", "x"], { x: null, y: { k: 1 }, z: true });
  assert.equal(line, 'true,"{""k"":1}",\n');
});
