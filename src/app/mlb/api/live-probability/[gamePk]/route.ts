import { NextResponse } from "next/server";
import { parseLiveProbability } from "@/lib/mlb-live-probability";

export async function GET(_request: Request, { params }: { params: Promise<{ gamePk: string }> }) {
  const { gamePk: raw } = await params;
  const gamePk = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(gamePk) || gamePk <= 0) {
    return NextResponse.json({ error: "Invalid game" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const url = new URL("/rest/v1/live_win_probability", process.env.NEXT_PUBLIC_SUPABASE_URL);
    url.search = new URLSearchParams({ select: "payload", game_pk: `eq.${gamePk}`, limit: "1" }).toString();
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    // The CDN window alone bounds Supabase reads to one per game per window,
    // however many dialogs are open. A data-cache copy would bill a write on
    // every snapshot.
    const response = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Accept-Profile": "mlb" },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Snapshot unavailable");
    const rows: { payload?: unknown }[] = await response.json();
    const snapshot = parseLiveProbability(rows[0]?.payload, gamePk);
    // Share public snapshots at the edge without retaining an old browser copy.
    const shared = {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Vercel-CDN-Cache-Control": "public, s-maxage=15",
    };
    if (!snapshot) return NextResponse.json({ error: "Win probability is not available for this game yet." },
      { status: 404, headers: shared });
    return NextResponse.json(snapshot, { headers: shared });
  } catch {
    return NextResponse.json({ error: "Win probability is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
