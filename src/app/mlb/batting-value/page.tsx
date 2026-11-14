import type { Metadata } from "next";
import { PageDescription, PageHeader, PageMeta, PageShell, PageTitle } from "@/components/page-layout";
import { HowGraded } from "@/components/how-graded";
import { LastUpdated } from "@/components/last-updated";
import { BattingPartsBar, battingPartsExtent } from "@/components/mlb-batting-parts-bar";
import { BattingValueLeaderboard } from "@/components/mlb-batting-value-leaderboard";
import { BattingValueStudySection } from "@/components/mlb-batting-value-study";
import { PlayerCell } from "@/components/player-cell";
import { MLB_PLAYER_SECTIONS, PlayerSectionTabs } from "@/components/player-section-tabs";
import { BATTING_OPENING_PA, battingTotal, fetchBattingValue, formatCorrelation } from "@/lib/mlb-batting-value";
import { mlbTeamIdentity } from "@/lib/mlb-teams";
import { mlbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { formatSigned } from "@/lib/utils";

// Every read here is expired by the revalidation webhook when its table is
// published, and nothing on the page depends on the clock, so the week is only
// a backstop.
export const revalidate = 604800;

export async function generateMetadata(): Promise<Metadata> {
  const { season } = await fetchBattingValue();
  return {
    title: `MLB Batting Run Value ${season ?? ""}`.trim(),
    description:
      "Every pitch a hitter sees graded by the change in expected runs, with the difficulty of the pitch taken out and the rest split into swing decisions, contact and quality of contact.",
  };
}

export default async function MlbBattingValuePage() {
  // A failed read throws so ISR keeps the last good page.
  const { study, season, updatedAt, hitters, splits } = await fetchBattingValue();

  if (!study || season == null || hitters.length === 0) {
    return (
      <PageShell>
        <PageTitle>Batting Run Value</PageTitle>
        <PlayerSectionTabs sections={MLB_PLAYER_SECTIONS} label="Player pages" />
        <p className="text-muted-foreground">No batting run values have been published yet.</p>
      </PageShell>
    );
  }

  // The example is the hitter the leaderboard opens on.
  const regulars = hitters.filter((h) => h.pa >= BATTING_OPENING_PA);
  const top = [...(regulars.length > 0 ? regulars : hitters)].sort((a, b) => battingTotal(b) - battingTotal(a))[0];
  const pitchTypes = Object.keys(study.pitch_types.values)
    .filter((code) => splits[code])
    .sort((a, b) => splits[b].length - splits[a].length);
  const calls = study.parts.measures.call;

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>Batting Run Value</PageTitle>
          <PageMeta>
            <PageDescription className="type-eyebrow">Through the {season} season</PageDescription>
            <LastUpdated timestamp={updatedAt} schedule="Refreshed by hand after each season" />
          </PageMeta>
        </div>
      </PageHeader>
      <PlayerSectionTabs sections={MLB_PLAYER_SECTIONS} label="Player pages" />

      <figure className="border-y border-rule-strong py-4">
        <figcaption className="flex items-end justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <p className="type-meta text-muted-foreground">Most runs added, {BATTING_OPENING_PA}+ PA</p>
            <PlayerCell athleteId={String(top.player_id)} headshotUrl={mlbPlayerHeadshotUrl(top.player_id)} name={top.player_name}
              team={top.team} position={`${top.pa} PA`} logo={mlbTeamIdentity(top.team)} />
          </div>
          <p className="shrink-0 text-right">
            <span className="type-value">{formatSigned(battingTotal(top), 0)}</span>{" "}
            <span className="type-meta text-muted-foreground">runs</span>
          </p>
        </figcaption>
        <div className="mt-5">
          <BattingPartsBar parts={top} {...battingPartsExtent([top])} axis className="h-5" />
        </div>
      </figure>

      <BattingValueLeaderboard
        hitters={hitters}
        splits={splits}
        pitchTypes={pitchTypes}
        repeats={{ ...study.counts.values, ...study.pitch_types.values, ...study.directions?.values }}
        season={season}
        minimumPa={study.min_pa}
      />

      <BattingValueStudySection study={study} pitchTypes={pitchTypes} />

      <HowGraded label="How this works">
        <p>
          Method: regular-season Statcast, {study.seasons[0]} to {study.seasons[study.seasons.length - 1]}, {study.pitches.toLocaleString("en-US")} pitches.
          A pitch is worth the run expectancy after it minus the expectancy before it, averaged over bases and outs, with a ball
          in play valued by how it was hit and the hitter&apos;s speed, not by what the fielders made of it. A league model, fitted
          without the hitter being valued, prices every pitch before he acts: what taking it is worth, what swinging at it is
          worth, and what the league&apos;s mix of the two is worth. Decision is his choice against that mix. Contact is what his
          swing made of the pitch against an average swing at it. Quality is his ball in play against the league&apos;s ball in
          play from the same pitch. The park and the season&apos;s scoring level are removed from each part.
        </p>
        <p>
          Calls are called strikes and hit batters on his takes against what the model expected. They are shown but not
          credited: their link to next season&apos;s batting runs is {formatCorrelation(calls.next_runs[0])} ({formatCorrelation(calls.next_runs[1])} to{" "}
          {formatCorrelation(calls.next_runs[2])}).
        </p>
        <p>
          Counts, Pitches and Zones are the same runs on part of his pitches, and the three never cross. The directions
          under Zones do cross: inside and outside are the outer thirds of the plate from the hitter&apos;s side of it, up and
          down the outer thirds of his own strike zone, each running on past the edge, so a pitch up and in counts in both.
          Two strikes is every
          two-strike count, hitter ahead is 1-0, 2-0, 3-0, 2-1 and 3-1, and first pitch is 0-0. The counts where he is behind or
          even are not listed, because what he does there only restates his overall level. The published study checks the count
          situations, the pitch types and the directions; pitch groups and zones are listed without that check. Splits leave out the few
          pitches with no tracked location or an unusual pitch type, so they do not sum exactly to the total.
        </p>
        <p>
          Listed: hitters with {study.min_pa} or more plate appearances, and a pitch type once he has seen{" "}
          {study.min_type_pitches} of it. Runs are whole numbers and rates per 100 pitches one decimal, which is
          what a season&apos;s sample supports. The league tables and models are fitted on all the seasons at once, so the
          validation is not strictly out of sample in time.
        </p>
      </HowGraded>
    </PageShell>
  );
}
