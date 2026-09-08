"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Notice } from "@/components/notice";
import { Card, CardContent } from "@/components/ui/card";
import { chartAxisProps, chartTooltipStyle, useChartTheme } from "@/lib/chart-theme";
import { MARKET_LABELS } from "@/lib/football-picks";
import type { PickExample } from "@/lib/football-pick-example";
import {
  breakEvenProbability,
  integerBins,
  pickRegion,
  type PickRegion,
} from "@/lib/pick-pricing";
import { formatOdds, formatPct, formatSigned } from "@/lib/utils";

const EDGE_GATE = 0.045;

function lineLabel(example: PickExample): string {
  if (example.market === "h2h") return `${example.selection} ML`;
  const point = example.point ?? 0;
  if (example.market === "totals")
    return `${example.side === "over" ? "Over" : "Under"} ${point}`;
  return `${example.selection} ${point > 0 ? `+${point}` : point}`;
}

// The outcome value the pick needs, in the chart's own axis units.
function coverRule(example: PickExample): string {
  const margin = (v: number) =>
    v > 0 ? `${example.homeTeam} by ${v}+` : v < 0 ? `${example.awayTeam} by ${-v}+` : "";
  if (example.market === "totals") {
    const line = example.point ?? 0;
    const edge = Number.isInteger(line) ? 1 : 0.5;
    return example.side === "over"
      ? `${line + edge} or more total points`
      : `${line - edge} or fewer total points`;
  }
  const point = example.market === "h2h" ? 0 : (example.point ?? 0);
  const homeSpread = example.side === "home" ? point : -point;
  const need = -homeSpread;
  const step = Number.isInteger(need) ? 1 : 0.5;
  if (example.side === "home") return margin(need + step) || `${example.homeTeam} wins`;
  const awayNeed = -(need - step);
  return awayNeed > 0
    ? `${example.awayTeam} by ${awayNeed}+`
    : `${example.awayTeam} wins or loses by ${-awayNeed} or fewer`;
}

export function FootballPickExample({ example }: { example: PickExample }) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);
  const totals = example.market === "totals";
  const [floor, ceil] = totals ? [0, 200] : [-100, 100];
  const half = Math.min(2.5 * example.sd, 60);
  const lo = Math.max(floor, Math.floor(example.pricingMean - half));
  const hi = Math.min(ceil, Math.ceil(example.pricingMean + half));
  const bins = integerBins(
    example.pricingMean,
    example.sd,
    example.df,
    floor,
    ceil,
    example.weights,
  ).filter((bin) => bin.value >= lo && bin.value <= hi);
  const offer = { market: example.market, side: example.side, point: example.point };
  const data = bins.map((bin) => ({
    value: bin.value,
    pct: bin.probability * 100,
    region: pickRegion(offer, bin.value),
  }));
  const fill: Record<PickRegion, string> = {
    win: theme.positive,
    push: theme["muted-foreground"],
    loss: theme.grid,
  };
  const breakEven = breakEvenProbability(example.price);
  const conditionalWin = example.winProbability / (1 - example.pushProbability);
  const settled = example.outcome === "win" || example.outcome === "loss" || example.outcome === "push";
  const kickoff = example.startDate
    ? new Date(example.startDate).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }) + " PT"
    : null;
  const showShrink =
    example.pureMean != null &&
    example.marketMean != null &&
    Math.abs(example.pureMean - example.pricingMean) > 0.05;
  const axisLabel = totals ? "Total points" : `Home margin (${example.homeTeam} minus ${example.awayTeam})`;
  const modelTick = Math.round(example.pricingMean);
  const marketTick = example.marketMean == null ? null : Math.round(example.marketMean);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <p className="font-medium">
          {example.awayTeam} @ {example.homeTeam}
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            {MARKET_LABELS[example.market]}
          </span>
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          {kickoff ?? "Kickoff TBD"} · {example.policyVersion}
        </p>
      </div>

      <p className="text-sm">
        Pick: <span className="font-medium">{lineLabel(example)}</span> at{" "}
        <span className="font-mono">{formatOdds(example.price)}</span>
        {example.provider ? ` (${example.provider})` : ""}, one unit.
        {settled ? (
          <span className="text-muted-foreground">
            {" "}Settled {example.outcome}
            {example.homePoints != null && example.awayPoints != null
              ? `, final ${example.awayTeam} ${example.awayPoints} at ${example.homeTeam} ${example.homePoints}`
              : ""}
            {example.profitUnits != null ? ` (${formatSigned(example.profitUnits, 2)}u)` : ""}.
          </span>
        ) : (
          <span className="text-muted-foreground"> Pending.</span>
        )}
      </p>

      {showShrink && example.pureMean != null && example.marketMean != null && (
        <ShrinkLine
          pure={example.pureMean}
          market={example.marketMean}
          pricing={example.pricingMean}
          weight={example.marketWeight ?? 0.5}
          totals={totals}
          theme={theme}
        />
      )}

      <div
        role="img"
        aria-label={`Probability of each ${totals ? "total" : "home margin"} for ${example.awayTeam} at ${example.homeTeam}, shaded where ${lineLabel(example)} wins, pushes, or loses`}
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 20, right: 12, left: 0, bottom: 24 }} barCategoryGap={1}>
            <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
            <XAxis
              dataKey="value"
              interval={Math.max(0, Math.round(data.length / 12) - 1)}
              label={{
                value: axisLabel,
                position: "insideBottom",
                offset: -10,
                fill: theme["muted-foreground"],
                fontSize: 11,
                fontFamily: "var(--font-geist-mono)",
              }}
              {...axis}
            />
            <YAxis
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              width={44}
              {...axis}
            />
            <Tooltip
              formatter={(value, _name, item) => [
                `${Number(value ?? 0).toFixed(2)}% · ${String(item?.payload?.region ?? "")}`,
                "probability",
              ]}
              labelFormatter={(label) => (totals ? `${label} points` : `margin ${formatSigned(Number(label), 0)}`)}
              cursor={{ fill: theme.grid, fillOpacity: 0.4 }}
              contentStyle={chartTooltipStyle(theme)}
            />
            <Bar dataKey="pct" name="probability" isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.value} fill={fill[d.region]} fillOpacity={d.region === "loss" ? 0.9 : 0.8} />
              ))}
            </Bar>
            <ReferenceLine
              x={modelTick}
              stroke={theme["rule-strong"]}
              strokeDasharray="3 3"
              label={{
                value: `pricing ${totals ? "total" : "margin"} ${totals ? example.pricingMean.toFixed(1) : formatSigned(example.pricingMean, 1)}`,
                position: "top",
                fill: theme.foreground,
                fontSize: 11,
                fontFamily: "var(--font-geist-mono)",
              }}
            />
            {marketTick != null && marketTick !== modelTick && (
              <ReferenceLine
                x={marketTick}
                stroke={theme["muted-foreground"]}
                strokeDasharray="2 4"
                label={{
                  value: "market",
                  position: "insideBottom",
                  fill: theme["muted-foreground"],
                  fontSize: 11,
                  fontFamily: "var(--font-geist-mono)",
                }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="font-mono text-[11px] text-muted-foreground">
        <span style={{ color: theme.positive }}>■</span> wins: {coverRule(example)}
        {example.pushProbability > 1e-6 && (
          <>
            {" "}
            <span style={{ color: theme["muted-foreground"] }}>■</span> push
          </>
        )}{" "}
        <span style={{ color: theme.grid }}>■</span> loses
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Model cover" value={formatPct(example.winProbability)} sub={example.pushProbability > 1e-6 ? `push ${formatPct(example.pushProbability)}` : "no push possible"} />
        <Stat label={`Break-even at ${formatOdds(example.price)}`} value={formatPct(breakEven)} sub="implied by the price, vig included" />
        <Stat
          label="Edge"
          value={formatPct(example.probabilityEdge)}
          sub={`${formatPct(conditionalWin)} no-push cover minus break-even; gate ${formatPct(EDGE_GATE)}`}
        />
        <Stat label="EV per unit" value={formatSigned(example.expectedValuePerUnit, 3)} sub={`stake ${example.stakeUnits.toFixed(0)}u, flat`} />
      </div>

      <Notice className="text-xs leading-relaxed text-muted-foreground">
        <p>
          Every number above is read from the frozen recommendation row and the projection it was
          priced from; the bars are recomputed from the stored mean, standard deviation
          {example.weights ? ", degrees of freedom and key-number multipliers" : " and degrees of freedom"}{" "}
          with the same arithmetic the policy uses. The pick clears when the no-push cover
          probability beats the price&apos;s break-even by at least 4.5 points and EV is positive.
          {example.sport === "nfl"
            ? " In the NFL the pricing margin is also the published line."
            : " In CFB the published line stays pure; the shrink toward the market happens only inside the pick policy."}
        </p>
      </Notice>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-base font-medium">{value}</p>
        <p className="mt-0.5 font-mono text-[11px] leading-snug text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

// A number line showing the pure model number, the market, and the pricing
// number sitting between them at the policy's weight.
function ShrinkLine({
  pure,
  market,
  pricing,
  weight,
  totals,
  theme,
}: {
  pure: number;
  market: number;
  pricing: number;
  weight: number;
  totals: boolean;
  theme: ReturnType<typeof useChartTheme>;
}) {
  const lo = Math.min(pure, market, pricing);
  const hi = Math.max(pure, market, pricing);
  const pad = Math.max(1, (hi - lo) * 0.25);
  const x = (v: number) => 40 + ((v - (lo - pad)) / (hi - lo + 2 * pad)) * 520;
  const fmt = (v: number) => (totals ? v.toFixed(1) : formatSigned(v, 1));
  const mono = { fontFamily: "var(--font-geist-mono)", fontSize: 11 } as const;
  const marks = [
    { v: pure, label: "pure model", color: theme["chart-2"], y: 18 },
    { v: market, label: "market", color: theme["muted-foreground"], y: 18 },
    { v: pricing, label: `priced (${Math.round((1 - weight) * 100)}/${Math.round(weight * 100)})`, color: theme.positive, y: 58 },
  ];
  return (
    <svg
      viewBox="0 0 600 70"
      className="h-auto w-full"
      role="img"
      aria-label={`Pure model ${fmt(pure)}, market ${fmt(market)}, priced at ${fmt(pricing)}`}
    >
      <line x1={40} x2={560} y1={38} y2={38} stroke={theme.border} strokeWidth={1} />
      {marks.map((m) => (
        <g key={m.label}>
          <line x1={x(m.v)} x2={x(m.v)} y1={30} y2={46} stroke={m.color} strokeWidth={2} />
          <text
            x={x(m.v)}
            y={m.y}
            textAnchor="middle"
            fill={m.color}
            style={mono}
          >
            {m.label} {fmt(m.v)}
          </text>
        </g>
      ))}
    </svg>
  );
}
