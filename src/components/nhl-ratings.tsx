import { TeamLogo } from "@/components/team-logo";
import { RatingsHeatmapLegend } from "@/components/ratings-heatmap-legend";
import { ratingHeatmap } from "@/lib/rating-heatmap";
import { EVEN_COLUMN_HEAD, HeatValue, evenColumns } from "@/components/heat-value";
import { LimitedDataBadge } from "@/components/power-ratings-table";
import { HeaderTip } from "@/components/info-tip";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatNumber, formatSigned } from "@/lib/utils";
import type { NhlTeamIdentity, NhlTeamRating } from "@/lib/types";

const num = "text-right font-mono tabular-nums";
const WINDOW_NOTE =
  "Fewer than ten games in the window; this team's games are projected but not priced.";

const COLUMNS = [
  { key: "rating", label: "Rating", short: "Rtg", digits: 3, lowerIsBetter: false,
    tip: "Twice attack minus twice defense. Zero is league average; higher is better." },
  { key: "home_xgf", label: "Home xGF", short: null, digits: 2, lowerIsBetter: false,
    tip: "Expected goals for per game at home against an average opponent." },
  { key: "home_xga", label: "Home xGA", short: null, digits: 2, lowerIsBetter: true,
    tip: "Expected goals against per game at home against an average opponent; lower is better." },
  { key: "away_xgf", label: "Away xGF", short: null, digits: 2, lowerIsBetter: false,
    tip: "Expected goals for per game on the road against an average opponent." },
  { key: "away_xga", label: "Away xGA", short: null, digits: 2, lowerIsBetter: true,
    tip: "Expected goals against per game on the road against an average opponent; lower is better." },
  // Since nhl-poisson-v2.0 strengths pool both venues, so the away columns
  // repeat the home ones.
  { key: "home_attack", label: "Attack", short: "Att", digits: 3, lowerIsBetter: false,
    tip: "Scoring strength as a ratio to the league average: 1.000 is average, higher scores more." },
  { key: "home_defense", label: "Defense", short: "Def", digits: 3, lowerIsBetter: true,
    tip: "Goals allowed as a ratio to the league average: 1.000 is average, below 1.000 allows fewer." },
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
      {/* Phones drop the window counts and show abbreviations so the ratings fit. */}
      <Table
        density="compact"
        className="max-sm:[--table-cell-x:0.125rem] max-sm:[&_td]:text-xs"
        style={evenColumns(COLUMNS.length)}
      >
        <TableCaption className="sr-only">NHL model ratings</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 text-right max-sm:w-auto">Rk</TableHead>
            <TableHead>Team</TableHead>
            {columns.map((column) => (
              <TableHead key={column.key} className={cn("text-right max-sm:whitespace-normal max-sm:align-bottom", EVEN_COLUMN_HEAD)}>
                <HeaderTip full={column.label} short={column.short} tip={column.tip} />
              </TableHead>
            ))}
            <TableHead className="text-right max-sm:hidden">
              <HeaderTip full="Window" tip="Home and road games behind the numbers, from each team's last 50." />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ratings.map((r, index) => (
            <TableRow key={r.team_abbr}>
              <TableCell className={`${num} text-muted-foreground`}>{index + 1}</TableCell>
              <TableCell className="whitespace-nowrap">
                <span className="flex items-center gap-1.5 sm:gap-2">
                  <TeamLogo team={teams.get(r.team_abbr)} name={r.team} />
                  <span className="font-medium">
                    <span className="sm:hidden">{r.team_abbr}</span>
                    <span className="max-sm:hidden">{r.team}</span>
                    {r.insufficient_window && (
                      <LimitedDataBadge
                        note={WINDOW_NOTE}
                        className="max-sm:ml-0 max-sm:block max-sm:text-[0.625rem] max-sm:tracking-normal max-sm:normal-case"
                      />
                    )}
                  </span>
                </span>
              </TableCell>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={column.key === "rating" ? `${num} font-semibold` : num}
                >
                  <HeatValue compact style={column.heatmap(r[column.key])}>
                    {column.key === "rating"
                      ? formatSigned(r[column.key], column.digits)
                      : formatNumber(r[column.key], column.digits)}
                  </HeatValue>
                </TableCell>
              ))}
              <TableCell className={`${num} text-muted-foreground max-sm:hidden`}>
                {r.window_games_home}/{r.window_games_away}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
