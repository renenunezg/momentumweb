import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

// Called by a Postgres statement trigger (public.site_revalidate) whenever a
// pipeline writes a table the site reads. Marking the sport's pages and
// cached reads stale here is what lets every page keep an hour-long cache
// instead of regenerating on a timer: the next visit after a publish renders
// fresh, and a quiet day costs no renders at all.

const SPORTS = new Set(["mlb", "cfb", "nfl"]);

function authorized(request: Request) {
  const expected = process.env.REVALIDATE_SECRET;
  const given = request.headers.get("x-revalidate-secret");
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    schema?: unknown;
  } | null;
  const sport = typeof body?.schema === "string" ? body.schema : "";
  if (!SPORTS.has(sport)) {
    return NextResponse.json({ error: "unknown schema" }, { status: 400 });
  }
  // "max" expires the tag with no stale window so the next visit reads fresh.
  revalidateTag(sport, "max");
  revalidatePath(`/${sport}`, "layout");
  // The home page shows each sport's headline numbers.
  revalidatePath("/");
  return NextResponse.json({ revalidated: sport });
}
