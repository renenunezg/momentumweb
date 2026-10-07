import { fetchDraft, fetchPlayerPage } from "@/lib/draft-server";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ section: string }> },
) {
  const { section } = await params;
  const search = new URL(request.url).searchParams;
  const year = Number(search.get("year")),
    offset = Number(search.get("offset") ?? 0);
  if (
    !["players", "history", "roster"].includes(section) ||
    !Number.isInteger(year) ||
    year < 2027 ||
    year > 2100 ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 20000
  )
    return Response.json({ error: "Invalid draft section" }, { status: 400 });
  const query = (search.get("query") ?? "").slice(0, 100);
  try {
    let data;
    if (section === "players")
      data =
        search.get("view") === "page"
          ? await fetchPlayerPage(
              year,
              search.get("position") ?? "QB",
              query,
              offset,
            )
          : await fetchDraft("players", year);
    else if (section === "roster") {
      const team = search.get("team");
      if (!team || !/^[A-Z]{2,3}$/.test(team))
        return Response.json({ error: "Invalid team" }, { status: 400 });
      data = (await fetchDraft("roster", year)).filter(
        (row) => row.team === team,
      );
    } else {
      const rows = await fetchDraft("history", year);
      const filtered = rows.filter((p) =>
        `${p.college_name} ${p.collegeTeam} ${p.draft_year} ${p.draft_position}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      );
      data =
        search.get("view") === "page"
          ? {
              rows: filtered.slice(offset, offset + 50),
              total: filtered.length,
            }
          : rows;
    }
    return Response.json(data, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
    });
  } catch {
    return Response.json(
      { error: "Draft data is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
