import "server-only";
import { unstable_cache } from "next/cache";
import { gzipSync, gunzipSync } from "node:zlib";
import type {
  CollegePlayer,
  DraftWorkspace,
  HistoricalPlayer,
  RosterPlayer,
  PlayerPage,
} from "./draft";

// Cache the source once per edition window. Compression keeps the full catalog
// below the Data Cache item limit; only bounded results go to the browser.
const publication = unstable_cache(
  async (section: string, year?: number) => {
    const select =
      section === "workspace"
        ? "schema_version:payload->schema_version,board:payload->board,meta:payload->meta"
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
        cache: "no-store",
      },
    );
    if (!response.ok)
      throw new Error(`Draft publication unavailable (${response.status})`);
    return gzipSync(await response.text()).toString("base64");
  },
  ["draft-publication-compressed-v1"],
  { revalidate: 3600, tags: ["cfb"] },
);

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
  section: "roster",
  year: number,
): Promise<RosterPlayer[]>;
export async function fetchDraft(
  section: "workspace" | "players" | "history" | "roster",
  year?: number,
): Promise<
  DraftWorkspace | CollegePlayer[] | HistoricalPlayer[] | RosterPlayer[] | null
> {
  const rows: unknown = JSON.parse(
    gunzipSync(
      Buffer.from(await publication(section, year), "base64"),
    ).toString(),
  );
  if (!Array.isArray(rows))
    throw new Error("Invalid draft publication response");
  const row = rows[0];
  if (!row) return section === "workspace" ? null : [];
  if (section !== "workspace") {
    if (!Array.isArray(row.data)) throw new Error("Invalid draft section");
    return row.data;
  }
  if (row.schema_version !== 1 || row.board?.picks?.length !== 32 || !row.meta)
    throw new Error("Unsupported draft publication");
  return row as DraftWorkspace;
}

export async function fetchPlayerPage(
  year: number,
  position = "QB",
  query = "",
  offset = 0,
): Promise<PlayerPage> {
  const players = await fetchDraft("players", year);
  const group = (p: CollegePlayer) =>
    p.position_group ?? p.position ?? "Not listed";
  const peers = players.filter((p) => !position || group(p) === position);
  const values = peers
    .flatMap((p) =>
      p.value_above_replacement == null ? [] : [p.value_above_replacement],
    )
    .sort((a, b) => a - b);
  const low = Math.min(0, values[0] ?? 0),
    high = Math.max(1, values.at(-1) ?? 1);
  const bins = Array.from({ length: 20 }, () => 0);
  for (const value of values)
    bins[Math.min(19, Math.floor((20 * (value - low)) / (high - low)))]++;
  const mid = Math.floor(values.length / 2);
  const filtered = peers
    .filter((p) =>
      `${p.athlete_name} ${p.team}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        (b.value_above_replacement ?? -Infinity) -
          (a.value_above_replacement ?? -Infinity) ||
        a.athlete_name.localeCompare(b.athlete_name),
    );
  return {
    rows: filtered.slice(offset, offset + 50),
    total: filtered.length,
    positions: [...new Set(players.map(group))].sort(),
    comparison: {
      low,
      high,
      bins,
      count: values.length,
      median: values.length
        ? values.length % 2
          ? values[mid]
          : (values[mid - 1] + values[mid]) / 2
        : null,
    },
  };
}
