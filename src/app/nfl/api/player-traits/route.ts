import { fetchNflPlayerTraitRows } from "@/lib/nfl";
import { MAX_TRAIT_IDS, buildGradedPlayers } from "@/lib/position-grades";

// Rows for one listed page plus the compared players of one season, for
// players the grades page did not render on the server (search hits and
// filtered lists). Each distinct id set is one Supabase read per CDN hour,
// which keeps the page's egress bounded by what people actually look at. Ids
// are gsis ids or offensive line units.
const SEASON = /^20\d{2}$/;
const ID = /^(?:\d{2}-\d{7}|unit:[A-Z]{2,3})$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const season = url.searchParams.get("season") ?? "";
  const ids = (url.searchParams.get("ids") ?? "").split(",").filter(Boolean);
  const bad = (error: string) =>
    Response.json({ error }, { status: 400, headers: { "Cache-Control": "no-store" } });
  if (!SEASON.test(season)) return bad("Invalid season");
  if (ids.length === 0 || ids.length > MAX_TRAIT_IDS || ids.some((id) => !ID.test(id))) {
    return bad("Invalid player list");
  }
  try {
    const { traits, stats } = await fetchNflPlayerTraitRows(Number(season), [...new Set(ids)].sort());
    return Response.json(
      { season: Number(season), players: buildGradedPlayers(traits, stats) },
      {
        headers: {
          "Cache-Control": "public, max-age=0, must-revalidate",
          "Vercel-CDN-Cache-Control": "public, s-maxage=3600",
        },
      }
    );
  } catch {
    return Response.json(
      { error: "Player traits are temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
