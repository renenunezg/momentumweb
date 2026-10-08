import { test } from "node:test";
import assert from "node:assert/strict";

// These public placeholders keep this service-boundary test entirely offline.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://offline-test.invalid";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "offline-test-anon";
const { fetchBettingHeadline } = await import("./bet-ledger.ts");

test("headline uses one fresh RPC and falls back only while the function is missing", async (t) => {
  const calls: string[] = [];
  let code: string | null = null;
  let ledgerFails = false;
  const summary = [{ bet_type: "ml", wins: 1001, losses: 0, pushes: 0, total_stake: 1001, total_payout: 2002 }];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("/rpc/betting_headline")) {
      return Response.json(code ? { code, message: "unavailable" } : summary, { status: code ? 404 : 200 });
    }
    assert.match(url, /\/bet_ledger_v\?/);
    if (ledgerFails) return Response.json({ code: "57014", message: "ledger timeout" }, { status: 500 });
    const offset = Number(new URL(url).searchParams.get("offset"));
    return Response.json(Array.from({ length: offset === 0 ? 1000 : 1 }, (_, i) => ({
      date: "2026-06-01", game_pk: offset + i, team: "BOS", bet_type: "ml",
      won: true, push: false, stake: 1, payout: 2,
    })));
  });
  assert.deepEqual(await fetchBettingHeadline(), summary);
  assert.equal(calls.length, 1);
  for (code of ["PGRST202", "42883"]) {
    calls.length = 0;
    assert.deepEqual(await fetchBettingHeadline(), summary);
    assert.equal(calls.length, 3);
    assert.match(calls[2], /offset=1000/);
    assert.match(calls[1], /order=date.asc%2Cgame_pk.asc%2Cbet_type.asc%2Cteam.asc/);
  }
  code = "57014";
  calls.length = 0;
  await assert.rejects(fetchBettingHeadline(), /Failed to load MLB headline/);
  assert.equal(calls.length, 1, "ordinary failures must not trigger another expensive query");
  code = "PGRST202";
  ledgerFails = true;
  await assert.rejects(fetchBettingHeadline(), /ledger timeout/);
});
