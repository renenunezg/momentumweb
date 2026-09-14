import { TeamLogo } from "@/components/team-logo";
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

// Rows arrive sorted by rating, so the index is the league rank.
export function NhlRatingsTable({
  ratings,
  teams,
}: {
  ratings: NhlTeamRating[];
  teams: Map<string, NhlTeamIdentity>;
}) {
  return (
    <Table>
      <TableCaption className="sr-only">NHL model ratings</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10 text-right">Rk</TableHead>
          <TableHead>Team</TableHead>
          <TableHead className="text-right">Rating</TableHead>
          <TableHead className="text-right">Home xGF</TableHead>
          <TableHead className="text-right">Home xGA</TableHead>
          <TableHead className="text-right">Away xGF</TableHead>
          <TableHead className="text-right">Away xGA</TableHead>
          <TableHead className="text-right">Home Att</TableHead>
          <TableHead className="text-right">Home Def</TableHead>
          <TableHead className="text-right">Away Att</TableHead>
          <TableHead className="text-right">Away Def</TableHead>
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
            <TableCell className={`${num} font-semibold`}>{formatSigned(r.rating, 3)}</TableCell>
            <TableCell className={num}>{formatNumber(r.home_xgf, 2)}</TableCell>
            <TableCell className={num}>{formatNumber(r.home_xga, 2)}</TableCell>
            <TableCell className={num}>{formatNumber(r.away_xgf, 2)}</TableCell>
            <TableCell className={num}>{formatNumber(r.away_xga, 2)}</TableCell>
            <TableCell className={num}>{formatNumber(r.home_attack, 3)}</TableCell>
            <TableCell className={num}>{formatNumber(r.home_defense, 3)}</TableCell>
            <TableCell className={num}>{formatNumber(r.away_attack, 3)}</TableCell>
            <TableCell className={num}>{formatNumber(r.away_defense, 3)}</TableCell>
            <TableCell className={`${num} text-muted-foreground`}>
              {r.window_games_home}/{r.window_games_away}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
