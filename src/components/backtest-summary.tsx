import type { SliceMetrics } from "@/lib/backtest-metrics";
import { formatNumber, formatPct, formatSigned } from "@/lib/utils";
import { KpiCard } from "@/components/kpi-card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function BacktestKpis({
  overall,
  gamesTooltip,
}: {
  overall: SliceMetrics;
  gamesTooltip: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 border-y border-rule-strong py-4 sm:grid-cols-3 lg:grid-cols-5">
      <KpiCard label="Games graded" value={String(overall.games)} tooltip={gamesTooltip} />
      <KpiCard
        label="Model MAE"
        value={formatNumber(overall.modelMae, 2)}
        sub="points"
        tooltip="Average distance between predicted and actual home margin, in points. Lower is better."
      />
      <KpiCard
        label="Market MAE"
        value={formatNumber(overall.marketMae, 2)}
        sub="points"
        tooltip="Average distance between the closing spread and actual margin, in points. Lower is better."
      />
      <KpiCard
        label="Gap to market"
        value={formatSigned(overall.modelMae - overall.marketMae, 2)}
        sub="points (lower is better)"
        tooltip="Model error minus market error. Positive means the closing line was more accurate."
      />
      <KpiCard
        label="Model closer"
        value={formatPct(overall.modelBeatsMarket)}
        tooltip="Share of games where the model’s margin was closer to the actual margin than the closing spread. A tie counts as not closer."
      />
    </div>
  );
}

const numCell = "text-right font-mono tabular-nums";

function MetricsCells({ m, strong }: { m: SliceMetrics; strong?: boolean }) {
  const weight = strong ? " font-semibold" : "";
  return (
    <>
      <TableCell className={`${numCell}${weight}`}>{m.games}</TableCell>
      <TableCell className={`${numCell}${weight}`}>{formatNumber(m.modelMae, 2)}</TableCell>
      <TableCell className={`${numCell}${weight}`}>{formatNumber(m.marketMae, 2)}</TableCell>
      <TableCell className={`${numCell}${weight}`}>
        {formatSigned(m.modelMae - m.marketMae, 2)}
      </TableCell>
      <TableCell className={`${numCell}${weight}`}>{formatPct(m.modelBeatsMarket)}</TableCell>
      <TableCell className={`${numCell} text-muted-foreground${weight}`}>
        {formatSigned(m.bias, 2)}
      </TableCell>
    </>
  );
}

export function BacktestSeasonTable({
  bySeason,
  overall,
  caption = "Backtest accuracy by season",
}: {
  bySeason: SliceMetrics[];
  overall: SliceMetrics;
  caption?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Season</TableHead>
            <TableHead className="text-right">Games</TableHead>
            <TableHead className="text-right">Model MAE</TableHead>
            <TableHead className="text-right">Market MAE</TableHead>
            <TableHead className="text-right">Gap</TableHead>
            <TableHead className="text-right">Model closer</TableHead>
            <TableHead className="text-right">Bias</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bySeason.map((m) => (
            <TableRow key={m.label}>
              <TableCell className="font-medium">{m.label}</TableCell>
              <MetricsCells m={m} />
            </TableRow>
          ))}
          <TableRow className="border-t-2">
            <TableCell className="font-semibold">{overall.label}</TableCell>
            <MetricsCells m={overall} strong />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
