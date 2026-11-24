import { pointsTable, renderRatingsPoster, unitLeaders, unitTable } from "@/components/share-poster";
import { fetchLatestRatings, fetchPriorWeekRatings, fetchTeams, fetchUnitRatings } from "@/lib/cfb";
import { cfbStandings } from "@/lib/cfb-playoffs";
import { fetchCfbPlayoffForecast } from "@/lib/cfb-playoffs.server";
import { FOOTBALL_UNIT_COLUMNS } from "@/lib/football-units";
import { slug } from "@/lib/utils";

// One image per ratings view, drawn on its first request and rebuilt by the
// ratings publish webhook, like the ratings page. A view is the top 25, the
// unit leaders, one unit by its key with an optional class (pass_offense-fcs),
// or a conference by its slug.
export const dynamic = "force-static";
export const revalidate = 604800;
export const generateStaticParams = () => [];

const SHOWN = 25;
const CLASSES: Record<string, string> = { fbs: "FBS", fcs: "FCS", all: "All D1" };
const UNITS_NOTE = "Opponent-adjusted PPA per game above an average FBS team";

export async function GET(_request: Request, { params }: { params: Promise<{ view: string }> }) {
  const [{ view }, { ratings, season, week }, teams] = await Promise.all([params, fetchLatestRatings(), fetchTeams()]);
  if (season == null || week == null) return new Response("Not found", { status: 404 });
  const frame = { league: "CFB", context: `${season} · Week ${week}` };

  const [unitKey, unitClass = "fbs"] = view.split("-");
  const unit = FOOTBALL_UNIT_COLUMNS.find((column) => column.key === unitKey);
  if (view === "units" || (unit && unitClass in CLASSES)) {
    const units = await fetchUnitRatings(season, week);
    const identity = (row: (typeof units)[number]) => ({ key: String(row.team_id), team: row.team, logo: teams.get(row.team_id) });
    const shown = units.filter((row) => unitClass === "all" || row.classification === unitClass);
    if (!unit) {
      return renderRatingsPoster({ ...frame, title: "CFB Unit Ratings | FBS Top 5", note: UNITS_NOTE, ...unitLeaders(units, shown, FOOTBALL_UNIT_COLUMNS, identity) });
    }
    const table = unitTable(units, FOOTBALL_UNIT_COLUMNS, unit.key, identity);
    return renderRatingsPoster({
      league: "CFB",
      context: `${frame.context} · ${CLASSES[unitClass]} top ${SHOWN}`,
      title: `CFB Unit Ratings | ${unit.name}`,
      note: UNITS_NOTE,
      columns: table.columns,
      layout: [[{ rows: table.rows(shown, SHOWN) }]],
    });
  }

  // The top 25 ranks across all of Division I, and a conference lists every
  // member; both read on the scale of the whole table.
  const members = view === "top25" ? ratings.slice(0, SHOWN) : ratings.filter((r) => slug(r.conference ?? "Independent") === view);
  if (members.length === 0) return new Response("Not found", { status: 404 });
  const [prior, playoffs] = await Promise.all([fetchPriorWeekRatings(season, week), fetchCfbPlayoffForecast()]);
  const standings = playoffs?.season === season ? cfbStandings(playoffs) : null;
  const { columns, rows } = pointsTable(ratings, {
    identity: (r) => ({ key: String(r.team_id), team: r.team, logo: teams.get(r.team_id) }),
    notes: standings ? [{ label: "Record", text: (r) => standings[r.team_id] ?? "" }] : [],
    showMarket: true,
    before: prior.week == null ? null : (r) => prior.ratings[r.team_id],
    gap: (r) => (r.market_rating == null ? null : r.power_rating - r.market_rating),
  });
  return renderRatingsPoster({
    ...frame,
    title: view === "top25" ? "CFB Power Ratings | Top 25" : `${members[0].conference ?? "Independent"} Power Ratings`,
    note: [
      "Points above an average FBS team on a neutral field",
      prior.week != null && `Chg since week ${prior.week}`,
      "Gap is model minus market",
    ]
      .filter(Boolean)
      .join(" | "),
    columns,
    layout: [[{ rows: rows(members) }]],
  });
}
