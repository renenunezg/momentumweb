import { parseNhlLiveProbability } from "@/lib/nhl-live-probability";

export async function GET(_request: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const json = (body: object, status: number) => Response.json(body, {
    status, headers: { "Cache-Control": "no-store" },
  });
  if (!/^\d{10}$/.test(gameId)) return json({ error: "Invalid game" }, 400);
  try {
    const url = new URL("/rest/v1/live_win_probability", process.env.NEXT_PUBLIC_SUPABASE_URL);
    url.search = new URLSearchParams({ select: "payload", game_id: `eq.${gameId}`, limit: "1" }).toString();
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    // The CDN window alone bounds Supabase reads to one per game per window,
    // however many dialogs are open, and needs no revalidate trigger. A
    // data-cache copy would bill a write on every snapshot.
    const response = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Accept-Profile": "nhl" },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Snapshot unavailable");
    const rows: { payload?: unknown }[] = await response.json();
    const snapshot = parseNhlLiveProbability(rows[0]?.payload, gameId);
    const shared = {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Vercel-CDN-Cache-Control": "public, s-maxage=20",
    };
    if (!snapshot) return Response.json(
      { error: "Win probability is not available for this game yet." },
      { status: 404, headers: shared },
    );
    return Response.json(snapshot, { headers: shared });
  } catch {
    return json({ error: "Win probability is temporarily unavailable." }, 503);
  }
}
