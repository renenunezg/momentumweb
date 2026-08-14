import { fetchFullBacktest } from "@/lib/cfb";
import type { CfbBacktestPrediction } from "@/lib/types";
import { KpiCard } from "@/components/kpi-card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export const revalidate = 300;

interface SliceMetrics {
  label: string;
  games: number;
  modelMae: number;
  marketMae: number;
  modelBeatsMarket: number;
  bias: number;
}

// The market's implied home margin is the negated closing spread; both model
// and market are scored against the same actual margin.
function computeMetrics(
  label: string,
  rows: CfbBacktestPrediction[]
): SliceMetrics | null {
  const graded = rows.filter(
    (r) =>
      r.model_margin != null &&
      r.closing_spread != null &&
      r.actual_margin != null
  );
  if (graded.length === 0) return null;
  let modelAbs = 0;
  let marketAbs = 0;
  let modelWins = 0;
  let biasSum = 0;
  for (const r of graded) {
    const modelErr = r.model_margin! - r.actual_margin!;
    const marketErr = -r.closing_spread! - r.actual_margin!;
    modelAbs += Math.abs(modelErr);
    marketAbs += Math.abs(marketErr);
    if (Math.abs(modelErr) < Math.abs(marketErr)) modelWins += 1;
    biasSum += modelErr;
  }
  return {
    label,
    games: graded.length,
    modelMae: modelAbs / graded.length,
    marketMae: marketAbs / graded.length,
    modelBeatsMarket: modelWins / graded.length,
    bias: biasSum / graded.length,
  };
}

function fmt(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

function fmtSigned(value: number, decimals = 2): string {
  const s = value.toFixed(decimals);
  return value >= 0 ? `+${s}` : s;
}

function fmtPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default async function PerformancePage() {
  let backtest: CfbBacktestPrediction[] = [];
  try {
    backtest = await fetchFullBacktest();
  } catch {
    // The page degrades to its empty state when the cfb schema is
    // unreachable; it must never fail the build.
  }

  const overall = computeMetrics("All seasons", backtest);

  if (!overall) {
    return (
      <main className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8">
        <h1 className="font-heading text-2xl tracking-tight">
          Model Performance
        </h1>
        <p className="mt-4 text-muted-foreground">
          No backtest data published yet. Run the publish pipeline to load it.
        </p>
      </main>
    );
  }

  const seasons = [...new Set(backtest.map((r) => r.season))].sort();
  const bySeason = seasons
    .map((season) =>
      computeMetrics(
        String(season),
        backtest.filter((r) => r.season === season)
      )
    )
    .filter((m): m is SliceMetrics => m != null);

  return (
    <main className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-heading text-2xl tracking-tight">
          Model Performance
        </h1>
        <div className="text-xs text-muted-foreground">
          Frozen walk-forward backtest, {seasons[0]}&ndash;
          {seasons[seasons.length - 1]}
        </div>
      </div>

      <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
        Every prediction below was made walking forward through each season
        with only the data available at the time, then frozen. The market
        benchmark is the closing spread: the strongest public forecast of a
        game&apos;s margin. Beating it consistently is rare, and the model is
        measured against it, not against a naive baseline.
      </p>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Games graded"
          value={String(overall.games)}
          tooltip="FBS-vs-FBS games with a model prediction, a closing spread, and a final score."
        />
        <KpiCard
          label="Model MAE"
          value={fmt(overall.modelMae)}
          sub="points"
          tooltip="Mean absolute error of the model's projected home margin against the actual margin."
        />
        <KpiCard
          label="Market MAE"
          value={fmt(overall.marketMae)}
          sub="points"
          tooltip="Mean absolute error of the closing spread against the actual margin."
        />
        <KpiCard
          label="Gap to market"
          value={fmtSigned(overall.modelMae - overall.marketMae)}
          sub="points (lower is better)"
          tooltip="Model MAE minus market MAE. Positive means the closing line is still more accurate than the model."
        />
        <KpiCard
          label="Model closer"
          value={fmtPct(overall.modelBeatsMarket)}
          tooltip="Share of games where the model's margin was strictly closer to the result than the closing spread."
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
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
                <TableCell className="text-right font-mono tabular-nums">
                  {m.games}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {fmt(m.modelMae)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {fmt(m.marketMae)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {fmtSigned(m.modelMae - m.marketMae)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {fmtPct(m.modelBeatsMarket)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {fmtSigned(m.bias)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2">
              <TableCell className="font-semibold">{overall.label}</TableCell>
              <TableCell className="text-right font-mono font-semibold tabular-nums">
                {overall.games}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold tabular-nums">
                {fmt(overall.modelMae)}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold tabular-nums">
                {fmt(overall.marketMae)}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold tabular-nums">
                {fmtSigned(overall.modelMae - overall.marketMae)}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold tabular-nums">
                {fmtPct(overall.modelBeatsMarket)}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold tabular-nums text-muted-foreground">
                {fmtSigned(overall.bias)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Bias is the mean signed error of the model&apos;s home margin: positive
        means the model leans toward home teams. In-game projections anchor on
        the market closing line precisely because the closing line remains the
        better pregame forecast.
      </p>
    </main>
  );
}
