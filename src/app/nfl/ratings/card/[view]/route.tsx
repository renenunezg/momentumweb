import { pointsTable, renderRatingsPoster, unitLeaders, unitTable } from "@/components/share-poster";
import { NFL_UNIT_COLUMNS } from "@/lib/football-units";
import { fetchLatestRatings, fetchPriorWeekRatings, fetchTeams, fetchUnitRatings } from "@/lib/nfl";
import { nflPureMinusMarket } from "@/lib/rating-gap";

// One image per ratings view, drawn on its first request and rebuilt by the
// ratings publish webhook, like the ratings page. A view is a tab of the page
// (all, afc, nfc, division, units) or one unit by its key.
export const dynamic = "force-static";
export const revalidate = 604800;
export const generateStaticParams = () => [];

const CONFERENCES = ["AFC", "NFC"];
const UNITS_NOTE = "Points per game above league average, opponent adjusted";

export async function GET(_request: Request, { params }: { params: Promise<{ view: string }> }) {
  const [{ view }, { ratings, season, week }, teams] = await Promise.all([params, fetchLatestRatings(), fetchTeams()]);
  if (season == null || week == null) return new Response("Not found", { status: 404 });
  const frame = { league: "NFL", context: `${season} · Week ${week}` };

  const unit = NFL_UNIT_COLUMNS.find((column) => column.key === view);
  if (view === "units" || unit) {
    const units = await fetchUnitRatings(season, week);
    const identity = (row: (typeof units)[number]) => ({ key: row.team_abbr, team: row.team, logo: teams.get(row.team_abbr) });
    if (!unit) {
      return renderRatingsPoster({ ...frame, title: "NFL Unit Ratings | Top 5", note: UNITS_NOTE, ...unitLeaders(units, units, NFL_UNIT_COLUMNS, identity) });
    }
    const table = unitTable(units, NFL_UNIT_COLUMNS, unit.key, identity);
    return renderRatingsPoster({
      ...frame,
      title: `NFL Unit Ratings | ${unit.name}`,
      note: UNITS_NOTE,
      columns: table.columns,
      layout: [[{ rows: table.rows(units) }]],
    });
  }

  const prior = await fetchPriorWeekRatings(season, week);
  // Two tables side by side leave room for the abbreviation only.
  const table = (short: boolean) =>
    pointsTable(ratings, {
      identity: (r) => ({ key: r.team_abbr, team: short ? r.team_abbr : r.team, logo: teams.get(r.team_abbr) }),
      showMarket: false,
      before: prior.week == null ? null : (r) => prior.ratings[r.team_abbr],
      gap: nflPureMinusMarket,
    });
  const note = [
    "Points better than average on a neutral field",
    prior.week != null && `Chg since week ${prior.week}`,
    ratings.some((r) => r.market_rating != null) && "Gap is the pure model minus the market rating",
  ]
    .filter(Boolean)
    .join(" | ");
  const conference = CONFERENCES.find((name) => name.toLowerCase() === view);

  if (view === "all" || conference) {
    const { columns, rows } = table(false);
    return renderRatingsPoster({
      ...frame,
      title: conference ? `NFL Power Ratings | ${conference}` : "NFL Power Ratings",
      note,
      columns,
      layout: [[{ rows: rows(conference ? ratings.filter((r) => r.conference === conference) : ratings) }]],
    });
  }
  if (view === "division") {
    const { columns, rows } = table(true);
    return renderRatingsPoster({
      ...frame,
      title: "NFL Power Ratings | Divisions",
      note,
      columns,
      // Each conference down its own column, a division to a block.
      layout: CONFERENCES.map((name) =>
        [...new Set(ratings.filter((r) => r.conference === name).map((r) => r.division ?? "Unknown"))]
          .sort()
          .map((division) => ({ title: division, rows: rows(ratings.filter((r) => (r.division ?? "Unknown") === division)) })),
      ),
    });
  }
  return new Response("Not found", { status: 404 });
}
