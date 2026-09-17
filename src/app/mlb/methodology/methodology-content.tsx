import type { ReactNode } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MethodologyDistributionChart } from "@/components/methodology-distribution-chart";
import { ChangelogEntry } from "@/components/changelog-entry";

export interface DistributionGameData {
  date: string;
  home: { team: string; mean: number; p10: number; p50: number; p90: number; hist: number[] };
  away: { team: string; mean: number; p10: number; p50: number; p90: number; hist: number[] };
  homeWinProb: number;
  homeWinProbP10: number | null;
  homeWinProbP90: number | null;
  totalLine: number | null;
  totalMean: number;
  totalP10: number;
  totalP90: number;
  startTimeUtc: string | null;
}

function SectionCard({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">{children}</CardContent>
      </Card>
    </section>
  );
}

function FormulaBlock({ children }: { children: ReactNode }) {
  return (
    <div className="my-3 rounded-sm border border-border bg-muted px-4 py-3 font-mono text-sm leading-relaxed">
      {children}
    </div>
  );
}

const flowNodes = [
  {
    group: "Inputs",
    color: "border-blue-500/40 bg-blue-500/5",
    labelColor: "text-blue-400",
    items: [
      { label: "Statcast pitch data", sub: "~480k PAs, 2024+25+26-YTD" },
      { label: "MLB Stats API", sub: "Schedule, lineups, rosters, boxscores, weather" },
      { label: "The Odds API", sub: "ML, RL, totals across three books" },
      { label: "Active bullpen workload", sub: "Per-pitcher outs per day (rest)" },
    ],
  },
  {
    group: "Bayesian Skill Layer",
    color: "border-amber-500/40 bg-amber-500/5",
    labelColor: "text-amber-400",
    items: [
      { label: "Batter model", sub: "~870 batters × 2 platoon cells" },
      { label: "Pitcher model", sub: "~1,140 pitchers × 2 roles (SP/RP)" },
      { label: "Park log-PF", sub: "30 venues, residual wOBA" },
      { label: "Sampler", sub: "NUTS via numpyro/JAX, 4 chains × 2000 draws" },
    ],
  },
  {
    group: "Monte Carlo Simulator",
    color: "border-emerald-500/40 bg-emerald-500/5",
    labelColor: "text-emerald-400",
    items: [
      { label: "Per-PA outcome sampler", sub: "Vectorized over 8 categories" },
      { label: "Empirical advancement", sub: "P(state', runs | state, outs, outcome)" },
      { label: "Rest-aware bullpen", sub: "Active roster + 1d/2d workload caps" },
      { label: "30 posterior draws × ~333 sims", sub: "~10,000 simulated games per matchup" },
    ],
  },
  {
    group: "Markets & EV",
    color: "border-purple-500/40 bg-purple-500/5",
    labelColor: "text-purple-400",
    items: [
      { label: "Win probability", sub: "Sim logit anchored to de-vigged market consensus" },
      { label: "Totals & RL distributions", sub: "Pure sim quantiles" },
      { label: "Edge vs best price", sub: "4.5% on ML and RL; totals switched off" },
      { label: "Quarter-Kelly sizing", sub: "0.25 × f*, f clipped to [0, 1]" },
    ],
  },
];

const pipelineSteps = [
  { num: "01", name: "Schedule & Bullpen", desc: "Games, scores and per-pitcher workload" },
  { num: "02", name: "Lineups, Odds & Weather", desc: "Stats API lineups and weather; ML/RL/totals from The Odds API" },
  { num: "03", name: "Posterior Refit", desc: "Nightly NUTS run: pitcher, batter, park (about 15 min)" },
  { num: "04", name: "Score Games", desc: "30 posterior draws × ~333 sims, ~10,000 per matchup" },
  { num: "05", name: "Derive Markets", desc: "Win prob anchored to market consensus; RL and totals from the sims" },
  { num: "06", name: "Verify & Publish", desc: "Pairing, range, anti-correlation, posterior-age checks; write to Supabase" },
];

const backtestRows = [
  { metric: "Brier score (ML)", v1: "0.2570", v2: "0.2393", delta: "−6.88%", pass: true },
  { metric: "Log-loss (ML)", v1: "0.7244", v2: "0.6713", delta: "−7.33%", pass: true },
  { metric: "Max calibration gap", v1: "41.92%", v2: "3.20%", delta: "−38.7pp", pass: true },
  { metric: "ROI moneyline (flagged)", v1: "+15.82%", v2: "+26.25%", delta: "+10.4pp", pass: null },
  { metric: "ROI run line (flagged)", v1: "+5.04%", v2: "+14.96%", delta: "+9.9pp", pass: null },
  { metric: "ROI totals (flagged)", v1: "−12.83%", v2: "−7.58%", delta: "+5.3pp", pass: null },
];

const samplerDiagnostics = [
  { model: "Batter (869 × platoon)", rhat: "1.00", ess: "1273", divergences: "0", wall: "8.2 min" },
  { model: "Pitcher (1142 × role)", rhat: "1.00", ess: "1724", divergences: "0", wall: "6.4 min" },
  { model: "Park (30 venues)", rhat: "1.00", ess: "33.9k", divergences: "0", wall: "15 s" },
];

export function MethodologyContent({
  featured,
}: {
  featured?: DistributionGameData | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        id="overview"
        title="Project Overview"
        subtitle="Hierarchical Bayesian skill model + per-PA Monte Carlo simulator for probabilistic run prediction"
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            This model predicts a full distribution of runs per team per MLB game, then
            derives win, run-line and totals probabilities by simulating each matchup
            roughly 10,000 times. Predictions are graded daily against sportsbook lines:
            sharp bettors push lines toward true probabilities quickly, which makes the
            market a better probability signal than most models built from scratch, mine
            included. That is also why the published win probability borrows from it.
          </p>
          <p>
            The current model (v2, live since May 12, 2026) has two layers: a{" "}
            <strong>hierarchical Bayesian skill model</strong>, a multinomial-logit over
            the eight plate-appearance outcomes fit with NUTS, and a{" "}
            <strong>per-PA Monte Carlo simulator</strong> with rest-aware bullpens, an
            empirical baserunner-advancement table, weather effects, and per-game
            posterior draws that carry parameter uncertainty through. It replaced an
            XGBoost regressor (v1) after a 542-game head-to-head backtest that v2 won on
            every metric.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: "Prediction target", val: "Per-team run distribution per game" },
              { label: "Skill model", val: "Hierarchical multinomial-logit (8 outcomes), NUTS via numpyro / JAX" },
              { label: "Training data", val: "~480k PAs across 2024, 2025 and 2026 to date, growing nightly" },
              { label: "Simulator", val: "30 posterior draws × ~333 sims each (~10,000 per matchup)" },
              { label: "Probability output", val: "Sim win prob anchored to market consensus; p10/p90 bands" },
              { label: "Sizing rule", val: "Quarter-Kelly on flagged ML and RL plays; totals off" },
            ].map(({ label, val }) => (
              <Card key={label} size="sm"><CardContent>
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-sm font-medium">{val}</p>
              </CardContent></Card>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="example"
        title="Example Output: Today's Featured Game"
        subtitle="Per-team simulated run distributions, win probability band, and total runs percentiles"
      >
        {featured ? (
          <MethodologyDistributionChart
            date={featured.date}
            home={featured.home}
            away={featured.away}
            homeWinProb={featured.homeWinProb}
            homeWinProbP10={featured.homeWinProbP10}
            homeWinProbP90={featured.homeWinProbP90}
            totalLine={featured.totalLine}
            totalMean={featured.totalMean}
            totalP10={featured.totalP10}
            totalP90={featured.totalP90}
            startTimeUtc={featured.startTimeUtc}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No predictions for today yet. The chart populates each morning after the
            daily pipeline runs.
          </p>
        )}
      </SectionCard>

      <SectionCard
        id="changelog"
        title="Model Changelog"
        subtitle="Significant changes to model behavior, most recent first"
      >
        <div className="space-y-6 text-sm">
          <ChangelogEntry
            date="September 4, 2026"
            title="Moneyline flags require a paired market anchor"
          >
            A moneyline play is flagged only when at least one book quotes both sides
            of the game, so the anchored probability behind the flag always exists.
          </ChangelogEntry>

          <ChangelogEntry
            date="August 18, 2026"
            title="Published win probability anchored to the de-vigged market consensus"
          >
            Publishing the raw sim probability flagged big underdogs +EV
            systematically: dogs the market priced under 33% came out at 37% from the
            sim and won 29%. The published win probability is now a logit-scale blend of
            the sim (weight 0.2, the out-of-sample log-loss optimum on 2026 games) and
            the de-vigged consensus across the paired moneylines, plus a +0.09 home-field
            logit the sim lacks. Run-line and totals probabilities stay pure sim.
          </ChangelogEntry>

          <ChangelogEntry
            date="July 18, 2026"
            title="Weather effects in the simulator, and odds shopped across three books"
          >
            Temperature and wind now shift the outcome logits per game, with
            coefficients fit on Statcast PAs controlling for park, batter and pitcher.
            Two days later the odds feed started pulling DraftKings, FanDuel and BetMGM
            and pricing each side at the best available number.
          </ChangelogEntry>

          <ChangelogEntry
            date="May 27, 2026"
            title="Totals recommendations switched off; form noise raised to 0.18 in June"
          >
            Every totals edge bucket lost money on the 2026 backtest and model edge had
            no relationship to outcome, so totals flags are disabled. The per-game
            form-noise scalar went from 0.13 to 0.18 on June 16 after a recalibration
            against actuals.
          </ChangelogEntry>

          <ChangelogEntry
            date="May 12, 2026"
            title="v2 cutover: hierarchical Bayesian skill model + per-PA Monte Carlo simulator"
            accent="emerald"
          >
            Replaced the v1 XGBoost regressor. Backtest over 542 games (Mar 26 to May 9,
            2026): Brier −6.9%, log-loss −7.3%, max calibration gap from 41.9% down to
            3.2%, ROI improved on every market.
          </ChangelogEntry>

          <details className="group">
            <summary className="cursor-pointer select-none rounded-sm border border-border bg-muted/40 px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:bg-muted">
              See full changelog (2 older entries)
            </summary>
            <div className="mt-6 space-y-6">
              <ChangelogEntry
                date="April 20, 2026 (v1)"
                title="Raised +EV thresholds from 3% to 4.5% (ML/RL) and 6.5% (totals)"
              >
                Below the typical vig on a −110 line there is no cushion for model
                miscalibration. v2 inherited these thresholds.
              </ChangelogEntry>

              <ChangelogEntry
                date="April 2026 (v1)"
                title="Win probability switched from Poisson to negative binomial"
              >
                MLB run-scoring is overdispersed relative to Poisson. v2 needs no
                parametric assumption: win probability comes straight from the simulated
                run distributions.
              </ChangelogEntry>
            </div>
          </details>
        </div>
      </SectionCard>

      <SectionCard
        id="flow"
        title="Architecture & Daily Pipeline"
        subtitle="From pitch-level data to market probabilities: nightly refit, morning scoring, intraday lineup re-scoring"
      >
        <div className="space-y-4 text-sm">
          <p className="leading-relaxed text-muted-foreground">
            The skill layer learns slow-moving parameters from years of Statcast data and
            is refit nightly. The simulator consumes them to produce per-game run
            distributions, and the markets layer turns those into win, total and run-line
            probabilities with edge and sizing.
          </p>
          <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-stretch md:gap-0">
            {flowNodes.map((node, i) => (
              <div key={node.group} className="flex min-w-0 md:flex-1 md:flex-col">
                <div className={`rounded-sm border ${node.color} p-3 flex-1`}>
                  <p className={`mb-2 font-mono text-[10px] uppercase tracking-widest font-semibold ${node.labelColor}`}>
                    {node.group}
                  </p>
                  <ul className="space-y-1.5">
                    {node.items.map((item) => (
                      <li key={item.label}>
                        <p className="text-xs font-medium leading-tight">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-snug">{item.sub}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                {i < flowNodes.length - 1 && (
                  <>
                    <div className="flex justify-center py-1 md:hidden">
                      <span className="text-muted-foreground text-sm">↓</span>
                    </div>
                    <div className="hidden md:flex md:items-center md:justify-center md:w-6 md:shrink-0">
                      <span className="text-muted-foreground text-sm">→</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <p className="leading-relaxed text-muted-foreground">
            A full NUTS refit runs nightly on GitHub Actions (~4 AM PT) and, on success,
            triggers the scoring run, so scoring always uses fresh posteriors. From about
            5 AM to 7:40 PM PT a lineup refresh fires every 20 minutes and re-scores any
            game whose posted lineup changed. A midnight job grades yesterday&apos;s
            games.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            Predictions track lineups, scratches and late odds up to first pitch. Once a
            game starts its row is frozen, and that final pregame value is what gets
            graded. A flag shown in the morning can disappear if a re-score drops the
            edge below threshold; it is then removed from the history and from model
            evaluation too. A flag also requires a known starter, a fully posted lineup
            and enough pitching-usage evidence: a game scored on a fallback lineup is a
            No Play regardless of edge.
          </p>

          <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-0">
            {pipelineSteps.map((step, i) => (
              <div key={step.num} className="flex min-w-0 md:flex-1 md:flex-col">
                <div className="flex md:flex-col md:items-center">
                  <div className="flex flex-col md:items-center">
                    <div className="flex min-w-0 items-start gap-3 md:flex-col md:items-center md:gap-1">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-mono text-xs text-muted-foreground">
                        {step.num}
                      </span>
                      <div className="min-w-0 md:text-center">
                        <p className="font-medium leading-tight">{step.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground leading-snug md:mx-auto md:max-w-[140px]">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                  {i < pipelineSteps.length - 1 && (
                    <div className="ml-3.5 mt-1 mb-1 h-4 w-px bg-border md:ml-0 md:mt-2 md:mb-0 md:hidden" />
                  )}
                </div>
                {i < pipelineSteps.length - 1 && (
                  <div className="hidden md:flex md:flex-1 md:items-start md:justify-center md:pt-3.5">
                    <span className="text-muted-foreground">→</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="leading-relaxed text-muted-foreground">
            The stack is Python throughout: PyMC describes the models, numpyro and JAX
            sample them, NumPy runs the vectorized simulator, and GitHub Actions plus
            Supabase pg_cron schedule everything. Results land in Supabase (Postgres),
            which is the only thing this Next.js site reads.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        id="skill"
        title="Bayesian Skill Layer"
        subtitle="Hierarchical multinomial-logit per actor, fit with NUTS in numpyro/JAX"
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            Each plate appearance is a categorical draw over eight outcomes: strikeout,
            walk, hit-by-pitch, single, double, triple, home run, in-play out. Three
            hierarchical models learn the additive log-odds offsets that each actor
            (batter, pitcher, venue) contributes to those logits, with{" "}
            <span className="font-mono">OUT</span> as the reference category. The pitcher
            model fits first and sets the league intercept; the batter model then fits
            with that intercept frozen, so there is one baseline, not two competing
            ones. Working on the log-odds scale makes platoon, role, park and weather
            effects simple additive terms.
          </p>

          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Generative model (batter, schematic)
          </p>
          <FormulaBlock>
            μ ~ Normal(logit<sub>league</sub>, 0.5)<sub>7</sub>{"  "}{"//"} per-outcome league intercept
            <br />
            σ<sub>b</sub> ~ HalfNormal(0.6)<sub>7</sub>{"  "}{"//"} batter-level scale per outcome
            <br />
            z<sub>i</sub> ~ Normal(0, 1)<sub>7</sub>{"  "}{"//"} non-centered batter offsets
            <br />
            β<sub>i</sub> = μ + σ<sub>b</sub> ⊙ z<sub>i</sub>{"  "}{"//"} batter i&apos;s log-odds vector
            <br />
            π<sub>i</sub> = softmax([0, β<sub>i</sub>])
            <br />
            y<sub>i</sub> ~ Multinomial(n<sub>i</sub>, π<sub>i</sub>){"  "}{"//"} aggregated per-batter PA counts
          </FormulaBlock>

          <p>
            Two implementation choices matter at this scale. The parameterization is
            non-centered, which avoids Neal&apos;s funnel, the distorted posterior
            geometry that stalls HMC on hierarchical models. And the likelihood is a
            Multinomial over each actor&apos;s aggregated outcome counts, which is
            mathematically identical to a per-PA Categorical but roughly 400× faster on
            400k PAs (about 3 minutes against a projected 19 hours).
          </p>
          <p>
            Batters are fit per <span className="font-mono">(batter, vs_LHP)</span> cell, with
            the platoon offset given its own tighter prior (HalfNormal(0.3)); pitchers per{" "}
            <span className="font-mono">(pitcher, role ∈ {`{SP, RP}`})</span>, with no
            platoon split. Position players who pitch in blowouts are dropped from the
            pitcher pool, with true two-way players exempted.
          </p>
          <p>
            Park is fit last, on the residual wOBA after batter and pitcher effects. A
            per-venue scalar <span className="font-mono">park_log[v]</span> shifts the
            non-OUT logits, weighted by each outcome&apos;s wOBA coefficient, so HR and 3B
            move most under park and K, whose wOBA weight is zero, does not move at all.
          </p>

          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Sampler diagnostics (4 chains, 2000 draws, 2500 tune)
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">R-hat</TableHead>
                <TableHead className="text-right">min ESS</TableHead>
                <TableHead className="text-right">Divergences</TableHead>
                <TableHead className="text-right">Wall</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {samplerDiagnostics.map((row) => (
                <TableRow key={row.model}>
                  <TableCell className="font-mono text-xs">{row.model}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{row.rhat}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{row.ess}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{row.divergences}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{row.wall}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground">
            R-hat near 1.00 means the chains mixed and sample the same posterior.
            Effective sample size (ESS) is how many independent draws the autocorrelated
            chains are worth. The gate is R-hat ≤ 1.01 and minimum ESS &gt; 400.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        id="simulator"
        title="Per-PA Monte Carlo Simulator"
        subtitle="30 posterior draws × ~333 sims per draw, propagating parameter uncertainty"
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            For each game I draw 30 posterior samples and run about 333 simulations per
            draw, roughly 10,000 per matchup. Every draw is a coherent realization of all
            batter, pitcher and park parameters together, so the spread across draws is
            parameter uncertainty and the spread within a draw is ordinary run-scoring
            noise.
          </p>

          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Per-PA outcome sampler (vectorized)
          </p>
          <FormulaBlock>
            ℓ<sub>k</sub> = μ<sub>k</sub> + batter_offset[b] + vs_LHP · platoon_offset[b] + pitcher_offset[p, role]
            <br />
            {"     "}+ park_log[v] · wOBA_weight<sub>k</sub>
            <br />
            {"     "}+ weather_shift<sub>k</sub>(temp, wind)
            <br />
            {"     "}+ form_noise<sub>k</sub>{"  "}{"//"} sigma = 0.18, per team per game, zero-sum across outcomes
            <br />
            π = softmax([0, ℓ<sub>1..7</sub>])
            <br />
            outcome ~ Categorical(π)
          </FormulaBlock>
          <p className="text-xs text-muted-foreground">
            Indices: batter <span className="font-mono">b</span>, pitcher{" "}
            <span className="font-mono">p</span>, role ∈ {"{SP, RP}"}, venue{" "}
            <span className="font-mono">v</span>, outcome <span className="font-mono">k ∈ 1..7</span>{" "}
            (K, BB, HBP, 1B, 2B, 3B, HR; OUT is the reference 0 logit).
          </p>

          <p>
            On contact, baserunners move according to an{" "}
            <strong>empirical advancement table</strong> built from 365k Statcast PAs:{" "}
            <span className="font-mono">P(new_state, runs_scored, outs_added | state, outs, outcome, out_subtype)</span>.
            Cells with fewer than 100 observations are shrunk toward the
            outcome-level marginal in proportion to their count. HR, BB and HBP advances
            are deterministic forced moves.
          </p>

          <p>
            Bullpen management is rest-aware. Starters are pulled after 24 batters faced
            (roughly 95 pitches), or earlier after 18 outs, after 6 runs allowed, or
            after 12 outs with 4 or more runs allowed. Relievers come from the active
            26-man roster, most rested first, and any reliever with{" "}
            <span className="font-mono">≥ 6 outs yesterday</span> or{" "}
            <span className="font-mono">≥ 9 outs in the last 2 days</span> is skipped.
            Workloads are refreshed daily from MLB boxscores.
          </p>

          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Variance decomposition (per-game total runs)
          </p>
          <FormulaBlock>
            Var(total_runs) = Var<sub>posterior</sub>(parameter draws)
            <br />
            {"             "}+ Var<sub>form</sub>(per-game form noise, σ=0.18)
            <br />
            {"             "}+ Var<sub>aleatoric</sub>(inning-level sim noise)
          </FormulaBlock>
          <p className="text-xs text-muted-foreground">
            The form-noise scalar is calibrated against actual game outcomes, never
            against market backtests: that would mask modeling errors as noise.
          </p>

          <p className="text-muted-foreground">
            The pre-cutover shape check replayed 200 stratified 2025 games: simulated
            mean runs per team-game came out 4.59 against an actual 4.38 (+4.86%), and
            simulated variance 9.72 against 10.32 (−5.86%). The model is mildly
            underdispersed, so blowouts and large totals get a little less probability
            than they should, which is part of why totals are off.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        id="markets"
        title="From Simulated Runs to Market Probabilities"
        subtitle="Empirical frequencies over the simulated games, a market anchor on the moneyline, and quarter-Kelly sizing"
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            Market probabilities are counted directly from the simulated games, with no
            Poisson or negative binomial assumption on top. With{" "}
            <span className="font-mono">h<sub>i</sub></span>,{" "}
            <span className="font-mono">a<sub>i</sub></span> the home and away runs in sim{" "}
            <span className="font-mono">i = 1..N</span>:
          </p>

          <FormulaBlock>
            P(home wins) = (1/N) · Σ<sub>i</sub> 𝟙[h<sub>i</sub> &gt; a<sub>i</sub>]
            <br />
            P(total &gt; L) = (1/N) · Σ<sub>i</sub> 𝟙[h<sub>i</sub> + a<sub>i</sub> &gt; L]
            <br />
            P(home covers s<sub>h</sub>) = (1/N) · Σ<sub>i</sub> 𝟙[h<sub>i</sub> − a<sub>i</sub> &gt; −s<sub>h</sub>]
            <br />
            <span className="text-muted-foreground">
              s<sub>h</sub> is the book&apos;s home spread (−1.5 means home must win by
              2 or more). Only ±1.5 run lines are compared. Pushes split 50/50 at
              integer lines.
            </span>
          </FormulaBlock>

          <p>
            The published moneyline number is not the raw sim. Each book&apos;s two
            moneylines are de-vigged as a pair and averaged into a market consensus. The
            sim&apos;s home logit gets a +0.09 home-field shift it does not produce on
            its own, then is blended with the consensus at weight 0.2 on the sim, the
            out-of-sample log-loss optimum on 2026 games. The raw sim flagged big
            underdogs as +EV all season, and they did not win at the rate it said.
            Run-line and totals probabilities are still pure sim. A game with no paired
            moneyline publishes the shifted sim probability and gets no moneyline flag.
          </p>

          <p>
            The <strong>p10/p90 win-probability band</strong> is computed per posterior
            draw: each of the 30 draws yields a win probability, and the band is the p10
            and p90 of those, pushed through the same anchoring map. It measures
            parameter uncertainty about the win rate, separate from run-scoring noise.
          </p>

          <p>
            A moneyline or run-line play is flagged when the modeled probability beats
            the implied probability of the best available price by at least 4.5
            points. Totals carried a 6.5-point bar but are switched off entirely.
            Sizing uses the Kelly criterion:
          </p>
          <FormulaBlock>
            f* = (p · b − q) / b{"  "}{"//"} p = model prob, q = 1−p, b = decimal odds − 1
            <br />
            stake = 0.25 · clip(f*, 0, 1){"  "}{"//"} quarter-Kelly
          </FormulaBlock>
          <p className="text-muted-foreground">
            Full Kelly maximizes long-run growth but draws down hard on losing streaks,
            and model probabilities are only estimates; quarter-Kelly trades some growth
            for a much tighter drawdown. A high-variance flag marks games where a
            team&apos;s simulated runs stdev exceeds 4.0.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        id="backtest"
        title="Head-to-Head Backtest vs Frozen v1"
        subtitle="542 games, March 26 to May 9, 2026. v2 wins on every metric."
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            Before cutover, v2 was benchmarked against a pinned copy of the v1 XGBoost
            baseline on every completed 2026 game where both models had a prediction.
          </p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">v1</TableHead>
                <TableHead className="text-right">v2</TableHead>
                <TableHead className="text-right">Δ</TableHead>
                <TableHead className="text-right">Gate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backtestRows.map((row) => (
                <TableRow key={row.metric}>
                  <TableCell className="text-xs">{row.metric}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{row.v1}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{row.v2}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{row.delta}</TableCell>
                  <TableCell className="text-right">
                    {row.pass === true ? (
                      <Badge variant="outline" className="text-emerald-400 border-emerald-500/40">PASS</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">–</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <p className="text-muted-foreground">
            Brier and log-loss are proper scoring rules, so the comparison covers
            calibration and sharpness together, not just hit rate. v1&apos;s 41.9% max
            calibration gap is partly thin-bin variance, but the direction holds. Totals
            ROI improved on paper here and then kept losing once v2 went live, which is
            how totals ended up switched off. A six-week backtest is a small sample; the
            numbers are frozen from that run, and live results, including ongoing Brier
            and calibration, are on the{" "}
            <Link href="/mlb/performance" className="underline underline-offset-2 hover:text-foreground">
              Performance page
            </Link>
            .
          </p>
        </div>
      </SectionCard>

      <SectionCard
        id="legacy-v1"
        title="Legacy: v1 XGBoost Model (pre-2026-05-12)"
        subtitle="Predictions on the History and Performance tabs before the green cutover line come from this model"
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            v1 was a gradient-boosted regressor (XGBoost) on 14 hand-built team-level
            features per game: starter and bullpen xFIP, WHIP and K/9, team OPS, ISO and
            K%, rolling run scoring, park factor, home field and bullpen rest. It
            predicted expected runs per team; win, total and run-line probabilities came
            from a negative binomial score distribution with isotonic calibration.
          </p>
          <p className="text-muted-foreground">
            v2 replaced it because v1 had no concept of individual batter or pitcher
            skill, so lineup changes, platoon advantages and bullpen identity were
            invisible to it; it reported no parameter uncertainty; and its calibration
            degraded in the tails. The v1 code was deleted on September 1, 2026. Its
            predictions before May 12, 2026 are kept in archive tables so the historical
            record is unchanged, and a green vertical line on every time-series chart
            marks the cutover.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
