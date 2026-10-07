import { fetchDraft } from "@/lib/draft-server";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ section: string }> },
) {
  const { section } = await params;
  const year = Number(new URL(request.url).searchParams.get("year"));
  if (
    !["players", "history"].includes(section) ||
    !Number.isInteger(year) ||
    year < 2027 ||
    year > 2100
  )
    return Response.json({ error: "Invalid draft section" }, { status: 400 });
  try {
    const data =
      section === "players"
        ? await fetchDraft("players", year)
        : await fetchDraft("history", year);
    return Response.json(data, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=300" },
    });
  } catch {
    return Response.json(
      { error: "Draft data is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
