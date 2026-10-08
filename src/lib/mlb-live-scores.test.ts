import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchMlbSchedule } from "./mlb-live-scores.ts";

test("schedule body finishes before slow metadata, with upstream failures and retries isolated", async (t) => {
  const controller = new AbortController();
  const games = [{ gamePk: 42, status: { detailedState: "Final" } }];
  let bodyRead = false;
  const fetchMock = t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => ({
    ok: true,
    json: async () => {
      init?.signal?.throwIfAborted();
      bodyRead = true;
      return { dates: [{ games }] };
    },
  } as Response));
  let release!: (value: string) => void;
  const metadata = new Promise<string>(resolve => { release = resolve; });
  const combined = Promise.all([fetchMlbSchedule("2026-10-08", controller.signal), metadata]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(bodyRead, true, "body must be consumed while metadata is still pending");
  controller.abort();
  release("latest-picks-version");
  assert.deepEqual(await combined, [{ ok: true, games }, "latest-picks-version"]);

  fetchMock.mock.mockImplementation(async () => new Response(null, { status: 503 }));
  assert.deepEqual(await fetchMlbSchedule("2026-10-08"), { ok: false, status: 503 });
  fetchMock.mock.mockImplementation(async (_url: unknown, init?: RequestInit) => ({
    ok: true, json: async () => { init?.signal?.throwIfAborted(); return {}; },
  } as Response));
  await assert.rejects(fetchMlbSchedule("2026-10-08", controller.signal), { name: "AbortError" });
  assert.deepEqual(await fetchMlbSchedule("2026-10-08"), { ok: true, games: [] });
  fetchMock.mock.mockImplementation(async () => { throw new TypeError("network unavailable"); });
  await assert.rejects(fetchMlbSchedule("2026-10-08"), /network unavailable/);
});
