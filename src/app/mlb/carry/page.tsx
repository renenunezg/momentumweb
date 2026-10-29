import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { PageDescription, PageHeader, PageSection, PageShell, PageTitle } from "@/components/page-layout";
import { KpiCard } from "@/components/kpi-card";
import { LastUpdated } from "@/components/last-updated";
import {
  CarryDistribution,
  CarryRepeat,
  ChangerBars,
  EveryBall,
  ExplainedBars,
  ParkCarry,
  SidespinBars,
  SpinCurve,
  TiltCarry,
} from "@/components/mlb-carry-charts";
import { CarryLeaderboard } from "@/components/mlb-carry-leaderboard";
import { CarryMinors } from "@/components/mlb-carry-minors";
import { PlayerHeadshot } from "@/components/player-headshot";
import { SwingHoopPair } from "@/components/mlb-swing-hoop-pair";
import { SwingLab } from "@/components/mlb-swing-lab";
import { fetchCarry, type CarryHitterRow, type SwingTypeRow } from "@/lib/mlb-carry";
import { mlbPlayerHeadshotUrl } from "@/lib/player-headshots";

export const revalidate = 3600;

const QUALIFIED = 80;
const SECTIONS = [
  { id: "puzzle", label: "The puzzle" },
  { id: "skill", label: "Is it real?" },
  { id: "air", label: "The air" },
  { id: "spin", label: "Spin" },
  { id: "swing", label: "The swing" },
  { id: "explained", label: "How much it explains" },
  { id: "types", label: "Swing types" },
  { id: "changers", label: "Changers" },
  { id: "lab", label: "Swing lab" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "minors", label: "Minors" },
];

export async function generateMetadata(): Promise<Metadata> {
  const { study } = await fetchCarry();
  return {
    title: `MLB Batted-Ball Carry ${study?.season ?? ""}`.trim(),
    description:
      "Why some hitters' fly balls travel farther than others hit just as hard at the same angle: the air, the spin, and the swing that puts it there, with a lab for changing any hitter's swing.",
  };
}

const signed = (v: number, d = 1) => `${v > 0 ? "+" : v < 0 ? "-" : ""}${Math.abs(v).toFixed(d)}`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const rate = (v: number) => v.toFixed(3).replace(/^0/, "");

function Section({ id, title, question, children }: { id: string; title: string; question: string; children: ReactNode }) {
  return (
    <PageSection id={id} className="scroll-mt-6 border-t border-rule-strong pt-6">
      <p className="type-eyebrow text-muted-foreground">{question}</p>
      <h2 className="type-section">{title}</h2>
      {children}
    </PageSection>
  );
}

function Prose({ children }: { children: ReactNode }) {
  return <div className="max-w-3xl space-y-3 text-sm leading-relaxed">{children}</div>;
}

// The carry trade-off in three numbers: distance, ground balls, home runs.
const PHONE_TYPE_COLUMNS = new Set(["Carry", "Grounders", "HR per 600"]);

function TypeTable({ rows, caption }: { rows: SwingTypeRow[]; caption: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm sm:min-w-[34rem]">
        <caption className="pb-2 text-left text-xs text-muted-foreground">{caption}</caption>
        <thead>
          <tr className="type-eyebrow text-left text-muted-foreground">
            <th className="py-1 font-normal">Type</th>
            {["Hitters", "Carry", "Grounders", "BA / OBP / SLG", "OPS", "HR per 600", "K per 600"].map((h) => (
              <th key={h} className={cn("py-1 text-right font-normal", !PHONE_TYPE_COLUMNS.has(h) && "hidden sm:table-cell")}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.type} className="border-t border-border font-mono tabular-nums">
              <td className="py-1.5 font-sans">
                {r.type}
                <span className="ml-1 text-xs text-muted-foreground">
                  {r.lo == null ? `under ${r.hi}°` : r.hi == null ? `${r.lo}°+` : `${r.lo}–${r.hi}°`}
                </span>
              </td>
              <td className="hidden py-1.5 text-right sm:table-cell">{r.n}</td>
              <td className="py-1.5 text-right">{signed(r.carry)} ft</td>
              <td className="py-1.5 text-right">{pct(r.gb)}</td>
              <td className="hidden py-1.5 text-right sm:table-cell">{rate(r.ba)} / {rate(r.obp)} / {rate(r.slg)}</td>
              <td className="hidden py-1.5 text-right sm:table-cell">{rate(r.ops)}</td>
              <td className="py-1.5 text-right">{r.hr600.toFixed(0)}</td>
              <td className="hidden py-1.5 text-right sm:table-cell">{r.so600.toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function yearPairs(hitters: CarryHitterRow[]) {
  const byKey = new Map(hitters.map((h) => [`${h.player_id}-${h.season}`, h]));
  return hitters
    .filter((h) => h.n_air >= QUALIFIED)
    .flatMap((h) => {
      const next = byKey.get(`${h.player_id}-${h.season + 1}`);
      return next && next.n_air >= QUALIFIED ? [{ name: h.player_name, x: h.carry, y: next.carry, season: h.season }] : [];
    });
}

export default async function MlbCarryPage() {
  const { study, hitters, minors, updatedAt } = await fetchCarry();
  if (!study) {
    return (
      <PageShell>
        <PageTitle>Carry</PageTitle>
        <p className="text-muted-foreground">The carry study has not been published yet.</p>
      </PageShell>
    );
  }

  const season = study.season;
  const current = hitters.filter((h) => h.season === season);
  const qualified = current.filter((h) => h.n_air >= QUALIFIED);
  const names = new Map(hitters.map((h) => [h.player_id, h.player_name]));
  // The pipeline lists the two best-carrying hitters' balls, then the two worst (worst first).
  const best = study.puzzle.balls[0];
  const worst = study.puzzle.balls[2];
  const ranked = [...qualified].sort((a, b) => b.carry - a.carry);
  const top = ranked[0];
  const bottom = ranked[ranked.length - 1];
  const marks = [ranked[0], ranked[1], ranked[ranked.length - 2], ranked[ranked.length - 1]].filter(Boolean);
  const highlight = new Set(marks.map((h) => h.player_name));
  const mean = (points: [number, number][]) => points.reduce((sum, [expected, actual]) => sum + actual - expected, 0) / points.length;
  const everyBall = Object.entries(study.puzzle.every_ball)
    .map(([id, points]) => ({ name: names.get(Number(id)) ?? id, points }))
    .sort((a, b) => mean(b.points) - mean(a.points));
  const pairs = yearPairs(hitters).filter((p) => p.season === season - 1);
  const flat = [...qualified].filter((h) => h.tilt != null).sort((a, b) => (a.tilt ?? 0) - (b.tilt ?? 0));
  const coors = study.air.parks.find((p) => p.venue === "Coors Field");
  const curve = study.spin_curve;
  const at = (rpm: number) => curve.league[curve.rpm.indexOf(rpm)];
  const peakRpm = curve.rpm[curve.league.indexOf(Math.max(...curve.league))];
  const ex = study.explained;
  const tiltGroups = study.changers.groups;
  const steepened = tiltGroups[tiltGroups.length - 1];
  const flattened = tiltGroups[0];

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>Carry</PageTitle>
          <PageDescription className="type-eyebrow">Through the {season} season</PageDescription>
        </div>
        <LastUpdated timestamp={updatedAt} schedule="Updates each offseason" />
      </PageHeader>

      <nav aria-label="Sections" className="type-eyebrow flex flex-wrap gap-x-4 gap-y-1.5 text-muted-foreground">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="hover:text-foreground">{s.label}</a>
        ))}
      </nav>

      <Prose>
        <p>
          Exit velocity and launch angle say how a ball left the bat. They do not say how far it will fly: two balls struck alike can land
          dozens of feet apart, and some hitters come out ahead all season. This study measures that carry, separates what the air does from
          what the hitter does, and traces the hitter&apos;s part back through spin to the swing.
        </p>
      </Prose>

      <div className="grid grid-cols-3 gap-3 border-y border-rule-strong [&>div]:py-3 sm:gap-4">
        <KpiCard compact label="Most carry" value={top?.player_name ?? "–"} sub={top ? `${signed(top.carry)} ft per ball` : ""}
          tooltip="Average feet beyond the league distance for the same exit velocity, launch angle, direction, ballpark and month; hitters with 80+ balls in the air." />
        <KpiCard compact label="Repeatable" value={`r = ${study.repeatability.full_season.toFixed(2)}`} sub="estimated full-season reliability"
          tooltip={`One half of a hitter's season predicts the other half at ${study.repeatability.split_half.toFixed(2)}; scaled to a full season (Spearman-Brown) that is ${study.repeatability.full_season.toFixed(2)}.`} />
        <KpiCard compact label="Swing physics explains" value={pct(ex.share)} sub={`${pct(ex.ceiling)} ceiling`}
          tooltip={`Share of the differences between hitters' season carry that the swing's collision and flight physics predicts in a season it was not fit on. Sampling noise caps any model near ${pct(ex.ceiling)} of the same variance, so the swing covers ${pct(ex.share / ex.ceiling)} of what is explainable.`} />
      </div>

      <Section id="puzzle" question="The puzzle" title="Same exit velocity, same launch angle, different distance">
        {best && worst && (
          <div className="grid gap-3 sm:grid-cols-2">
            {[best, worst].map((b) => (
              <div key={`${b.player_id}-${b.date}`} className="rounded-md border border-border p-4">
                <div className="flex items-center gap-2.5">
                  <PlayerHeadshot name={names.get(b.player_id) ?? ""} src={mlbPlayerHeadshotUrl(b.player_id)} className="h-10 w-10" />
                  <div>
                    <p className="text-sm font-medium">{names.get(b.player_id)}</p>
                    <p className="font-mono text-xs text-muted-foreground">{b.date} · {b.exit} mph at {b.launch}°</p>
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl tabular-nums">{b.distance} ft</p>
                <p className="text-xs text-muted-foreground">
                  League average for that contact: {b.expected} ft ({signed(b.distance - b.expected, 0)} ft)
                </p>
              </div>
            ))}
          </div>
        )}
        <Prose>
          <p>
            One ball proves nothing; a single fly ball varies by about 20 feet either way. The pattern across a season does. Every ball{" "}
            {everyBall.map((s) => s.name).join(" and ")} hit in the air in {season}, against what the league averages for the same contact:
          </p>
        </Prose>
        <EveryBall series={everyBall} />
      </Section>

      <Section id="skill" question="Is it real?" title="Carry is a repeatable hitter skill">
        <Prose>
          <p>
            Among {qualified.length} hitters with {QUALIFIED}+ balls in the air, one half of a season predicts the other at{" "}
            {study.repeatability.split_half.toFixed(2)}, which puts a full season&apos;s reliability near {study.repeatability.full_season.toFixed(2)},
            and one season predicts the next at {study.repeatability.year_to_year.toFixed(2)}.
            Here carry also removes the ballpark, the month, and the direction of the ball, so a hitter&apos;s home park and summer air
            do not count as his.
          </p>
        </Prose>
        <CarryDistribution values={qualified.map((h) => h.carry)} marks={marks.map((h) => ({ name: h.player_name, carry: h.carry }))} />
        <CarryRepeat pairs={pairs} highlight={highlight} />
      </Section>

      <Section id="air" question="What does the air do?" title="Thin air, warm air">
        <Prose>
          <p>
            A ball flies farther where the air is thinner: high elevation and heat. The flight model, built from published drag and lift
            measurements, predicts {Math.abs(study.air.ft_per_density_model).toFixed(0)} feet per unit of air density (kg/m³); the
            data measure {Math.abs(study.air.ft_per_density_measured).toFixed(0)}.
            {coors && ` At Coors Field balls carry ${signed(coors.measured)} feet against the league, and its air alone accounts for ${signed(coors.air)}.`}{" "}
            The posted game-time wind, by contrast, barely registers in the data: about 0.5 feet per m/s of tailwind where the flight model expects 5 to 10, so it is left out.
          </p>
        </Prose>
        <ParkCarry parks={study.air.parks} />
      </Section>

      <Section id="spin" question="How does spin move a fly ball?" title="Backspin lifts, sidespin bends">
        <Prose>
          <p>
            A ball with backspin pushes air down behind it and is pushed up in return, the same lift that keeps a golf ball aloft. For a{" "}
            {curve.exit} mph fly ball at {curve.launch}°, going from no backspin to 1,000 rpm adds {at(1000) - at(0)} feet. Past about{" "}
            {peakRpm.toLocaleString()} rpm more spin adds nothing, and the drag the spin creates starts to cost distance. Because the curve
            flattens, a ball short of typical backspin loses far more carry than a ball with extra backspin gains.
          </p>
        </Prose>
        <SpinCurve curve={curve} />
        <Prose>
          <p>
            Spin that is tilted off pure backspin sends part of the lift sideways: pulled balls hook toward the pull-side line and
            opposite-field balls slice toward the other, and the ball comes down sooner.
          </p>
        </Prose>
        <SidespinBars rows={study.sidespin} />
      </Section>

      <Section id="swing" question="Where does the spin come from?" title="The swing: plane tilt and attack angle">
        <Prose>
          <p>
            Spin is made in the collision. When the bat strikes slightly below the ball&apos;s center, the ball rolls back off the barrel with
            backspin. Bat tracking measures two angles that set where that contact happens. Swing path tilt is how slanted the barrel&apos;s
            loop around the hitter is: a flat plane keeps the barrel near one height through the zone, a steep one drops it to the ball and
            back up. Attack angle is whether the barrel is rising or falling at the instant of contact, seen from the side.
          </p>
          <p>
            Solving each collision from the pitch, the measured swing and the launch gives every ball an estimated spin. The collision
            efficiency it implies comes out at {study.collision.efficiency.toFixed(2)}, in line with the physics literature, without being
            tuned to. Hitters with flatter planes carry more:
          </p>
        </Prose>
        {flat.length > 1 && <SwingHoopPair flat={flat[0]} steep={flat[flat.length - 1]} />}
        <TiltCarry points={qualified.filter((h) => h.tilt != null).map((h) => ({ name: h.player_name, x: h.tilt!, y: h.carry }))} highlight={highlight} />
      </Section>

      <Section id="explained" question="How much does the swing explain?" title="A bit over half, and an open question">
        <Prose>
          <p>
            Measured swing physics predicts {pct(ex.share_without_steep_correction)}{" "}of hitters&apos; carry differences in a season it was
            not fit on. Steep swings carry less than their measured attack angle implies, consistent with a steep barrel still rising faster
            at contact than it is measured just before; correcting for it, on the same hitters and the same carry, lifts the share to{" "}
            {pct(ex.share)}. Sampling noise caps any model near {pct(ex.ceiling)} of that same variance, so the swing accounts for about{" "}
            {pct(ex.share / ex.ceiling)} of the carry that is explainable at all.
          </p>
          <p>
            The rest is not all noise: what physics leaves unexplained still repeats from one season to the next (r ={" "}
            {ex.leftover_year_to_year.toFixed(2)}), concentrated on low line drives, and it lines up with no swing measurement Statcast
            publishes. Where on the barrel the ball is struck, the bat itself, and the hand path are candidates public data cannot see.
          </p>
        </Prose>
        <ExplainedBars explained={ex} />
      </Section>

      <Section id="types" question="What do swing types produce?" title="Carry against everything else">
        <Prose>
          <p>
            Level swings carry farthest and miss least, but they put more balls on the ground. Uppercuts trade carry and contact for fly
            balls and home runs. Hitter-seasons {study.swing_types.seasons.join(", ")}, at a belt-high pitch.
          </p>
        </Prose>
        <TypeTable rows={study.swing_types.attack} caption="By attack angle" />
        <TypeTable rows={study.swing_types.tilt} caption="By swing path tilt" />
      </Section>

      <Section id="changers" question="What happens when hitters change?" title="Hitters who changed their swing plane">
        <Prose>
          <p>
            Comparing each hitter with himself a season later: those who flattened by 1.5° or more gained {signed(flattened.carry)} feet of
            carry and {signed(flattened.ops * 1000, 0)} points of OPS against hitters who held steady; those who steepened by as much changed
            by {signed(steepened.carry)} feet and {signed(steepened.ops * 1000, 0)} points. These are natural changes measured against hitters who held steady, not experiments: a hitter who
            steepens after a poor season would be expected to rebound somewhat regardless. Carry follows the swing; production follows
            something more.
          </p>
        </Prose>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ChangerBars groups={tiltGroups} outcome="carry" label="Carry (ft)" />
          <ChangerBars groups={tiltGroups} outcome="ops" label="OPS (points)" />
          <ChangerBars groups={tiltGroups} outcome="hr600" label="HR per 600 PA" />
          <ChangerBars groups={tiltGroups} outcome="so600" label="K per 600 PA" />
        </div>
        <p className="text-xs text-muted-foreground">Groups from left: {tiltGroups.map((g) => `${g.group} (${g.n})`).join(", ")}.</p>
      </Section>

      <Section id="lab" question="Try it" title="Swing lab">
        <Prose>
          <p>
            Pick a hitter or a generic one and change his swing. Carry comes from rerunning the collision and flight physics on his own
            batted balls with each ball&apos;s contact held fixed; the season line comes from the hitters who changed.
          </p>
        </Prose>
        <SwingLab study={{ season, lab: study.lab, swing_types: study.swing_types, changers: { coefficients: study.changers.coefficients } }} hitters={current} />
      </Section>

      <Section id="leaderboard" question="Every hitter" title="Carry leaderboard">
        <CarryLeaderboard hitters={current} study={{ season, swing_types: study.swing_types }} />
      </Section>

      <Section id="minors" question="Below the majors" title="Carry in Triple-A and the Florida State League">
        {/* A copy, not a reference into `study` (already sent to the lab), which the client failed to resolve. */}
        <CarryMinors rows={minors} summaries={structuredClone(study.minors)} season={season} />
      </Section>

      <Prose>
        <p className="text-xs text-muted-foreground">
          Method: regular-season Statcast from 2021 (carry) and 2024 (bat tracking). Flight uses Nathan&apos;s drag and lift coefficients (Analysis
          of Baseball Trajectories, 2017) with a fitted drag rise below about {study.physics.cd_transition_mph} mph; the collision follows Cross
          and Nathan (2006) and Kensrud, Nathan and Smith (2016). Spin is estimated, not measured: rpm figures are relative to the league. The drag rise, spin scale and steep-swing
          correction were set on 2026 batted balls and checked on 2025, after about twenty candidate explanations were screened the same way.
          {bottom && ` Least carry this season: ${bottom.player_name} (${signed(bottom.carry)} ft).`}
        </p>
      </Prose>
    </PageShell>
  );
}
