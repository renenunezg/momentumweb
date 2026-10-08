import { TeamLogo } from "@/components/team-logo";
import { RatingsHeatmapLegend } from "@/components/ratings-heatmap-legend";
import { ratingHeatmap } from "@/lib/rating-heatmap";
import { LimitedDataBadge } from "@/components/power-ratings-table";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber, formatSigned } from "@/lib/utils";
import type { NhlTeamIdentity, NhlTeamRating } from "@/lib/types";

const num = "text-right font-mono tabular-nums";
const WINDOW_NOTE =
  "Fewer than ten games in a venue window; this team's games are projected but not priced.";

const COLUMNS = [
  { key: "rating", label: "Rating", digits: 3, lowerIsBetter: false },
  { key: "home_xgf", label: "Home xGF", digits: 2, lowerIsBetter: false },
  { key: "home_xga", label: "Home xGA", digits: 2, lowerIsBetter: true },
  { key: "away_xgf", label: "Away xGF", digits: 2, lowerIsBetter: false },
  { key: "away_xga", label: "Away xGA", digits: 2, lowerIsBetter: true },
  { key: "home_attack", label: "Home Att", digits: 3, lowerIsBetter: false },
  { key: "home_defense", label: "Home Def", digits: 3, lowerIsBetter: true },
  { key: "away_attack", label: "Away Att", digits: 3, lowerIsBetter: false },
  { key: "away_defense", label: "Away Def", digits: 3, lowerIsBetter: true },
] as const;

// Rows arrive sorted by rating, so the index is the league rank.
export function NhlRatingsTable({
  ratings,
  teams,
}: {
  ratings: NhlTeamRating[];
  teams: Map<string, NhlTeamIdentity>;
}) {
  const columns = COLUMNS.map((column) => ({
    ...column,
    heatmap: ratingHeatmap(ratings.map((row) => row[column.key]), { lowerIsBetter: column.lowerIsBetter }),
  }));
  return (
    <div className="space-y-2">
      <RatingsHeatmapLegend />
      <Table>
        <TableCaption className="sr-only">NHL model ratings</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 text-right">Rk</TableHead>
            <TableHead>Team</TableHead>
            {columns.map((column) => (
              <TableHead key={column.key} className="text-right">{column.label}</TableHead>
            ))}
            <TableHead className="text-right">Window</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ratings.map((r, index) => (
            <TableRow key={r.team_abbr}>
              <TableCell className={`${num} text-muted-foreground`}>{index + 1}</TableCell>
              <TableCell className="whitespace-nowrap">
                <span className="flex items-center gap-2">
                  <TeamLogo team={teams.get(r.team_abbr)} name={r.team} />
                  <span className="font-medium">{r.team}</span>
                  {r.insufficient_window && <LimitedDataBadge note={WINDOW_NOTE} />}
                </span>
              </TableCell>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={column.key === "rating" ? `${num} font-semibold` : num}
                  style={column.heatmap(r[column.key])}
                >
                  {column.key === "rating"
                    ? formatSigned(r[column.key], column.digits)
                    : formatNumber(r[column.key], column.digits)}
                </TableCell>
              ))}
              <TableCell className={`${num} text-muted-foreground`}>
                {r.window_games_home}/{r.window_games_away}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
