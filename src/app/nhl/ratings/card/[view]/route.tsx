import { NHL_RATING_COLUMNS } from "@/components/nhl-ratings";
import { renderRatingsPoster, type PosterColumn } from "@/components/share-poster";
import { fetchLatestRatings, fetchRatingsWeekBefore, fetchTeams } from "@/lib/nhl";
import { ratingScale } from "@/lib/rating-heatmap";
import { formatDate, formatNumber, formatSigned } from "@/lib/utils";

// Drawn on its first request and rebuilt by the ratings publish webhook, like
// the ratings page. The league table is the one view; the segment keeps the
// image out of the build.
export const dynamic = "force-static";
export const revalidate = 604800;
export const generateStaticParams = () => [];

export async function GET(_request: Request, { params }: { params: Promise<{ view: string }> }) {
  const [{ view }, { ratings, asOf }, teams] = await Promise.all([params, fetchLatestRatings(), fetchTeams()]);
  if (view !== "all" || !asOf) return new Response("Not found", { status: 404 });
  const previous = await fetchRatingsWeekBefore(asOf);
  const scales = NHL_RATING_COLUMNS.map((column) =>
    ratingScale(ratings.map((r) => r[column.key]), { lowerIsBetter: column.lowerIsBetter }),
  );
  const columns: PosterColumn[] = [
    ...NHL_RATING_COLUMNS.map((column) => ({
      // The image has no room for the venue spelled out.
      label: column.short ?? column.label.replace("Home ", "H ").replace("Away ", "A "),
      kind: "heat" as const,
      primary: column.key === "rating",
    })),
    ...(previous.asOf ? [{ label: "Chg", kind: "change" as const }] : []),
    { label: "Window", kind: "plain" },
  ];
  return renderRatingsPoster({
    league: "NHL",
    title: "NHL Model Ratings",
    context: `As of ${formatDate(asOf)}`,
    note: [
      "Rating is twice attack minus twice defense; 0 is average",
      previous.asOf && `Chg since ${formatDate(previous.asOf)}`,
      "Window is home and road games counted",
    ]
      .filter(Boolean)
      .join(" | "),
    columns,
    layout: [
      [
        {
          rows: ratings.map((r, i) => {
            const before = previous.ratings.get(r.team_abbr);
            return {
              key: r.team_abbr,
              rank: i + 1,
              team: r.team,
              logo: teams.get(r.team_abbr),
              cells: [
                ...NHL_RATING_COLUMNS.map((column, at) => ({
                  text: column.key === "rating" ? formatSigned(r[column.key], column.digits) : formatNumber(r[column.key], column.digits),
                  strength: scales[at](r[column.key]),
                })),
                ...(previous.asOf ? [{ text: formatSigned(before == null ? null : r.rating - before, 2) }] : []),
                { text: `${r.window_games_home}/${r.window_games_away}` },
              ],
            };
          }),
        },
      ],
    ],
  });
}
