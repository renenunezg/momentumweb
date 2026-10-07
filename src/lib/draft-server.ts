import "server-only";
import type { CollegePlayer, DraftWorkspace, HistoricalPlayer } from "./draft";

export async function fetchDraft(
  section: "workspace",
  year?: number,
): Promise<DraftWorkspace | null>;
export async function fetchDraft(
  section: "players",
  year: number,
): Promise<CollegePlayer[]>;
export async function fetchDraft(
  section: "history",
  year: number,
): Promise<HistoricalPlayer[]>;
export async function fetchDraft(
  section: "workspace" | "players" | "history",
  year?: number,
): Promise<DraftWorkspace | CollegePlayer[] | HistoricalPlayer[] | null> {
  const select =
    section === "workspace"
      ? "schema_version:payload->schema_version,board:payload->board,roster:payload->roster,meta:payload->meta"
      : `data:payload->${section}`;
  const params = new URLSearchParams({
    select,
    order: "draft_year.desc",
    limit: "1",
    ...(year ? { draft_year: `eq.${year}` } : {}),
  });
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/draft_publications?${params}`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        "Accept-Profile": "cfb",
      },
      next: { revalidate: 3600, tags: ["cfb"] },
    },
  );
  if (!response.ok)
    throw new Error(`Draft publication unavailable (${response.status})`);
  const rows: unknown = await response.json();
  if (!Array.isArray(rows))
    throw new Error("Invalid draft publication response");
  const row = rows[0];
  if (!row) return section === "workspace" ? null : [];
  if (section !== "workspace") {
    if (!Array.isArray(row.data)) throw new Error("Invalid draft section");
    return row.data;
  }
  if (
    row.schema_version !== 1 ||
    !row.board ||
    row.board.picks?.length !== 32 ||
    !Array.isArray(row.roster) ||
    !row.meta
  )
    throw new Error("Unsupported draft publication");
  return row as DraftWorkspace;
}
