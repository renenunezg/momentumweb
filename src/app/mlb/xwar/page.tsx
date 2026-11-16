import type { Metadata } from "next";
import { PageDescription, PageHeader, PageMeta, PageSection, PageShell, PageTitle } from "@/components/page-layout";
import { HowGraded } from "@/components/how-graded";
import { LastUpdated } from "@/components/last-updated";
import { XwarLeaderboard } from "@/components/mlb-xwar-leaderboard";
import { MLB_PLAYER_SECTIONS, PlayerSectionTabs } from "@/components/player-section-tabs";
import { NavigationLink as Link } from "@/components/navigation-link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchXwar, type XwarStudy } from "@/lib/mlb-xwar";
import { formatNumber, formatSigned } from "@/lib/utils";

// Every read here is expired by the revalidation webhook when its table is
// published, and nothing on the page depends on the clock, so the week is only
// a backstop.
export const revalidate = 604800;

export async function generateMetadata(): Promise<Metadata> {
  const { season } = await fetchXwar();
  return {
    title: `MLB xWAR ${season ?? ""}`.trim(),
    description:
      "Expected WAR: each player's fWAR with the luck on contact taken out, where a hitter keeps the share of his results his own record supports.",
  };
}

const r = (v: number) => formatSigned(v, 2).replace(/^([+-])0/, "$1");
const range = ([value, low, high]: [number, number, number]) => `${r(value)} (${r(low)} to ${r(high)})`;
const READINGS: [keyof XwarStudy["next_season_fwar"]["r"], string][] = [
  ["fwar", "fWAR"],
  ["expected", "Whole gap removed"],
  ["xwar", "xWAR"],
];

export default async function MlbXwarPage() {
  // A failed read throws so ISR keeps the last good page.
  const { study, season, updatedAt, projectionSeason, players } = await fetchXwar();

  if (!study || season == null || players.length === 0) {
    return (
      <PageShell>
        <PageTitle>xWAR</PageTitle>
        <PlayerSectionTabs sections={MLB_PLAYER_SECTIONS} label="Player pages" />
        <p className="text-muted-foreground">No xWAR has been published yet.</p>
      </PageShell>
    );
  }

  const { hitter, pitcher, next_season_fwar: next } = study;
  const lead = next.lead.xwar_over_fwar;

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>xWAR</PageTitle>
          <PageMeta>
            <PageDescription className="type-eyebrow">Through the {season} season</PageDescription>
            <LastUpdated timestamp={updatedAt} schedule="Refreshed with the run values, Mondays and Thursdays in season" />
          </PageMeta>
        </div>
      </PageHeader>
      <PlayerSectionTabs sections={MLB_PLAYER_SECTIONS} label="Player pages" />

      <p className="text-sm text-muted-foreground">Each player&apos;s {season} fWAR with the luck on contact taken out.</p>

      <XwarLeaderboard
        players={players}
        season={season}
        firstSeason={study.first_season}
        regular={{ hitters: hitter.min_balls, pitchers: pitcher.min_balls }}
        runsPerWin={study.runs_per_win}
        homeRunRuns={study.home_run_runs}
        projectionSeason={projectionSeason}
      />

      <PageSection className="border-t border-rule-strong pt-6">
        <p className="type-eyebrow text-muted-foreground">Does it mean anything?</p>
        <h2 className="type-section">What repeats, and what the next season says</h2>
        <p className="text-sm text-muted-foreground">
          {lead[1] > 0
            ? "Read as xWAR, a hitter's season predicts his next fWAR better than fWAR itself does."
            : "Read as xWAR or as fWAR, a hitter's season predicts his next fWAR about equally well."}
        </p>
        <Table density="compact" className="max-w-xl">
          <TableHeader>
            <TableRow>
              <TableHead className="type-eyebrow text-muted-foreground">A hitter&apos;s season, read as</TableHead>
              <TableHead className="type-eyebrow text-right text-muted-foreground">Next season&apos;s fWAR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {READINGS.map(([key, label]) => (
              <TableRow key={key}>
                <TableCell>{label}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{r(next.r[key]).replace("+", "")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </PageSection>

      <HowGraded label="How this works">
        <p>
          fWAR pays a player for what happened. xWAR asks what the same season was worth once the bounces are taken out. Both
          look back at a season already played. During a season, a player whose xWAR runs ahead of his fWAR has played
          better than his results, and the rest of his year is more likely to look like the xWAR. The forecast of next
          season is a different number: the projected WAR from the grade model on the{" "}
          <Link href="/mlb/players" className="text-primary underline underline-offset-4">Grades</Link> page, which also
          reads age, playing time and earlier seasons.
        </p>
        <p>
          Hitters: every tracked ball in play is compared with what its exit velocity, its launch angle and the hitter&apos;s
          sprint speed called for, in runs, with the park taken out. That season total is his gap. The part his own record
          since {study.first_season} supports is kept, recent seasons counting for more; the rest is removed from his fWAR at
          the season&apos;s runs per win. Strikeouts, walks, fielding, baserunning and position stay as fWAR has them. The wOBA
          pair in each player&apos;s row is the same comparison in a familiar unit, before the park is taken out.
        </p>
        <p>
          Pitchers: fWAR is built on strikeouts, walks and home runs, so home runs are the only contact in it. The home runs a
          pitcher allowed are swapped for the home runs his contact called for, at the run cost fWAR&apos;s formula puts on a
          home run.
        </p>
        <p>
          Regulars are players with {hitter.min_balls} or more tracked balls in play, the sample the repeat was measured on.
          A two-way player has one xWAR for his whole season and appears on both lists.
        </p>
        <p>
          A hitter&apos;s gap between his results and his contact partly repeats: over {formatNumber(hitter.pairs, 0)} pairs of
          seasons it correlates {range(hitter.repeat)} with itself a year later, and {range(hitter.held_back.repeat)} on the
          later seasons kept back to check. That is why he keeps a share of it.{" "}
          {pitcher.kept
            ? `A pitcher's home runs against expected repeat too, at ${range(pitcher.repeat)}, so he keeps a share as well.`
            : `A pitcher's home runs against expected did not clearly repeat, at ${range(pitcher.repeat)}, so all of that gap is treated as luck.`}
        </p>
        <p>
          The table is the correlation of each number per 600 plate appearances with the same hitter&apos;s hitting fWAR per 600 the next
          season, over {formatNumber(next.pairs, 0)} pairs with {next.min_pa} or more plate appearances in both, on the seasons
          kept back while the method was designed. xWAR minus fWAR is {range(lead)}, with a 95% interval from resampling
          hitters:{" "}
          {lead[1] > 0 ? "a lead that clears chance." : "a lead no larger than chance allows, so read the two as level."}
        </p>
      </HowGraded>
    </PageShell>
  );
}
