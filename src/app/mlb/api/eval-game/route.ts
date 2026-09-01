import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { runEvalForGame } from "@/lib/eval-game";

// Live per-game grading, fired by GamesLive when a game flips to Final.
//
// This route has no user auth: the site has no users. What keeps it safe is
// that it is idempotent and cheap to repeat. Every value it writes comes from
// the MLB Stats API, never from the request, and runEvalForGame returns after
// one indexed lookup when the game is already graded. The Sec-Fetch-Site check
// is CSRF hygiene for browser callers, not an authorization boundary.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isSameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  return site == null || site === "same-origin" || site === "none";
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "service role env not configured" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const game_pk =
    typeof body === "object" && body !== null && "game_pk" in body
      ? body.game_pk
      : undefined;
  if (typeof game_pk !== "number" || !Number.isSafeInteger(game_pk) || game_pk <= 0) {
    return NextResponse.json({ error: "game_pk must be a positive integer" }, { status: 400 });
  }

  const sb = createClient<Database, "mlb">(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "mlb" },
  });
  const result = await runEvalForGame(sb, game_pk);
  const status = result.ok ? 200 : "error" in result ? 500 : 409;
  return NextResponse.json(result, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
