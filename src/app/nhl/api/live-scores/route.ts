import { NextResponse } from "next/server";
import { NHL_SCORE_URL, parseScoreFeed } from "@/lib/nhl-live";
import { siteDate } from "@/lib/daily-picks";

export const dynamic = "force-dynamic";

// Cached proxy to the NHL score feed for the site's day. The CDN window
// bounds upstream reads regardless of how many browsers poll.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const requested = params.get("date");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(requested ?? "")
    ? (requested as string)
    : siteDate();
  try {
    const res = await fetch(`${NHL_SCORE_URL}/${date}`, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (momentumweb; renenunez.dev)" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`score feed ${res.status}`);
    const games = parseScoreFeed(await res.json());
    return NextResponse.json(
      { games },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } },
    );
  } catch {
    return NextResponse.json({ games: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
