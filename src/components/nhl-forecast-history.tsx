import { Kickoff } from "@/components/kickoff-cells";
import { LocalKickoffs } from "@/components/local-kickoffs";
import { Notice } from "@/components/notice";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { closingHomeProb } from "@/lib/nhl-format";
import { supabaseNhl } from "@/lib/supabase";
import { cn, formatNumber, formatPct } from "@/lib/utils";

const num = "text-right font-mono tabular-nums";
const LIMIT = 100;

// The most recent graded games with the frozen pregame forecast each was
// judged by. Games with no pregame forecast stay visible so coverage is
// honest.
export async function NhlForecastHistory() {
  const { data, error } = await supabaseNhl
    .from("live_predictions")
    .select("*")
    .order("start_date", { ascending: false })
    .limit(LIMIT);
  if (error)
    return <Notice role="status">Forecast history is temporarily unavailable.</Notice>;
  const rows = data ?? [];
  if (rows.length === 0)
    return (
      <Notice>
        No graded games yet. The live record starts with the first
        regular-season slate.
      </Notice>
    );
  // A close exists only when a partner quote landed just before puck drop, so
  // the columns stay out until at least one listed game has one.
  const hasClose = rows.some(
    (r) => r.closing_home_price != null || r.closing_total != null,
  );
  return (
    <LocalKickoffs>
      <Table>
        <TableCaption className="sr-only">Graded NHL forecasts</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Matchup</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead className="text-right">Away xG</TableHead>
            <TableHead className="text-right">Home xG</TableHead>
            <TableHead className="text-right">Home win</TableHead>
            {hasClose && <TableHead className="text-right">Close home win</TableHead>}
            <TableHead className="text-right">Total</TableHead>
            {hasClose && <TableHead className="text-right">Close total</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            // A row missing a score or a forecast is shown but not judged.
            const hit =
              r.home_goals != null && r.away_goals != null && r.home_win_prob != null
                ? r.home_goals > r.away_goals === r.home_win_prob > 0.5
                : null;
            return (
              <TableRow key={r.game_id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  <Kickoff start={r.start_date} part="day" />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {r.away_team} <span className="text-muted-foreground">at</span> {r.home_team}
                </TableCell>
                <TableCell className={num}>
                  {r.away_goals}-{r.home_goals}
                  {r.last_period_type && r.last_period_type !== "REG" && (
                    <span className="ml-1 text-[10px] text-muted-foreground">{r.last_period_type}</span>
                  )}
                </TableCell>
                <TableCell className={num}>{formatNumber(r.away_lambda, 2)}</TableCell>
                <TableCell className={num}>{formatNumber(r.home_lambda, 2)}</TableCell>
                <TableCell className={cn(num, hit != null && (hit ? "text-positive" : "text-negative"))}>
                  {formatPct(r.home_win_prob)}
                </TableCell>
                {hasClose && (
                  <TableCell className={num}>
                    {formatPct(closingHomeProb(r.closing_home_price, r.closing_away_price))}
                  </TableCell>
                )}
                <TableCell className={num}>{formatNumber(r.model_total, 2)}</TableCell>
                {hasClose && (
                  <TableCell className={num}>{formatNumber(r.closing_total, 1)}</TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </LocalKickoffs>
  );
}
