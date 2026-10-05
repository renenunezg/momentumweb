// One handler for every sport's live win probability snapshot. Each sport
// supplies where its row lives and how to validate it; the caching policy is
// the same everywhere, so it is written once.
export function liveProbabilityRoute<Param extends string>(source: {
  schema: "mlb" | "cfb" | "nfl" | "nhl";
  /** The route's dynamic segment. */
  param: Param;
  column: "game_pk" | "game_id";
  gameId: RegExp;
  parse: (payload: unknown, gameId: string) => object | null;
  cdnSeconds: number;
}) {
  return async function GET(_request: Request, { params }: { params: Promise<Record<Param, string>> }) {
    const gameId = (await params)[source.param];
    const json = (body: object, status: number) => Response.json(body, {
      status, headers: { "Cache-Control": "no-store" },
    });
    if (!source.gameId.test(gameId)) return json({ error: "Invalid game" }, 400);
    try {
      const url = new URL("/rest/v1/live_win_probability", process.env.NEXT_PUBLIC_SUPABASE_URL);
      url.search = new URLSearchParams({ select: "payload", [source.column]: `eq.${gameId}`, limit: "1" }).toString();
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      // The CDN window alone bounds Supabase reads to one per game per window,
      // however many dialogs are open, and needs no revalidate trigger. A
      // data-cache copy would bill a write on every snapshot.
      const response = await fetch(url, {
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Accept-Profile": source.schema },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error("Snapshot unavailable");
      const rows: { payload?: unknown }[] = await response.json();
      const snapshot = source.parse(rows[0]?.payload, gameId);
      // Share public snapshots at the edge without retaining an old browser copy.
      const shared = {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Vercel-CDN-Cache-Control": `public, s-maxage=${source.cdnSeconds}`,
      };
      if (!snapshot) return Response.json(
        { error: "Win probability is not available for this game yet." },
        { status: 404, headers: shared },
      );
      return Response.json(snapshot, { headers: shared });
    } catch {
      return json({ error: "Win probability is temporarily unavailable." }, 503);
    }
  };
}
