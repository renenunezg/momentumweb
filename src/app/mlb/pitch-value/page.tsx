import type { Metadata } from "next";
import { PageDescription, PageHeader, PageMeta, PageSection, PageShell, PageTitle } from "@/components/page-layout";
import { HowGraded } from "@/components/how-graded";
import { KpiCard } from "@/components/kpi-card";
import { LastUpdated } from "@/components/last-updated";
import { PitchValueLeaderboard } from "@/components/mlb-pitch-value-leaderboard";
import { MLB_PLAYER_SECTIONS, PlayerSectionTabs } from "@/components/player-section-tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchPitchValue, per100, pitchName, type PitchValueBaseline } from "@/lib/mlb-pitch-value";
import { formatNumber, formatSigned } from "@/lib/utils";

// Every read here is expired by the revalidation webhook when its table is
// published, and nothing on the page depends on the clock, so the week is only
// a backstop.
export const revalidate = 604800;

export async function generateMetadata(): Promise<Metadata> {
  const { season } = await fetchPitchValue();
  return {
    title: `MLB Pitch Run Value ${season ?? ""}`.trim(),
    description:
      "Every pitch graded by the change in expected runs it causes: runs saved per pitcher and per pitch type, with contact valued by how it was hit and park, hitter and season removed.",
  };
}

const BASELINES: [PitchValueBaseline, string][] = [["era", "ERA"], ["fip", "FIP"], ["xfip", "xFIP"]];
const r = (v: number) => v.toFixed(2).replace(/^0/, "");

export default async function MlbPitchValuePage() {
  // A failed read throws so ISR keeps the last good page.
  const { study, season, updatedAt, pitchers, types } = await fetchPitchValue();

  if (!study || season == null || pitchers.length === 0) {
    return (
      <PageShell>
        <PageTitle>Pitch Run Value</PageTitle>
        <PlayerSectionTabs sections={MLB_PLAYER_SECTIONS} label="Player pages" />
        <p className="text-muted-foreground">No pitch run values have been published yet.</p>
      </PageShell>
    );
  }

  const names = new Map(pitchers.map((p) => [p.player_id, p]));
  const top = [...pitchers].sort((a, b) => a.runs - b.runs)[0];
  // Rates are compared at twice the published minimum, where a season is long enough for the rate to mean something.
  const rateFloor = 2 * study.min_pitches;
  const sharpest = pitchers.filter((p) => p.pitches >= rateFloor).sort((a, b) => per100(a) - per100(b))[0] ?? top;
  const bestPitch = [...types].sort((a, b) => a.runs - b.runs)[0] ?? null;
  const bestPitchOwner = bestPitch ? names.get(bestPitch.player_id) : undefined;

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>Pitch Run Value</PageTitle>
          <PageMeta>
            <PageDescription className="type-eyebrow">Through the {season} season</PageDescription>
            <LastUpdated timestamp={updatedAt} schedule="Updates each offseason" />
          </PageMeta>
        </div>
      </PageHeader>
      <PlayerSectionTabs sections={MLB_PLAYER_SECTIONS} label="Player pages" />

      <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">
        Every pitch moves the inning&apos;s expected runs up or down. Add those moves up and you get the runs a pitcher saved or gave
        away, one pitch at a time and one pitch type at a time. Negative is better for the pitcher. This describes where a
        season&apos;s runs came from; the projection of what comes next is the grade on the Grades tab.
      </p>

      <div className="grid grid-cols-3 gap-3 border-y border-rule-strong [&>div]:py-3 sm:gap-4">
        <KpiCard
          compact
          label="Most runs saved"
          value={top.player_name}
          sub={`${top.team} · ${formatSigned(top.runs, 1)} runs`}
          tooltip="The lowest total against the league average this season."
        />
        <KpiCard
          compact
          label="Best per 100"
          value={sharpest.player_name}
          sub={`${sharpest.team} · ${formatSigned(per100(sharpest), 2)} per 100`}
          tooltip={`The lowest runs per 100 pitches among pitchers with ${formatNumber(rateFloor, 0)} or more pitches.`}
        />
        <KpiCard
          compact
          label="Best pitch"
          value={bestPitch && bestPitchOwner ? `${bestPitchOwner.player_name}` : "–"}
          sub={bestPitch && bestPitchOwner ? `${pitchName(bestPitch.pitch_type)} · ${formatSigned(bestPitch.runs, 1)} runs` : "no pitch types"}
          tooltip="The single pitch type that saved the most runs this season."
        />
      </div>

      <PitchValueLeaderboard
        pitchers={pitchers}
        types={types}
        season={season}
        minimums={{ pitchers: study.min_pitches, types: study.min_type_pitches }}
      />

      <PageSection className="border-t border-rule-strong pt-6">
        <p className="type-eyebrow text-muted-foreground">Does it mean anything?</p>
        <h2 className="type-section">Against next season&apos;s runs allowed</h2>
        <p className="max-w-3xl text-sm leading-relaxed">
          One season&apos;s value says more about the next season&apos;s runs allowed than ERA does, and about as much as FIP and
          xFIP. It runs a little ahead of both at every sample size, but not by more than chance allows, so read it as level with
          them.
        </p>
        <Table density="compact" className="max-w-3xl">
          <TableHeader>
            <TableRow>
              <TableHead className="type-eyebrow text-muted-foreground">Innings, both seasons</TableHead>
              <TableHead className="type-eyebrow hidden text-right text-muted-foreground sm:table-cell">Pairs</TableHead>
              {BASELINES.map(([key, label]) => (
                <TableHead key={key} className="type-eyebrow text-right text-muted-foreground">{label}</TableHead>
              ))}
              <TableHead className="type-eyebrow text-right text-muted-foreground">Pitch value</TableHead>
              <TableHead className="type-eyebrow hidden text-right text-muted-foreground sm:table-cell">Lead over FIP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {study.validation.map((cut) => (
              <TableRow key={cut.innings}>
                <TableCell>{cut.innings}+</TableCell>
                <TableCell className="hidden text-right font-mono tabular-nums sm:table-cell">{formatNumber(cut.pairs, 0)}</TableCell>
                {BASELINES.map(([key]) => (
                  <TableCell key={key} className="text-right font-mono tabular-nums">{r(cut.r[key])}</TableCell>
                ))}
                <TableCell className="text-right font-mono tabular-nums">{r(cut.r.value)}</TableCell>
                <TableCell className="hidden whitespace-nowrap text-right font-mono tabular-nums sm:table-cell">
                  {formatSigned(cut.lead.fip[0], 2)} ({formatSigned(cut.lead.fip[1], 2)} to {formatSigned(cut.lead.fip[2], 2)})
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Correlation of each first-season number with runs allowed per nine innings the next season, {study.seasons[0]} to{" "}
          {study.seasons[study.seasons.length - 1]}.
          <span className="hidden sm:inline"> The lead is pitch value minus FIP with a 95% interval from resampling pitchers.</span>
        </p>
      </PageSection>

      <HowGraded label="How this works">
        <p>
          Method: regular-season Statcast, {study.seasons[0]} to {study.seasons[study.seasons.length - 1]}, {formatNumber(study.pitches, 0)} pitches.
          Run expectancy is measured for all 288 combinations of count, bases and outs. A pitch is worth the expectancy after it,
          minus the expectancy before it, plus any runs that scored. A ball in play is charged what its exit velocity and launch
          angle were worth across the league, not what the fielders made of it. Each pitch is then valued at its average over
          bases and outs, so a strikeout counts the same with the bases loaded as with them empty, and the park, the hitter faced
          and the season&apos;s scoring level are removed.
        </p>
        <p>
          A pitch type&apos;s value depends on the counts it is thrown in, and over a few hundred pitches it is mostly noise, so the
          pitch-type view opens on larger samples. Listed: pitchers with {formatNumber(study.min_pitches, 0)} or more pitches and
          pitch types with {formatNumber(study.min_type_pitches, 0)} or more.
        </p>
      </HowGraded>
    </PageShell>
  );
}
