import { NextResponse } from "next/server";
import { siteDate } from "@/lib/daily-picks";
import { LMB_SCHEDULE_SCOPE } from "@/lib/lmb";
import { fetchMlbSchedule, toLiveScore } from "@/lib/mlb-live-scores";

export const dynamic = "force-dynamic";

// Cached proxy to the Stats API's LMB schedule for the site's day. The CDN
// window bounds upstream reads however many browsers poll, and nothing here
// reads or writes Supabase.
export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("date");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(requested ?? "") ? (requested as string) : siteDate();
  try {
    const schedule = await fetchMlbSchedule(date, AbortSignal.timeout(4000), LMB_SCHEDULE_SCOPE);
    if (!schedule.ok) throw new Error(`Stats API ${schedule.status}`);
    return NextResponse.json(
      { scores: schedule.games.map(toLiveScore) },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } },
    );
  } catch {
    return NextResponse.json({ scores: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
