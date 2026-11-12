import type { ReactNode } from "react";
import { PageSection } from "@/components/page-layout";
import { HowGraded } from "@/components/how-graded";
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
  formatDate,
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
  pickQualification,
  QUALIFICATION_LABELS,
  pickPricing,
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
      : ` ${metric.picks ?? 0} predictions across ${metric.unique_games} unique games.`;
  return (
    <p className="text-xs text-muted-foreground">
      {market === "all" ? (
        <>
          {count} recorded market decisions.{games} No Play decisions are shown
          for context and excluded from the prediction record and ROI.
        </>
      ) : (
        <>
          {count} {MARKET_LABELS[market].toLowerCase()} predictions.
          {games} No Play decisions are listed under All markets.
        </>
      )}
    </p>
  );
}

export function PickKpis({
  metric,
  unavailable = false,
  roiError,
  ruleEv,
}: {
  metric?: FootballPickMetric;
  unavailable?: boolean;
  // One standard error of the ROI, where the sport publishes it.
  roiError?: number | null;
  // Where the pick rule has changed, the newest rule's expectation: rules
  // price expected value differently, so one average across them misleads.
  ruleEv?: { average_ev: number | null; picks: number; first_decision_at: string };
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
        tooltip="Wins divided by wins plus losses. Excludes pushes and voids."
      />
      <KpiCard
        label="Net profit"
        value={settled ? `${formatSigned(metric?.profit_units, 2)}u` : missing}
        sub="Flat 1u per prediction"
      />
      <KpiCard
        label="ROI"
        value={unavailable ? missing : formatPct(metric?.roi)}
        sub={unavailable || roiError == null ? undefined : `± ${formatPct(roiError)} standard error`}
        tooltip={`Profit divided by settled stakes at recorded odds. Includes pushes; excludes pending and void predictions.${roiError == null ? "" : " The standard error is how far the ROI would typically land from its long-run value by chance alone at this sample size."}`}
      />
      <KpiCard
        label="Predictions settled"
        value={unavailable ? missing : String(settled)}
        sub={
          unavailable
            ? undefined
            : `${metric?.pending ?? 0} pending · ${metric?.voids ?? 0} void`
        }
      />
      <KpiCard
        label="Average EV"
        value={unavailable ? missing : formatPct(ruleEv ? ruleEv.average_ev : metric?.average_ev)}
        sub={unavailable || !ruleEv ? undefined : `Current rule · ${ruleEv.picks} predictions`}
        tooltip={
          ruleEv
            ? `Average expected profit per unit when published, on the predictions made under the current pick rule (since ${formatDate(ruleEv.first_decision_at)}), including pending ones. Earlier rules priced expected value differently and are listed under Record by pick rule. A forecast, not realized profit.`
            : "Average expected profit per unit when published, including pending predictions. A forecast, not realized profit."
        }
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
            <TableHead>Market / prediction</TableHead>
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
          const shownPicks = picks.filter((pick) => pick.status === "recommended").length;
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
                  {game.policy_version.startsWith("cfb-") && shownPicks > 1 && (
                    <p className="mt-1 text-xs text-muted-foreground">{shownPicks} shown predictions · {shownPicks}u · Shared-game exposure</p>
                  )}
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
                    <div className="type-eyebrow text-muted-foreground">
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
                    {pick.status === "recommended" && (
                      <span className="mt-1 inline-block rounded-sm border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{pickQualification(pick)}</span>
                    )}
                    <details className="mt-1 text-xs text-muted-foreground">
                      <summary className="cursor-pointer">Recorded details</summary>
                      <div className="mt-1 max-w-64 space-y-1 break-all">
                        <p>Decision: {new Date(pick.decision_at).toISOString()}</p>
                        <p>Rule: {pick.policy_version}</p>
                        {pickPricing(pick) && (
                          <p>Probability: {pickPricing(pick)?.summary}</p>
                        )}
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
                        {pick.odds_source && (
                          <p>
                            Price source:{" "}
                            {pick.odds_source === "espn"
                              ? "ESPN scoreboard (DraftKings line, no book timestamp)"
                              : pick.odds_source === "odds_api"
                                ? "The Odds API (timestamped book quote)"
                                : pick.odds_source}
                          </p>
                        )}
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
                        "type-eyebrow",
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
    <PageSection>
      <h2 className="type-section">{title}</h2>
      <Table>
        <TableCaption className="sr-only">{title}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Segment</TableHead>
            <TableHead className="text-right">Predictions</TableHead>
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
                  : (QUALIFICATION_LABELS[row.segment ?? ""] ?? MARKET_LABELS[row.segment as keyof typeof MARKET_LABELS] ??
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
    </PageSection>
  );
}

// The policy renders its own closed toggle; a page passes its other grading
// notes as children so each picks view has one toggle, not two.
export function PickPolicy({
  firstDecision,
  sport = "cfb",
  lead,
  children,
}: {
  firstDecision?: string | null;
  sport?: PickSport;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <HowGraded lead={lead}>
      {children}
      <p>
        One predicted side per game and market. A decision can be replaced
        until the game starts by a newer model or policy, and the original stays
        archived; line movement alone never changes one. Once a game starts, the
        recorded side, line and price cannot change, and that record is what is
        graded. A changed kickoff voids the original prediction.
      </p>
      {sport === "nhl" ? (
        <p>
          NHL prediction policy v3, from November 2, 2026, prices moneylines
          from the vig-free market consensus, moved only when a team played the
          day before: on 2023&ndash;2025 games the opening line under-priced
          that fatigue. A moneyline qualifies with positive estimated EV at its
          price. Totals price the published forecast, which blends the model
          halfway with the market, and need the published total to differ from
          the posted line by at least half a goal with positive estimated EV at
          its price. A game without a two-sided price is No Play. From October
          10 through November 1 (v2) moneylines also priced the published blend
          and needed a 4.5 percentage point edge, and totals needed the
          half-goal gap only. Predictions through October 9, 2026 (v1) used the model
          alone with the spreadsheet&apos;s thresholds of 13 percentage points
          and one goal. Prices come from the NHL&apos;s partner sportsbook
          feed (DraftKings and FanDuel), the better of the two, and must be
          dated within 24 hours of publication. Each prediction risks 1 unit; the
          fractional Kelly stake the sheet computed is shown for reference
          only. A moved, postponed or cancelled game voids its prediction; totals
          push on the line; there are no moneyline ties. Estimated EV does not
          establish a real advantage over the market.
        </p>
      ) : sport === "nfl" ? (
        <p>
          NFL prediction policy v6, from November 2, 2026, prices every market
          from the median line across books at decision time with the vig
          removed. Spreads and moneylines move that line 4.5% of the way toward
          the pure model margin, the weight the model earned against 2016&ndash;2021
          closing lines; totals use the market alone. Any offer with positive
          estimated EV at its price is a prediction. When fewer than five games
          have one, the highest-EV model sides on spreads and moneylines fill a
          five-game weekly slate as ranked leans: close to a coin flip, with
          estimated EV near zero or negative, and staked and counted like every
          other prediction. Dispersions are fixed at 12.82 points for margins
          and 13.28 for totals. Through November 1 (v5) the priced line had to
          sit at least 2.0 points beyond break-even against the published
          blended numbers, and the highest-edge positive-EV offers were promoted
          as volume-floor predictions when fewer than five qualified. Each
          prediction risks 1 unit.
          Prices require an opposing quote, an exact kickoff, a verified game
          match, an explicitly configured available bookmaker, and an update
          within one hour. Schedule receipts must be within 24 hours,
          expected-QB depth charts within 48 hours, and the forecast within
          seven days. The underlying QB identity must also be dated within 48
          hours. Missing source receipts or expected QBs block a prediction. Non-QB
          injuries are not modeled and remain flagged; this is not comprehensive
          injury clearance. Confirmed cancellations, postponements, and changed
          kickoffs void the original contract. Unconfirmed missing games stay
          pending. Moneyline ties are void; spread and total pushes return the
          stake. Margin probabilities use discrete key-number margins and
          total probabilities use integer scores. Historical calibration is
          diagnostic, not a publication gate. Estimated EV does not establish a
          real advantage over the market. There are no additional exposure caps.
          Through week 8 of 2026, 33 of the 59 predictions were volume-floor
          promotions; each row in the history and the export records its reason.
          Each prediction also records its price source: The Odds API (a
          timestamped quote, best of DraftKings, FanDuel and BetMGM) through
          October 6, 2026, and ESPN&apos;s scoreboard (DraftKings&apos; line, no
          book timestamp) from October 11. When The Odds API is the source,
          the configured books from November 2 are DraftKings, FanDuel, BetMGM
          and Pinnacle.
        </p>
      ) : (
        <p>
          CFB research prediction policy v13 uses fresh paired bookmaker moneylines, removes
          each book&apos;s vig, and takes the median market probability. Its
          equivalent margin receives 80% weight and the pure model margin 20%;
          the blended margin determines win probability. Moneylines need positive
          estimated EV and at least 2.0 probability-equivalent points of edge;
          they cannot be promoted to fill the weekly quota. Spreads (since v12)
          are priced from the market spread moved 0.75% of the way toward the
          model/history margin, the weight fitted against closing lines;
          development-fitted football key-number weights set only the push
          chance, with 15.35-point dispersion. Totals (since v13) move the
          decision-time median total 21% of the way toward the model side of the
          published total, with 15.93-point dispersion. Through v11, spreads
          blended 20% model/history with 80% market margin and totals priced the
          published 50/50 blend. The 15-prediction research target
          can promote positive-EV spreads and totals only. Each market is capped
          at half the available exploratory slots, rounded up, after shortlisting.
          Capped slots stay empty; qualified predictions are unchanged. These exploratory predictions
          are labeled and evaluated separately from edge-qualified predictions. Each prediction records
          its policy and probability source; earlier predictions retain their original
          rules and prices. Prices need a fresh opposing quote, matching
          kickoff, and verified game identity. Incomplete inputs remain No Play.
          Each prediction uses one research unit. Multiple predictions on the same game
          have correlated outcomes and their shared exposure is flagged.
          Pushes return the stake and moneyline ties are void. Predictions
          remain active for research; estimated edges are not validated profits.
          Prices are the best available among the bookmakers in The Odds API
          feed (nine through November 1, ten with Pinnacle from November 2),
          several of them offshore, so the record assumes access to all of
          them. A prediction stays in the graded record unless a
          newer model version replaces it before kickoff; a later price move that
          turns the open decision into a No Play does not remove it. On October
          12, 2026 the week 7 slate published under v8 was replaced by v11
          decisions before any game started; the 15 original predictions are
          archived in the model repository&apos;s pick ledger as superseded
          before kickoff and would have scored +1.96u against the +1.23u of their
          replacements.
        </p>
      )}
      <p>
        {firstDecision
          ? `Recording began ${new Date(firstDecision).toISOString().slice(0, 10)} for this selection.`
          : "Prediction recording starts with the first publish after activation."}{" "}
        Earlier forecasts remain in accuracy history and are not counted as past
        predictions.{" "}
        <Link
          href={`/${sport}/history?view=accuracy`}
          className="underline underline-offset-4"
        >
          View forecast history
        </Link>
        {sport === "nhl" ? "." : <>, or download every recorded decision from the <Link href="/data" className="underline underline-offset-4">data page</Link>.</>}
      </p>
    </HowGraded>
  );
}
