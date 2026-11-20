import type { Metadata } from "next";
import Link from "next/link";
import { CalibrationChart } from "@/components/calibration-chart";
import { HowGraded } from "@/components/how-graded";
import { Notice } from "@/components/notice";
import { PageHeader, PageSection, PageShell, PageTitle } from "@/components/page-layout";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCents, ledgerByTier, tierLabel } from "@/lib/lmb";
import { fetchLmbPerformance } from "@/lib/lmb-data";
import type { LmbEvaluationRow } from "@/lib/lmb-types";
import { EMPTY, cn, formatDate, formatNumber, formatPct, formatSigned } from "@/lib/utils";

// The evaluation tables refresh this page through the revalidation webhook;
// the ledger also reads lmb.games, which has no trigger, so an hour.
export const revalidate = 3600;
export const metadata: Metadata = {
  title: "LMB Model Performance",
  description:
    "How the LMB forecast scores: log loss, Brier score and accuracy on every graded game, the same forecasts against the Kalshi close on the games Kalshi priced, calibration, and the record of its moneyline picks at one unit.",
};

const WINDOWS: { key: string; label: string }[] = [
  { key: "day", label: "Latest day" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "season", label: "Season" },
];

const num = "text-right tabular-nums";

function windowRows(evaluation: LmbEvaluationRow[]) {
  return WINDOWS.flatMap(({ key, label }) => {
    const row = evaluation.find((r) => r.window === key);
    return row ? [{ label, row }] : [];
  });
}

const units = (value: number) => `${formatSigned(value, 1)}u`;
const roi = (value: number, picks: number) => (picks ? `${formatSigned((value / picks) * 100, 1)}%` : EMPTY);

// The model's score beside Kalshi's on the same games, with the lower one marked.
function Paired({ model, market }: { model: number | null; market: number | null }) {
  const ahead = model != null && market != null ? model < market : null;
  return (
    <>
      <span className={cn(ahead === true && "font-semibold text-positive")}>{formatNumber(model, 3)}</span>
      <span className="text-muted-foreground"> / {formatNumber(market, 3)}</span>
    </>
  );
}

export default async function PerformancePage() {
  const performance = await fetchLmbPerformance();
  const rows = windowRows(performance.evaluation);
  const season = rows.find((r) => r.row.window === "season")?.row;
  const kalshiRows = rows.filter((r) => r.row.kalshi_games > 0);
  const tiers = ledgerByTier(performance.ledger);
  const settled = tiers.reduce((total, tier) => total + tier.picks, 0);

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>LMB Model Performance</PageTitle>
          <div className="mt-heading">
            <HowGraded label="How this is graded" lead={<>Every forecast is scored once its game is final.</>}>
              <p>
                Each game counts once, from the home team&apos;s published win probability frozen at first pitch. Log
                loss and the Brier score are lower when the forecast is better; accuracy is how often the team the forecast
                favored won.
                Runs MAE is the average miss of each team&apos;s expected runs.
              </p>
              <p>
                The Kalshi comparison covers only games with a Kalshi quote captured before first pitch, so its
                figures describe a different set of games than the all-games table and are not comparable with it.
              </p>
            </HowGraded>
          </div>
        </div>
        <Link href="/lmb/history" className="text-sm underline underline-offset-4">
          Forecast history
        </Link>
      </PageHeader>

      {!performance.published || rows.length === 0 ? (
        <Notice>
          No LMB games have been graded yet. Accuracy, calibration and pick results appear here once the season&apos;s
          first forecasts are final; the LMB season runs from April to September.
        </Notice>
      ) : (
        <>
          <PageSection aria-labelledby="accuracy-heading">
            <h2 id="accuracy-heading" className="type-section">Forecast accuracy, all graded games</h2>
            <Table>
              <TableCaption className="sr-only">Forecast accuracy by window on every graded game</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Window</TableHead>
                  <TableHead className="text-right">Games</TableHead>
                  <TableHead className="text-right">Log loss</TableHead>
                  <TableHead className="text-right">Brier</TableHead>
                  <TableHead className="text-right">Accuracy</TableHead>
                  <TableHead className="text-right">Runs MAE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ label, row }) => (
                  <TableRow key={row.window}>
                    <TableCell>{label}</TableCell>
                    <TableCell className={num}>{row.n_games}</TableCell>
                    <TableCell className={num}>{formatNumber(row.log_loss, 3)}</TableCell>
                    <TableCell className={num}>{formatNumber(row.brier, 3)}</TableCell>
                    <TableCell className={num}>{formatPct(row.accuracy)}</TableCell>
                    <TableCell className={num}>{formatNumber(row.expected_runs_mae, 2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {season && (
              <p className="type-meta text-muted-foreground">
                {season.season} season through {formatDate(season.as_of)}.
              </p>
            )}
          </PageSection>

          <PageSection aria-labelledby="kalshi-heading">
            <h2 id="kalshi-heading" className="type-section">Against the Kalshi close</h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Only games with a closing Kalshi quote. The model and Kalshi are scored on the same games, model first;
              these games are a subset, so the figures differ from the table above.
            </p>
            {kalshiRows.length === 0 ? (
              <Notice>No graded game has a closing Kalshi quote yet.</Notice>
            ) : (
              <Table>
                <TableCaption className="sr-only">Model against the Kalshi close on games with a closing quote</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Window</TableHead>
                    <TableHead className="text-right">Games with a close</TableHead>
                    <TableHead className="text-right">Log loss, model / Kalshi</TableHead>
                    <TableHead className="text-right">Brier, model / Kalshi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kalshiRows.map(({ label, row }) => (
                    <TableRow key={row.window}>
                      <TableCell>{label}</TableCell>
                      <TableCell className={num}>{row.kalshi_games}</TableCell>
                      <TableCell className={num}>
                        <Paired model={row.model_log_loss_on_kalshi} market={row.kalshi_log_loss} />
                      </TableCell>
                      <TableCell className={num}>
                        <Paired model={row.model_brier_on_kalshi} market={row.kalshi_brier} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </PageSection>

          <PageSection aria-labelledby="calibration-heading">
            <h2 id="calibration-heading" className="type-section">Calibration{performance.season ? `, ${performance.season}` : ""}</h2>
            {performance.calibration.length === 0 ? (
              <Notice>No calibration bins yet.</Notice>
            ) : (
              <CalibrationChart
                data={performance.calibration.map((bin) => ({
                  predicted_mean: bin.mean_pred,
                  observed_rate: bin.mean_obs,
                  count: bin.n,
                }))}
              />
            )}
          </PageSection>

          <PageSection aria-labelledby="picks-heading">
            <h2 id="picks-heading" className="type-section">Moneyline picks</h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              At most one team per game, priced at the frozen Kalshi ask plus fee and graded at one unit. ROI is units
              per pick. {settled < 30 && "The sample is too small to establish an edge."}
            </p>
            <Table>
              <TableCaption className="sr-only">Pick results by window</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Window</TableHead>
                  <TableHead className="text-right">Picks</TableHead>
                  <TableHead className="text-right">Record</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ label, row }) => (
                  <TableRow key={row.window}>
                    <TableCell>{label}</TableCell>
                    <TableCell className={num}>{row.pick_count}</TableCell>
                    <TableCell className={num}>
                      {row.pick_wins}&ndash;{row.pick_count - row.pick_wins}
                    </TableCell>
                    <TableCell className={num}>{units(row.pick_units)}</TableCell>
                    <TableCell className={num}>{roi(row.pick_units, row.pick_count)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {tiers.length > 0 && (
              <Table>
                <TableCaption className="sr-only">Graded picks this season by tier</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>{performance.season} by tier</TableHead>
                    <TableHead className="text-right">Picks</TableHead>
                    <TableHead className="text-right">Record</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                    <TableHead className="text-right">Avg cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiers.map((tier) => (
                    <TableRow key={tier.tier}>
                      <TableCell>{tierLabel(tier.tier)}</TableCell>
                      <TableCell className={num}>{tier.picks}</TableCell>
                      <TableCell className={num}>
                        {tier.wins}&ndash;{tier.losses}
                      </TableCell>
                      <TableCell className={num}>{units(tier.units)}</TableCell>
                      <TableCell className={num}>{roi(tier.units, tier.picks)}</TableCell>
                      <TableCell className={num}>{formatCents(tier.meanPrice)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <p className="type-meta text-muted-foreground">
              Value picks have a non-negative expected value at the ask plus fee and leans a small negative one; the
              daily minimum adds three games a day, ranked an hour before the first pitch. The ask sits above the
              midpoint, so most picks carry a small negative expected value. Avg cost is the ask plus fee. Every graded
              pick is in the <Link href="/lmb/history?view=picks" className="underline underline-offset-4">pick history</Link>.
            </p>
          </PageSection>
        </>
      )}
    </PageShell>
  );
}
