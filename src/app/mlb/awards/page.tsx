import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { buildSafe } from "@/lib/build-safe";
import { fetchAwards, type AwardModel, type AwardRow } from "@/lib/mlb-awards.server";
import { Notice } from "@/components/notice";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Not a week: a deploy whose build read times out serves the unavailable state
// until this timer runs out. An unchanged regeneration bills no ISR write.
export const revalidate = 86400;
export const metadata: Metadata = {
  title: "MLB Awards Forecast",
  description:
    "Frozen forecasts for MVP, Cy Young, Rookie of the Year, Reliever of the Year, and the Gold Gloves, fitted on past ballots and graded against the winners.",
};

const LEAGUES = ["AL", "NL"] as const;
const BALLOTS = [
  { award: "MVP", title: "Most Valuable Player", model: "MVP" },
  { award: "CY", title: "Cy Young", model: "CY" },
  { award: "ROY", title: "Rookie of the Year", model: "ROY" },
  { award: "RP", title: "Reliever of the Year", model: "RP" },
] as const;
const POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "UT"];
const SHOWN = 5;
const FROZEN_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });

// The backtest's most confident calls hit about nine times in ten, so a board
// never prints more certainty than that supports.
function chance(probability: number | null) {
  if (probability == null) return "–";
  if (probability >= 0.95) return "95%+";
  if (probability < 0.01) return "<1%";
  return `${Math.round(probability * 100)}%`;
}

function record(models: AwardModel[], name: string) {
  const fit = models.find((model) => model.model === name)?.backtest;
  if (!fit) return null;
  return `Backtest ${fit.seasons[0]}-${fit.seasons.at(-1)}: called ${fit.hits} of ${fit.races} winners, the ${fit.baseline === "war" ? "fWAR" : fit.baseline === "oaa" ? "OAA" : fit.baseline} leader ${fit.baseline_hits}.`;
}

function Candidate({ row }: { row: AwardRow }) {
  return (
    <TableCell className="min-w-44 whitespace-normal">
      <span className="font-medium">{row.player_name}</span>
      {row.won === true && <span className="ml-2 rounded-sm bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">Won</span>}
      <span className="mt-0.5 block text-xs text-muted-foreground">
        {[row.team, row.stat_line].filter(Boolean).join(" · ") || "Off the frozen board"}
      </span>
    </TableCell>
  );
}

function Rows({ rows, showShare, showChance }: { rows: AwardRow[]; showShare: boolean; showChance: boolean }) {
  return rows.map((row) => (
    <TableRow key={row.player_id}>
      <TableCell className="w-8 align-top font-mono tabular-nums text-muted-foreground">{row.rank ?? "–"}</TableCell>
      <Candidate row={row} />
      {showShare && <TableCell className="text-right align-top tabular-nums">{row.vote_share == null ? "–" : `${Math.round(row.vote_share * 100)}%`}</TableCell>}
      {showChance && <TableCell className="text-right align-top font-medium tabular-nums">{chance(row.win_probability)}</TableCell>}
    </TableRow>
  ));
}

function Race({ title, rows }: { title: string; rows: AwardRow[] }) {
  const showShare = rows.some((row) => row.vote_share != null);
  const showChance = rows.some((row) => row.win_probability != null);
  const unranked = rows.filter((row) => row.rank == null);
  const ranked = rows.filter((row) => row.rank != null);
  const first = [...ranked.slice(0, SHOWN), ...unranked];
  const rest = ranked.slice(SHOWN);
  const head = (
    <TableHeader><TableRow>
      <TableHead className="w-8">#</TableHead><TableHead>{title}</TableHead>
      {showShare && <TableHead className="text-right">Vote</TableHead>}
      {showChance && <TableHead className="text-right">Win</TableHead>}
    </TableRow></TableHeader>
  );
  return (
    <div className="min-w-0">
      <Table>{head}<TableBody><Rows rows={first} showShare={showShare} showChance={showChance} /></TableBody></Table>
      {rest.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-xs text-muted-foreground">Next {rest.length}</summary>
          <Table>{head}<TableBody><Rows rows={rest} showShare={showShare} showChance={showChance} /></TableBody></Table>
        </details>
      )}
    </div>
  );
}

export default async function MlbAwardsPage() {
  const data = await buildSafe("MLB awards", fetchAwards);
  if (!data) {
    return (
      <PageShell>
        <PageTitle>Awards Forecast</PageTitle>
        <Notice role="status">Award forecasts are temporarily unavailable.</Notice>
      </PageShell>
    );
  }
  const { season, models, rows } = data;
  if (season == null || rows.length === 0) {
    return (
      <PageShell>
        <PageTitle>Awards Forecast</PageTitle>
        <p className="text-muted-foreground">No award forecasts have been published yet.</p>
      </PageShell>
    );
  }
  const frozen = FROZEN_DATE.format(new Date(models[0].as_of));
  const race = (award: string, league: string, position = "") =>
    rows.filter((row) => row.award === award && row.league === league && row.position === position);

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>Awards Forecast</PageTitle>
          <PageDescription className="type-eyebrow">{season} season · Frozen {frozen}</PageDescription>
        </div>
      </PageHeader>

      <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">
        Who the voters will pick, not who deserves it. Each race is a model fitted on past winners and ballots using
        regular-season numbers only, frozen when published and graded against the result. Vote is the forecast share
        of ballot points, Win is the chance of taking the award.
      </p>

      {BALLOTS.map(({ award, title, model }) => (
        <section key={award} className="space-y-3 border-t border-rule-strong pt-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">
            {record(models, model)}
            {award === "RP" && " The BBWAA award is new, so this model learned from the Rivera and Hoffman awards, which a different panel votes on."}
          </p>
          <div className="grid gap-6 lg:grid-cols-2">
            {LEAGUES.map((league) => <Race key={league} title={`${league} candidate`} rows={race(award, league)} />)}
          </div>
        </section>
      ))}

      <section className="space-y-3 border-t border-rule-strong pt-4">
        <h2 className="text-lg font-semibold">Gold Gloves</h2>
        <p className="max-w-4xl text-xs leading-relaxed text-muted-foreground">
          {record(models, "GG_FIELD")} {record(models, "GG_C")?.replace("Backtest", "Catchers")} Those backtests pick
          from every qualified fielder, while these boards pick among the three finalists. This board was run without
          the {season} winners but published after their announcement, so it is a blind test and not an advance call.
          Pitchers and utility players are ranked with no probability: the pitcher model called {models.find((model) => model.model === "GG_P")?.backtest.hits} of {models.find((model) => model.model === "GG_P")?.backtest.races}, and utility has too few seasons to test.
        </p>
        {POSITIONS.map((position) => (
          <div key={position} className="grid gap-6 lg:grid-cols-2">
            {LEAGUES.map((league) => <Race key={league} title={`${league} ${position}`} rows={race("GG", league, position)} />)}
          </div>
        ))}
      </section>
    </PageShell>
  );
}
