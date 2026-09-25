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
import { Kickoff } from "@/components/kickoff-cells";
import { LocalKickoffs } from "@/components/local-kickoffs";
import {
  MARKET_LABELS,
  SIDE_LABELS,
  pickLabel,
  pickReason,
  type FootballPick,
  type FootballPickMetric,
  type PickMarket,
  type PickSport,
} from "@/lib/football-picks";

export function PickCountNote({
  count,
  market,
  metric,
}: {
  count: number;
  market: PickMarket;
  metric?: FootballPickMetric;
}) {
  const games =
    metric?.unique_games == null
      ? null
      : ` ${metric.picks ?? 0} recommendations across ${metric.unique_games} unique games.`;
  return (
    <p className="text-xs text-muted-foreground">
      {market === "all" ? (
        <>
          {count} recorded market decisions.{games} No Play decisions are shown
          for context and excluded from the pick record and ROI.
        </>
      ) : (
        <>
          {count} recommended {MARKET_LABELS[market].toLowerCase()} picks.
          {games} No Play decisions are listed under All markets.
        </>
      )}
    </p>
  );
}

export function PickKpis({
  metric,
  unavailable = false,
}: {
  metric?: FootballPickMetric;
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
  rows: FootballPick[];
  caption?: string;
}) {
  const games = new Map<FootballPick["game_id"], FootballPick[]>();
  for (const pick of rows) {
    const game = games.get(pick.game_id);
    if (game) game.push(pick);
    else games.set(pick.game_id, [pick]);
  }
  return (
    <LocalKickoffs>
      <Table>
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Market / pick</TableHead>
            <TableHead className="text-right">Odds</TableHead>
            <TableHead className="hidden text-right sm:table-cell">
              EV
            </TableHead>
            <TableHead>Result</TableHead>
            <TableHead className="text-right">Profit</TableHead>
          </TableRow>
        </TableHeader>
        {[...games].map(([gameId, picks]) => {
          const game = picks[0];
          const scored = picks.find(
            (pick) =>
              (pick.home_points ?? pick.home_goals) != null &&
              (pick.away_points ?? pick.away_goals) != null,
          );
          const headingId = `pick-game-${gameId}`;
          return (
            <TableBody key={gameId} aria-labelledby={headingId}>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <th
                  id={headingId}
                  scope="rowgroup"
                  colSpan={5}
                  className="px-2 py-3 text-left font-normal"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="font-medium">
                      {game.away_team} at {game.home_team}{" "}
                      {scored && (
                        <span className="ml-2 whitespace-nowrap font-mono text-xs text-muted-foreground">
                          {scored.away_points ?? scored.away_goals}
                          {" - "}
                          {scored.home_points ?? scored.home_goals}
                        </span>
                      )}
                    </span>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      <Kickoff start={game.start_date} part="day" /> ·{" "}
                      <Kickoff start={game.start_date} part="time" />
                    </span>
                  </div>
                </th>
              </TableRow>
              {picks.map((pick) => (
                <TableRow
                  key={`${pick.game_id}-${pick.market}`}
                  // No Play rows fade so the picks carry the table, matching
                  // the MLB history treatment of rows without a pick.
                  className={cn(pick.status !== "recommended" && "[&>td]:opacity-50")}
                >
                  <TableCell className="whitespace-normal">
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
                        {pick.missing_input_count != null ? (
                          <p>
                            Missing inputs: {pick.missing_input_count}. NHL counts
                            flag a venue window under ten games.
                          </p>
                        ) : (
                          <p>
                            Missing inputs: home{" "}
                            {pick.home_missing_input_count ?? "unknown"}, away{" "}
                            {pick.away_missing_input_count ?? "unknown"}.{" "}
                            {pick.policy_version.startsWith("cfb-")
                              ? "Counts include unavailable injury data."
                              : "NFL counts flag missing expected-QB identities."}
                          </p>
                        )}
                        <p>Model: {pick.model_version}</p>
                        {pick.execution_eligibility_verified !== undefined && (
                          <p>
                            Bookmaker availability:{" "}
                            {pick.execution_eligibility_verified
                              ? "verified"
                              : "unverified"}
                          </p>
                        )}
                        <p>
                          Provider updated:{" "}
                          {pick.provider_last_update ?? "unavailable"}
                        </p>
                        {pick.source_timestamps && (
                          <p>
                            Source receipts:{" "}
                            {JSON.stringify(pick.source_timestamps)}
                          </p>
                        )}
                        {pick.data_flags && (
                          <p>Data flags: {JSON.stringify(pick.data_flags)}</p>
                        )}
                        {pick.settlement_reason && (
                          <p>Settlement: {pickReason(pick.settlement_reason)}</p>
                        )}
                        {pick.result_source_at && (
                          <p>Result observed: {pick.result_source_at}</p>
                        )}
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
                        <p>
                          Forecast: {new Date(pick.forecast_as_of).toISOString()}
                        </p>
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
          );
        })}
      </Table>
    </LocalKickoffs>
  );
}

export function PickBreakdown({
  title,
  rows,
}: {
  title: string;
  rows: FootballPickMetric[];
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
  sport = "cfb",
}: {
  firstDecision?: string | null;
  sport?: PickSport;
}) {
  return (
    <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
      <p>
        One recommended side per game and market. Prices and decisions are
        frozen when first published. Later forecasts do not rewrite a pick. A
        changed kickoff voids the original pick.
      </p>
      {sport === "nhl" ? (
        <p>
          NHL picks v1 follows the original spreadsheet&apos;s rules. A
          moneyline is recommended when the model&apos;s win probability
          beats the posted price&apos;s break-even probability by at least 13
          percentage points with positive estimated EV; a total when the model
          total differs from the posted line by at least one goal. Prices come
          from the NHL&apos;s partner sportsbook feed (DraftKings and FanDuel),
          the better of the two, and must be dated within 24 hours of
          publication. Each pick risks 1 unit; the fractional Kelly stake the
          sheet computed is shown for reference only. A moved, postponed or
          cancelled game voids its pick; totals push on the line; there are no
          moneyline ties. Estimated EV does not establish a real betting
          advantage.
        </p>
      ) : sport === "nfl" ? (
        <p>
          NFL picks v1 requires a 4.5 percentage-point advantage over the
          price&apos;s break-even probability, conditional on no push or
          returned tie, plus positive estimated EV. Each pick risks 1 unit.
          Prices require an opposing quote, an exact kickoff, a verified game
          match, an explicitly configured available bookmaker, and an update
          within one hour. Schedule receipts must be within 24 hours,
          expected-QB depth charts within 48 hours, and the forecast within
          seven days. The underlying QB identity must also be dated within 48
          hours. Missing source receipts or expected QBs block a pick. Non-QB
          injuries are not modeled and remain flagged; this is not comprehensive
          injury clearance. Confirmed cancellations, postponements, and changed
          kickoffs void the original contract. Unconfirmed missing games stay
          pending. Moneyline ties are void; spread and total pushes return the
          stake. The pure NFL model uses discrete key-number margins and
          integer-score total probabilities. Historical calibration is
          diagnostic, not a publication gate. Estimated EV does not establish a
          real betting advantage. There are no additional exposure caps.
        </p>
      ) : (
        <p>
          CFB picks v3 requires a 4.5 percentage-point advantage over the
          price&apos;s break-even probability, conditional on no push, plus
          positive EV. Prices must come from the configured odds feed, have an
          opposing price and matching kickoff, and be captured within one hour.
          Verified game matches are required. Injury availability is unavailable
          for every team and remains flagged; any additional missing model input
          blocks a pick. Each pick risks 1 unit; a push returns the stake.
          Moneylines use the frozen margin distribution’s win probability
          without a spread; a tied final is void. Picks use the model&apos;s own
          probabilities. Historical calibration is diagnostic and does not gate
          recommendations; this record measures the picks as games finish.
        </p>
      )}
      <p>
        {firstDecision
          ? `Recording began ${new Date(firstDecision).toISOString().slice(0, 10)} for this selection.`
          : "Recommendation recording starts with the first publish after activation."}{" "}
        Earlier forecasts remain in accuracy history and are not counted as past
        picks.{" "}
        <Link
          href={`/${sport}/history?view=accuracy`}
          className="underline underline-offset-4"
        >
          View forecast history
        </Link>
        .
      </p>
    </div>
  );
}
