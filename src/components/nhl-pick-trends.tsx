import { CumulativeUnitsChart, type UnitsSeries } from "@/components/cumulative-units-chart";
import { HowGraded } from "@/components/how-graded";
import { PageSection } from "@/components/page-layout";
import { PagedTable } from "@/components/paged-table";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MARKET_LABELS,
  type NhlClosingRecord,
  type NhlPickDay,
  type PickMarket,
} from "@/lib/nhl-picks";
import { formatDate, formatPct, formatSigned } from "@/lib/utils";

const num = "text-right font-mono tabular-nums";
const THIN_SAMPLE = 30;

type Day = {
  date: string;
  picks: number;
  wins: number;
  losses: number;
  pushes: number;
  profit: number;
  // Running profit through this date: every market, then each one.
  all: number;
  h2h: number;
  totals: number;
};

function days(byDay: NhlPickDay[]): Day[] {
  const running = { all: 0, h2h: 0, totals: 0 };
  const byDate = new Map<string, Day>();
  for (const row of [...byDay].sort((a, b) => a.date.localeCompare(b.date))) {
    running.all += row.profit_units;
    running[row.market] += row.profit_units;
    const day = byDate.get(row.date) ?? {
      date: row.date,
      picks: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      profit: 0,
      ...running,
    };
    day.picks += row.picks;
    day.wins += row.wins;
    day.losses += row.losses;
    day.pushes += row.pushes;
    day.profit += row.profit_units;
    byDate.set(row.date, { ...day, ...running });
  }
  return [...byDate.values()];
}

function ClosingRecord({ closing }: { closing: NhlClosingRecord[] }) {
  const picks = closing.reduce((sum, row) => sum + row.picks, 0);
  return (
    <PageSection>
      <div className="space-y-2">
        <h2 className="type-section">Against the closing line</h2>
        <HowGraded
          label="How this is measured"
          lead={<>Whether the recorded price was better than the last price before puck drop, on settled predictions whose game has a recorded close.</>}
        >
          <p>
            A moneyline prediction beats the close when its recorded price
            pays more than the closing price on the same side. Its value is
            the return that recorded price would earn if the closing price
            with the vig removed were the true probability: zero is a fair
            bet, and a prediction with no edge sits below zero by the
            book&apos;s margin.
          </p>
          <p>
            A total beats the close when the line moved toward the
            prediction, or held while the price shortened. The line move is
            in goals, positive when the prediction got the better number.
          </p>
          <p>
            Prices that keep beating the close are an earlier sign of an edge
            than the win-loss record, which needs far more games to settle.
            The close grades nothing: results still use the recorded price.
          </p>
        </HowGraded>
      </div>
      <Table>
        <TableCaption className="sr-only">Recorded prices against the closing line by market</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Market</TableHead>
            <TableHead className="text-right">With a close</TableHead>
            <TableHead className="text-right">Beat the close</TableHead>
            <TableHead className="text-right">Share</TableHead>
            <TableHead className="text-right">Average value</TableHead>
            <TableHead className="text-right">Average line move</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {closing.map((row) => (
            <TableRow key={row.market}>
              <TableCell className="font-semibold">
                {MARKET_LABELS[row.market]}
                {row.picks < THIN_SAMPLE && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">Small sample</span>
                )}
              </TableCell>
              <TableCell className={num}>{row.picks}</TableCell>
              <TableCell className={num}>{row.beat}</TableCell>
              <TableCell className={num}>{formatPct(row.beat / row.picks, 0)}</TableCell>
              <TableCell className={num}>
                {row.average_value == null ? "–" : `${formatSigned(row.average_value * 100, 1)}%`}
              </TableCell>
              <TableCell className={num}>
                {row.average_line_move == null ? "–" : `${formatSigned(row.average_line_move, 2)} goals`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {picks < THIN_SAMPLE && (
        <p className="text-xs text-muted-foreground">
          Closing lines have been recorded for {picks} settled predictions so
          far, too few to read an edge from.
        </p>
      )}
    </PageSection>
  );
}

// The settled record over time: running units, the record by game date, and
// how the recorded prices compare with the close.
export function NhlPickTrends({
  byDay,
  closing,
  market,
}: {
  byDay: NhlPickDay[];
  closing: NhlClosingRecord[];
  market: PickMarket;
}) {
  const record = days(byDay);
  if (!record.length) return null;
  const series: UnitsSeries[] =
    market === "h2h" || market === "totals"
      ? [{ key: market, name: MARKET_LABELS[market], primary: true }]
      : [
          { key: "all", name: "All predictions", primary: true },
          { key: "h2h", name: MARKET_LABELS.h2h },
          { key: "totals", name: MARKET_LABELS.totals },
        ];
  return (
    <>
      <PageSection>
        <h2 className="type-section">Units over time</h2>
        <p className="text-sm text-muted-foreground">
          Running profit by game date at a flat 1 unit per settled
          prediction, against break-even at zero.
        </p>
        <CumulativeUnitsChart data={record} series={series} />
      </PageSection>
      <PageSection>
        <h2 className="type-section">By day</h2>
        <PagedTable
          caption="Settled prediction record by game date"
          columns={["Date", "Predictions", "W-L-P", "Units", "Running units"]}
          paged
          rows={[...record].reverse().map((day) => ({
            key: day.date,
            cells: [
              formatDate(day.date),
              String(day.picks),
              `${day.wins}-${day.losses}-${day.pushes}`,
              `${formatSigned(day.profit, 2)}u`,
              `${formatSigned(day.all, 2)}u`,
            ],
          }))}
        />
      </PageSection>
      {closing.length > 0 && <ClosingRecord closing={closing} />}
    </>
  );
}
