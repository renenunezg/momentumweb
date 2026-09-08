import Link from "next/link";
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
import {
  cn,
  formatNumber,
  formatOdds,
  formatPct,
  formatSigned,
} from "@/lib/utils";
import { formatKickoffDay, formatKickoffTime } from "@/lib/football";
import {
  MARKET_LABELS,
  SIDE_LABELS,
  pickLabel,
  pickReason,
  type CfbPick,
  type CfbPickMetric,
} from "@/lib/cfb-picks";

export function PickKpis({
  metric,
  unavailable = false,
}: {
  metric?: CfbPickMetric;
  unavailable?: boolean;
}) {
  const settled =
    (metric?.wins ?? 0) + (metric?.losses ?? 0) + (metric?.pushes ?? 0);
  const missing = unavailable ? "Unavailable" : "–";
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-y border-rule-strong py-5 sm:grid-cols-3 lg:grid-cols-6">
      <KpiCard
        label="Record"
        value={
          unavailable
            ? missing
            : `${metric?.wins ?? 0}-${metric?.losses ?? 0}-${metric?.pushes ?? 0}`
        }
        sub="wins / losses / pushes"
      />
      <KpiCard
        label="Win rate"
        value={unavailable ? missing : formatPct(metric?.win_rate)}
        tooltip="Wins divided by wins plus losses. Pushes and voids are excluded."
      />
      <KpiCard
        label="Net profit"
        value={settled ? `${formatSigned(metric?.profit_units, 2)}u` : missing}
        sub="Flat 1u per recommended pick"
      />
      <KpiCard
        label="ROI"
        value={unavailable ? missing : formatPct(metric?.roi)}
        tooltip="Net profit divided by stakes on settled picks, including returned pushes. Pending and void picks are excluded. Uses the recorded odds."
      />
      <KpiCard
        label="Picks settled"
        value={unavailable ? missing : String(settled)}
        sub={
          unavailable
            ? undefined
            : `${metric?.pending ?? 0} pending · ${metric?.voids ?? 0} void`
        }
      />
      <KpiCard
        label="Average EV"
        value={unavailable ? missing : formatPct(metric?.average_ev)}
        tooltip="Average expected profit per unit at recommendation time across all recommended picks, including pending picks. This is a forecast, not realized profit."
      />
    </div>
  );
}

export function PickTable({
  rows,
  caption = "Recorded CFB decisions",
}: {
  rows: CfbPick[];
  caption?: string;
}) {
  return (
    <Table>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="hidden md:table-cell">Kickoff ET</TableHead>
          <TableHead className="hidden md:table-cell">Matchup</TableHead>
          <TableHead>Market / pick</TableHead>
          <TableHead className="text-right">Odds</TableHead>
          <TableHead className="hidden text-right sm:table-cell">EV</TableHead>
          <TableHead>Result</TableHead>
          <TableHead className="text-right">Profit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((pick) => (
          <TableRow key={`${pick.game_id}-${pick.market}`}>
            <TableCell className="hidden whitespace-nowrap text-xs md:table-cell">
              {formatKickoffDay(pick.start_date)}
              <div className="text-muted-foreground">
                {formatKickoffTime(pick.start_date)}
              </div>
            </TableCell>
            <TableCell className="hidden font-medium md:table-cell">
              <span className="whitespace-nowrap">{pick.away_team}</span>
              <div className="whitespace-nowrap text-muted-foreground">
                at {pick.home_team}
              </div>
            </TableCell>
            <TableCell className="whitespace-normal">
              <div className="mb-2 text-[10px] leading-relaxed text-muted-foreground md:hidden">
                {pick.away_team} at {pick.home_team}
                <div>
                  {formatKickoffDay(pick.start_date)} ·{" "}
                  {formatKickoffTime(pick.start_date)} ET
                </div>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {MARKET_LABELS[pick.market as keyof typeof MARKET_LABELS] ??
                  pick.market}
              </div>
              <div
                className={cn(
                  "min-w-24 max-w-56",
                  pick.status === "recommended" && "font-semibold",
                )}
              >
                {pickLabel(pick)}
              </div>
              <div className="max-w-64 text-xs text-muted-foreground">
                {pick.status === "recommended"
                  ? pick.provider
                  : pickReason(pick.reason)}
              </div>
              <details className="mt-1 text-xs text-muted-foreground">
                <summary className="cursor-pointer">Recorded details</summary>
                <div className="mt-1 max-w-64 space-y-1 break-all">
                  <p>Decision: {new Date(pick.decision_at).toISOString()}</p>
                  <p>Rule: {pick.policy_version}</p>
                  <p>
                    Missing inputs: home{" "}
                    {pick.home_missing_input_count ?? "unknown"}, away{" "}
                    {pick.away_missing_input_count ?? "unknown"}. Counts include
                    unavailable injury data.
                  </p>
                  <p>Model: {pick.model_version}</p>
                  <p>EV {formatPct(pick.expected_value_per_unit)}</p>
                  <p>
                    Win {formatPct(pick.win_probability)} · Push{" "}
                    {formatPct(pick.push_probability)}
                  </p>
                  <p>
                    Edge:{" "}
                    {pick.probability_edge == null
                      ? "–"
                      : formatNumber(pick.probability_edge * 100, 1)}{" "}
                    pp
                  </p>
                  <p>Forecast: {new Date(pick.forecast_as_of).toISOString()}</p>
                  <p>
                    Price captured:{" "}
                    {pick.market_fetched_at
                      ? new Date(pick.market_fetched_at).toISOString()
                      : "unavailable"}
                  </p>
                </div>
              </details>
            </TableCell>
            <TableCell className="text-right font-mono">
              {pick.status === "recommended" ? formatOdds(pick.price) : "–"}
            </TableCell>
            <TableCell className="hidden text-right font-mono sm:table-cell">
              {pick.status === "recommended"
                ? formatPct(pick.expected_value_per_unit)
                : "–"}
            </TableCell>
            <TableCell>
              <span
                className={cn(
                  "font-mono text-xs uppercase",
                  pick.outcome === "win" && "text-positive",
                  pick.outcome === "loss" && "text-negative",
                )}
              >
                {pick.status === "no_play" ? "No Play" : pick.outcome}
              </span>
              {pick.home_points != null && pick.away_points != null && (
                <div className="text-xs text-muted-foreground">
                  {pick.away_points}-{pick.home_points}
                </div>
              )}
            </TableCell>
            <TableCell
              className={cn(
                "text-right font-mono",
                (pick.profit_units ?? 0) > 0 && "text-positive",
                (pick.profit_units ?? 0) < 0 && "text-negative",
              )}
            >
              {pick.status === "recommended" && pick.profit_units != null
                ? `${formatSigned(pick.profit_units, 2)}u`
                : "–"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function PickBreakdown({
  title,
  rows,
}: {
  title: string;
  rows: CfbPickMetric[];
}) {
  if (!rows.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg">{title}</h2>
      <Table>
        <TableCaption className="sr-only">{title}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Segment</TableHead>
            <TableHead className="text-right">Picks</TableHead>
            <TableHead className="text-right">W-L-P</TableHead>
            <TableHead className="text-right">Win rate</TableHead>
            <TableHead className="text-right">Pending</TableHead>
            <TableHead className="text-right">Profit</TableHead>
            <TableHead className="text-right">ROI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.segment}>
              <TableCell
                className={
                  row.segment_kind === "side" ? "pl-6" : "font-semibold"
                }
              >
                {row.segment_kind === "side"
                  ? (SIDE_LABELS[row.segment?.split(":")[1] ?? ""] ??
                    row.segment)
                  : (MARKET_LABELS[row.segment as keyof typeof MARKET_LABELS] ??
                    row.segment)}
                <span className="ml-2 text-xs text-muted-foreground">
                  {row.thin_sample ? "Small sample" : ""}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono">
                {row.picks}
              </TableCell>
              <TableCell className="text-right font-mono">
                {row.wins}-{row.losses}-{row.pushes}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatPct(row.win_rate)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {row.pending}
              </TableCell>
              <TableCell className="text-right font-mono">
                {row.staked_units
                  ? `${formatSigned(row.profit_units, 2)}u`
                  : "–"}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatPct(row.roi)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

export function PickPolicy({
  firstDecision,
}: {
  firstDecision?: string | null;
}) {
  return (
    <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
      <p>
        One recommended side per game and market. Prices and decisions are
        frozen when first published. Later forecasts do not rewrite a pick. A
        changed kickoff voids the original pick.
      </p>
      <p>
        CFB picks v3 requires a 4.5 percentage-point advantage over the
        price&apos;s break-even probability, conditional on no push, plus
        positive EV. Prices must come from the configured odds feed, have an
        opposing price and matching kickoff, and be captured within one hour.
        Verified game matches are required. Injury availability is unavailable
        for every team and remains flagged; any additional missing model input
        blocks a pick. Each pick risks 1 unit; a push returns the stake.
        Moneylines use the frozen margin distribution’s win probability without
        a spread; a tied final is void. Picks use the model&apos;s own
        probabilities. Historical calibration is diagnostic and does not gate
        recommendations; this record measures the picks as games finish.
      </p>
      <p>
        {firstDecision
          ? `Recording began ${new Date(firstDecision).toISOString().slice(0, 10)} for this selection.`
          : "Recommendation recording starts with the first publish after activation."}{" "}
        Earlier forecasts remain in accuracy history and are not counted as past
        picks.{" "}
        <Link
          href="/cfb/history?view=accuracy"
          className="underline underline-offset-4"
        >
          View forecast history
        </Link>
        .
      </p>
    </div>
  );
}
