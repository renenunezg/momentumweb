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
    <div className="my-3 overflow-x-auto rounded-sm border border-border bg-muted px-4 py-3 font-mono text-sm leading-relaxed">
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
      { label: "ESPN play-by-play", sub: "SportsDataverse releases, 2019+" },
      { label: "CFBD API", sub: "Games, lines, talent, portal, returning" },
      { label: "The Odds API", sub: "Priced spreads and totals" },
      { label: "Previous season fit", sub: "Seeds the preseason prior" },
    ],
  },
  {
    group: "Rating Engine",
    color: "border-amber-500/40 bg-amber-500/5",
    labelColor: "text-amber-400",
    items: [
      { label: "Possession construction", sub: "Scrimmage runs, garbage-time aware" },
      { label: "Ridge over off/def PPP", sub: "Two numbers per team + fitted HFA" },
      { label: "EPA process blend", sub: "Scoreboard and process, GLS-combined" },
      { label: "Preseason prior", sub: "Talent, portal, returning production" },
    ],
  },
  {
    group: "Projections",
    color: "border-emerald-500/40 bg-emerald-500/5",
    labelColor: "text-emerald-400",
    items: [
      { label: "Margin and total", sub: "Bivariate Student-t per game" },
      { label: "Calibrated intervals", sub: "50/80/95% checked on holdout" },
      { label: "Market comparison", sub: "Cover probability and EV per offer" },
      { label: "Supabase publish", sub: "The only interface to this site" },
    ],
  },
  {
    group: "In-Game",
    color: "border-purple-500/40 bg-purple-500/5",
    labelColor: "text-purple-400",
    items: [
      { label: "Play-boundary states", sub: "Strictly pre-snap information" },
      { label: "3-parameter WP model", sub: "Gaussian on the final margin" },
      { label: "Market anchor", sub: "Closing spread as the kickoff prior" },
      { label: "Rebuild-per-play serving", sub: "~9 ms median per event" },
    ],
  },
];

const pipelineSteps = [
  { num: "01", name: "Ingest", desc: "Schedules, lines, talent, portal, play-by-play into raw parquet" },
  { num: "02", name: "Possessions", desc: "Classify plays, build possessions, aggregate team-game features" },
  { num: "03", name: "Fit", desc: "Ridge over offense/defense PPP plus home field, or the preseason prior" },
  { num: "04", name: "Project", desc: "Margin and total distributions for every upcoming game" },
  { num: "05", name: "Anchor", desc: "Outcome-free pregame anchors for in-game serving" },
  { num: "06", name: "Publish", desc: "Serving tables written to the Supabase cfb schema" },
];

const backtestRows = [
  { season: "2021", model: "13.60", market: "12.49" },
  { season: "2022", model: "13.86", market: "12.28" },
  { season: "2023", model: "13.26", market: "12.00" },
  { season: "2024", model: "13.46", market: "12.02" },
  { season: "2025", model: "12.84", market: "11.93" },
];

const preseasonWeights = [
  { input: "Previous season rating", weight: "1.00", note: "Carried in points, not standardized" },
  { input: "Talent composite (prior season)", weight: "1.50", note: "CFBD roster talent" },
  { input: "Talent composite (current season)", weight: "1.50", note: "Zero until CFBD publishes it" },
  { input: "Returning production", weight: "1.20", note: "Percent of team PPA returning" },
  { input: "Transfer portal quality balance", weight: "1.00", note: "Rated arrivals minus departures" },
  { input: "QB continuity", weight: "1.00", note: "Percent of passing PPA returning" },
  { input: "Recruiting class points", weight: "0.80", note: "CFBD team recruiting" },
  { input: "Transfer portal count balance", weight: "0.35", note: "Headcount in minus out" },
  { input: "Coach continuity", weight: "±0.35", note: "Same head coach as last season, or not" },
];

const anchorRows = [
  { metric: "Log loss", baseline: "0.40730", anchored: "0.38954", delta: "−0.01775" },
  { metric: "Brier score", baseline: "0.13280", anchored: "0.12576", delta: "−0.00704" },
];

const anchorPhaseRows = [
  { phase: "1st quarter", delta: "−0.0406" },
  { phase: "2nd quarter", delta: "−0.0231" },
  { phase: "3rd quarter", delta: "−0.0083" },
  { phase: "4th quarter", delta: "+0.0002" },
  { phase: "Overtime", delta: "0.0000" },
];

const stack = [
  {
    category: "Modeling",
    items: ["Python", "NumPy", "pandas", "SciPy", "closed-form ridge", "Nelder-Mead / Powell"],
  },
  {
    category: "Data",
    items: ["CFBD API", "SportsDataverse ESPN PBP", "The Odds API", "parquet (pyarrow)"],
  },
  {
    category: "Database",
    items: ["Supabase (PostgreSQL)", "cfb schema", "SQLAlchemy", "RLS public_read"],
  },
  {
    category: "Frontend",
    items: ["Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui"],
  },
  {
    category: "Orchestration",
    items: ["Batch CLI commands", "Append-only live odds capture"],
  },
];

export function MethodologyContent() {
  return (
    <div className="flex flex-col gap-6">
      {/* Overview */}
      <SectionCard
        id="overview"
        title="Project Overview"
        subtitle="Possession-based power ratings, calibrated score distributions, and a market-anchored in-game win probability model"
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            This model rates every Division 1 college football team on a single scale:
            expected scoring margin against an average FBS opponent on a neutral field.
            From those ratings it projects a spread and a total for every game, with a
            full probability distribution around each number, and an in-game layer turns
            any game state into a home win probability on every play.
          </p>
          <p>
            One thing should be said up front.{" "}
            <strong>The pregame model does not beat the closing spread.</strong>{" "}
            Across
            3,853 backtested games from 2021 through 2025, the model&apos;s average margin
            error is 13.40 points and the closing line&apos;s is 12.14. The market wins
            every season. Those are backtested numbers on seasons that already happened,
            provisional in the way all sports backtests are; the backtest section says
            more. The result is not buried in a footnote because it drives the
            most consequential design decision in the system: once a game kicks off, the
            in-game model anchors on the closing spread rather than the model&apos;s own
            number, and gets measurably better for it.
          </p>
          <p>
            What the model is for, then, is coverage and calibration. It rates all 266
            D1 teams including FCS programs the market barely prices, every projection
            ships with a distribution whose 50/80/95% intervals have been verified
            against three untouched holdout seasons, rating uncertainty widens
            explicitly when inputs are missing, and the entire prediction history is
            frozen and graded in public on the{" "}
            <Link href="/cfb/performance" className="underline underline-offset-2 hover:text-foreground">
              Performance page
            </Link>
            .
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: "Prediction target", val: "Home margin and game total, joint distribution" },
              { label: "Rating unit", val: "Points per possession, offense and defense per team" },
              { label: "Rating engine", val: "Bayesian linear model, posterior in closed form" },
              { label: "Training data", val: "2019–2025 play-by-play; holdout 2023–2025" },
              { label: "Home field", val: "Fitted each season, currently 3.22 points" },
              { label: "In-game model", val: "3-parameter Gaussian on the final margin" },
              { label: "Kickoff anchor", val: "Market closing spread, sd 15.45 points" },
              { label: "Market output", val: "+EV flags for benchmarking; no picks, no sizing" },
            ].map(({ label, val }) => (
              <div key={label} className="rounded-sm border border-border p-3">
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-sm font-medium">{val}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Architecture */}
      <SectionCard
        id="flow"
        title="System Architecture"
        subtitle="From raw play-by-play to a live win probability, in four layers"
      >
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            The system splits into a rating engine that learns team strength from
            possession-level data, a projection layer that turns ratings into calibrated
            game distributions, and an in-game layer that consumes a pregame anchor plus
            a play feed and nothing else. Each layer only sees what it would have known
            at the time: the walk-forward backtest, the preseason snapshot, and the
            in-game serving path all enforce that boundary mechanically.
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

          <div className="mt-4 space-y-4 text-sm">
            <p className="leading-relaxed text-muted-foreground">
              Everything runs as batch CLI commands over parquet files. There is no
              daemon and no scheduler; the only network polling in the repo is an
              append-only live odds capture that writes immutable, content-hashed
              snapshots. Live in-game serving against a paid low-latency feed is
              designed for but deliberately not wired up yet.
            </p>
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-0">
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
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">Data sources</p>
              <div className="flex flex-wrap gap-2">
                {["CFBD API", "SportsDataverse ESPN PBP", "The Odds API", "Supabase"].map((src) => (
                  <Badge key={src} variant="outline">{src}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Rating engine */}
      <SectionCard
        id="engine"
        title="Rating Engine"
        subtitle="A Bayesian linear model over points per possession, blending scoreboard results with process signal"
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            The engine works at the possession level. Raw ESPN play-by-play
            is classified play by play (scrimmage, special teams, penalty, clock
            management, administrative), and possessions are rebuilt as maximal
            chronological runs of scrimmage plays by one offense. Garbage time is
            excluded with period-specific thresholds: a play no longer counts as
            competitive once the margin exceeds 43 points in the 1st quarter, 38 in the
            2nd, 28 in the 3rd, or 22 late. Each game then contributes an offense and a
            defense row per team, with points per possession as the target.
          </p>
          <p>
            The model itself is small on purpose: one offense number and one defense
            number per team, plus a single shared home-field term. For 266 teams that is
            roughly 530 parameters, solved as a ridge regression in closed form. Ridge
            is the computational name; statistically this is a Bayesian update. The
            priors are genuine Gaussian priors, conjugate with the Gaussian likelihood,
            so the posterior mean and covariance drop straight out of the normal
            equations, and that covariance is what feeds projection uncertainty later.
          </p>
          <FormulaBlock>
            E[ppp_home] = base + off_home − def_away + 0.5 · hfa
            <br />
            E[ppp_away] = base + off_away − def_home − 0.5 · hfa
            <br />
            <span className="text-muted-foreground">{"//"} hfa applies only off neutral sites; prior 2.5 ± 1.5 points, currently fit at 3.22</span>
          </FormulaBlock>
          <p>
            Scoreboard points are a noisy signal of team quality, so the fit runs in two
            stages. The first stage regresses a 50/50 blend of actual points and an
            EPA-derived process score. The second stage measures the residual covariance
            between the two signals and re-solves against their precision-weighted
            combination, so whichever signal has been more reliable that season gets
            more say. Expected possessions come from a separate small ridge on game
            pace.
          </p>
          <p>
            FCS teams are handled inside the same system rather than dropped: their
            prior is recentered to the observed FCS-to-FBS gap before the solve, and
            ratings are centered so that zero always means an average FBS team.
          </p>
          <p>
            The hyperparameters (prior strength 0.45 ppp, covariance shrinkage 0.8,
            Student-t degrees of freedom 500, covariance scale 1.125) were selected by
            grid search on the 2019&ndash;2022 development seasons only. One search
            result worth calling out: the grid included recency half-lives from 3 weeks
            up, and it preferred no time decay at all. College football seasons are
            short. Throwing away September to sharpen November costs more than it buys.
          </p>
        </div>
      </SectionCard>

      {/* Preseason */}
      <SectionCard
        id="preseason"
        title="Preseason Prior"
        subtitle="Last season's final fit plus offseason signals, each weighted in points per standard deviation"
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            College football resets hard every offseason: rosters turn over through the
            draft and the transfer portal, and week 1 arrives with no current-season
            games to learn from. The preseason rating starts from last season&apos;s
            final fit and layers standardized offseason signals on top. Each input is
            converted to a z-score across all of D1, then multiplied by a weight
            denominated directly in points of rating:
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Input</TableHead>
                <TableHead className="text-right">Points per SD</TableHead>
                <TableHead className="whitespace-normal">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preseasonWeights.map((row) => (
                <TableRow key={row.input}>
                  <TableCell className="text-xs">{row.input}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{row.weight}</TableCell>
                  <TableCell className="whitespace-normal text-xs text-muted-foreground">{row.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p>
            Transfer portal quality is measured as the summed rating of rated arrivals
            minus rated departures, with a separate QB-only version feeding the scoring
            environment (the offense/defense split). A parallel equation projects each
            team&apos;s scoring environment from QB continuity, QB transfers, and
            returning receiving production, which is what lets two teams with the same
            power rating project different totals.
          </p>
          <p>
            Uncertainty is an explicit budget. Every rating starts at 6.05 points
            of standard deviation and grows in quadrature for each missing input: 3.0
            more if the team has no previous rating, 3.0 for FCS teams, 1.5 for missing
            returning production, 1.25 for unknown QB continuity, and so on down to
            0.75 for recruiting. Injury availability has no data source at all, so its
            term is always on. The SD column on the{" "}
            <Link href="/cfb/ratings" className="underline underline-offset-2 hover:text-foreground">
              Ratings page
            </Link>{" "}
            is this number, and it flows straight into wider spread distributions for
            affected games. The preseason prior covers week 1 only; from week 2 on, the
            in-season engine takes over.
          </p>
        </div>
      </SectionCard>

      {/* Projections */}
      <SectionCard
        id="projections"
        title="From Ratings to a Line"
        subtitle="Margin and total as a joint Student-t distribution, compared against every priced offer"
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            Because power rating is offense plus defense and scoring environment is
            offense minus defense, the projection algebra collapses to something you
            can do in your head:
          </p>
          <FormulaBlock>
            home_margin = power_home − power_away + home_field
            <br />
            model_total = league_base + environment_home + environment_away
            <br />
            <span className="text-muted-foreground">{"//"} league_base = league scoring rate × the teams&apos; blended pace</span>
          </FormulaBlock>
          <p>
            A team rated +10 is a 10-point favorite over an average FBS team on a
            neutral field. Home field adds 3.22 points this season. The published
            spread is the negated margin, following the sportsbook sign convention.
          </p>
          <p>
            Around that point estimate sits a bivariate Student-t distribution over
            margin and total, built from the fit&apos;s residual covariance plus full
            parameter uncertainty, including both teams&apos; rating SDs. A typical
            in-season margin SD is about 17 points, and preseason projections with more
            missing inputs run closer to 18. Seventeen points sounds enormous until you
            grade forecasts against final scores for seven seasons; college football is
            just that noisy, and pretending otherwise produces intervals that fail
            their coverage checks.
          </p>
          <p>
            For market comparisons, the distribution prices every offer directly: the
            probability the home side covers is the t-CDF of the edge over the scale,
            and expected value follows from the American price. Plays where the model
            sees an edge of at least 4 points with positive EV get flagged. Those
            flags are the model&apos;s benchmark against the market, and each one is
            also a prompt to review the model&apos;s inputs first, since the biggest
            edges in practice tend to involve FCS opponents with degraded data. What
            never happens is the step after: no sizing, no picks, and every row ships
            with <span className="font-mono">recommendation_status</span> set to{" "}
            <span className="font-mono">not_recommended</span>.
          </p>
        </div>
      </SectionCard>

      {/* Backtest */}
      <SectionCard
        id="backtest"
        title="Backtest vs the Closing Line"
        subtitle="Frozen walk-forward, 2021 to 2025. The market is better, and by a consistent amount."
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            Every backtested prediction was made walking forward through each season
            using only completed games from strictly earlier weeks, then frozen. The
            comparison is mean absolute error of the projected home margin against the
            actual margin, model versus closing spread, on the same games:
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Season</TableHead>
                <TableHead className="text-right">Model MAE</TableHead>
                <TableHead className="text-right">Market MAE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backtestRows.map((row) => (
                <TableRow key={row.season}>
                  <TableCell className="text-xs">{row.season}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{row.model}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{row.market}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2">
                <TableCell className="text-xs font-semibold">Pooled</TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold">13.40</TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold">12.14</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p>
            The market wins every season and every week bucket. That is the expected
            outcome: the closing line aggregates injury news, weather, and the sharpest
            private models in the world, and beating it consistently is rare enough
            that claiming to should be treated as a red flag. What the model can claim
            is calibration. On the untouched 2023&ndash;2025 holdout (2,258 games), the
            50/80/95% margin intervals covered 51.6%, 80.1%, and 94.2% of outcomes, and
            the total projection came out unbiased to a hundredth of a point.
          </p>
          <p>
            One caveat applies to everything in this table, and it applies to sports
            modeling generally. A backtest reports how this procedure would have done
            in seasons that already happened, and college football does not hold
            still: the portal, NIL, realignment, and playoff expansion keep rewriting
            the sport underneath the model, and the market adapts too. The absolute
            error levels above are era-specific and should be expected to drift. They
            stand in because the season has not started yet; once it does, live graded
            games on the Performance page become the record that matters, and they
            supersede this table as they accumulate. What the backtest is trusted for
            is its structural findings, the ones that repeated in every single season:
            the market beats the model pregame, momentum fails out of sample, the
            stated intervals cover. Those drove the design decisions, and they
            transfer far better than any error number.
          </p>
          <p className="text-muted-foreground">
            The known weak segment is early season: games where either team has fewer
            than two prior games grade at 16.5 points of margin MAE with intervals that
            run too narrow. That is precisely the hole the preseason prior exists to
            shrink. Full season-by-season detail is on the{" "}
            <Link href="/cfb/performance" className="underline underline-offset-2 hover:text-foreground">
              Performance page
            </Link>
            .
          </p>
        </div>
      </SectionCard>

      {/* In-game */}
      <SectionCard
        id="ingame"
        title="In-Game Win Probability"
        subtitle="Three fitted parameters, a Gaussian on the final margin, and nothing the model could not know pre-snap"
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            The in-game model answers one question at every play boundary: given the
            score, the clock, who has the ball and where, and what was believed before
            kickoff, what is the probability the home team wins? The state for play N
            is built strictly from plays 1 through N−1 plus the pre-snap situation, and
            a prefix-stability check proves it: rebuilding any game from only its first
            N plays must reproduce every earlier state bit for bit, or the pipeline
            refuses to continue.
          </p>
          <p>
            The functional form is a Gaussian over the final margin whose mean decays
            from the pregame expectation toward the live score as the clock runs out:
          </p>
          <FormulaBlock>
            possession_value = sign · (0.306 + 0.0565 · (75 − yards_to_goal))
            <br />
            μ = home_margin + f · pregame_margin + possession_value
            <br />
            σ² = f · pregame_margin_sd² + 3.355²
            <br />
            P(home win) = Φ(μ / σ)
            <br />
            <span className="text-muted-foreground">{"//"} f = fraction of regulation remaining; 0 in overtime</span>
          </FormulaBlock>
          <p>
            Three parameters, all fit by direct search on play-level log loss over the
            2019&ndash;2022 development seasons: possession is worth 0.306 points at a
            team&apos;s own 25, field position adds 0.0565 points per yard (so first and
            goal at the 5 is worth about +4.3 points, and being backed up at your own 1
            costs about a point), and a 3.35-point floor keeps the distribution from
            collapsing as time expires.
          </p>
          <p>
            On the 2023&ndash;2025 holdout (400,878 play states across 2,258 games) the
            model scores 0.4073 log loss and 0.1328 Brier, and passes calibration
            checks in every quarter and every score-margin bucket. Calibration
            tolerances are computed on game counts rather than play counts, since every
            state within a game shares one outcome. There are deliberately no momentum
            or streak features in this baseline; it exists to be the reference any such
            idea has to beat.
          </p>
        </div>
      </SectionCard>

      {/* Market anchor */}
      <SectionCard
        id="anchor"
        title="The Market Anchor"
        subtitle="Swapping the model's pregame margin for the closing spread, everywhere the clock still matters"
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            If the closing line is the better pregame forecast, the in-game model
            should start from it. The anchor construction is deliberately plain: one
            closing spread per game, taken as the median across every priced provider,
            enters the win probability equation as{" "}
            <span className="font-mono">pregame_margin = −closing_spread</span>. The
            market prices a spread but not an uncertainty, so{" "}
            <span className="font-mono">margin_sd</span> is a single frozen constant,
            15.445 points, the standard deviation of actual margins around the closing
            spread over 3,794 development-season games. Holdout sensitivity was flat
            near that value, so nothing fancier than a constant is warranted yet.
          </p>
          <p>
            The frozen baseline was then rescored on identical play boundaries with
            only the anchor swapped. On the 2023&ndash;2025 holdout:
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Model anchor</TableHead>
                <TableHead className="text-right">Market anchor</TableHead>
                <TableHead className="text-right">Δ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {anchorRows.map((row) => (
                <TableRow key={row.metric}>
                  <TableCell className="text-xs">{row.metric}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{row.baseline}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{row.anchored}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{row.delta}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p>
            The improvement lives exactly where theory says it should. The anchor&apos;s
            weight decays with the clock, so the gain is largest early and vanishes
            late:
          </p>
          <div className="flex flex-wrap gap-2">
            {anchorPhaseRows.map((row) => (
              <div key={row.phase} className="rounded-sm border border-border px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{row.phase}</p>
                <p className="font-mono text-sm">{row.delta}</p>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground">
            The verdict that came out of this experiment now steers the roadmap: the
            pregame anchor is the binding constraint on in-game accuracy, so effort
            belongs on the anchor, not on further in-game adjustments. At kickoff the
            served win probability is essentially the market&apos;s own line converted
            to a probability; by the fourth quarter it is almost entirely the
            scoreboard. When no market anchor exists for a game, the model&apos;s own
            projection fills in.
          </p>
        </div>
      </SectionCard>

      {/* Serving */}
      <SectionCard
        id="serving"
        title="Serving and Verification"
        subtitle="Outcome-free by construction, verified exact against stored batch output"
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            The serving path is built so that a live deployment cannot accidentally
            cheat. A served game reads exactly three things: a four-column anchor
            contract (<span className="font-mono">game_id, model_week, home_margin,
            margin_sd</span>), the three frozen model parameters, and the play feed.
            Reads are column-restricted so no outcome field can leak in, and
            verification against stored results is a separate step that only runs after
            serving is done.
          </p>
          <p>
            Rather than maintain incremental state, the server rebuilds the entire game
            state from the play prefix after every single play. That sounds wasteful
            until you measure it: across all 759 games of the 2025 season replayed as a
            simulated live feed, 135,662 served events matched the stored batch
            predictions exactly, at a median of 8.9 ms per event with a p99 of 11.6 ms,
            against a 1-second live budget. Exact-match replay means the live path and
            the evaluated path are provably the same code producing the same numbers.
          </p>
        </div>
      </SectionCard>

      {/* Momentum */}
      <SectionCard
        id="momentum"
        title="Momentum: Tested and Rejected"
        subtitle="Two attempts at a momentum layer, both worse on holdout, both shelved"
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            The project is named after momentum, so this section is a little painful to
            write. The hypothesis was that chronological process evidence carries
            signal the scoreboard has not absorbed yet: sustained stops, drive
            efficiency, turnovers, field position, fourth-down outcomes, missed kicks,
            success rate, tempo. Eight evidence families, tracked as home-minus-away
            totals, shrunk toward zero by a prior play count, shifting the expected
            final margin on top of the frozen baseline.
          </p>
          <p>
            Version one used cumulative totals and improved the development seasons by
            0.0030 of log loss. On holdout it was worse by 0.0004. Version two weighted
            recent plays more heavily with a 120-play half-life, and its shrinkage
            search ran to the top of the grid, which is an optimizer&apos;s polite way
            of saying it would rather not use the features at all. Holdout: worse by
            0.0006.
          </p>
          <p>
            The honest read is that whatever is real in a hot streak shows up on the
            scoreboard quickly, and the scoreboard is already in the model. Momentum
            work is paused until there is a structurally different formulation worth
            testing, and the baseline above stands as the number any future attempt has
            to beat on holdout, not on the development years it was tuned on.
          </p>
        </div>
      </SectionCard>

      {/* Limits */}
      <SectionCard
        id="limits"
        title="What the Model Does Not Do"
        subtitle="Stated plainly, because the boundaries are design decisions too"
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <ul className="ml-4 list-disc space-y-2 text-muted-foreground marker:text-border">
            <li>
              <strong className="text-foreground">No injury or availability modeling.</strong>{" "}
              There is no reliable public availability feed, and guessing from
              play-by-play text is a good way to be confidently wrong. The missing
              input permanently widens every team&apos;s rating uncertainty instead.
            </li>
            <li>
              <strong className="text-foreground">No picks, no sizing, no profitability claims.</strong>{" "}
              The model does flag +EV plays; pricing the market and surfacing
              disagreements is how it gets benchmarked against the strongest available
              forecast. It stops there. Nothing sizes a wager or sells a pick, the
              flags are a measurement tool rather than betting advice, and every row
              ships with <span className="font-mono">recommendation_status</span> set
              to <span className="font-mono">not_recommended</span>.
            </li>
            <li>
              <strong className="text-foreground">No live production feed yet.</strong>{" "}
              Current data sources are batch. The serving path is proven fast enough
              for live use, but real-time projections wait on a paid low-latency tier.
            </li>
            <li>
              <strong className="text-foreground">Early-season fragility.</strong>{" "}
              Ratings for teams with fewer than two graded games are the model&apos;s
              weakest output, and FCS teams with sparse data feeds carry the widest
              uncertainty and produce the largest model-market gaps.
            </li>
            <li>
              <strong className="text-foreground">Postseason in-game serving is unmapped.</strong>{" "}
              Regular-season weeks map cleanly onto serving anchors; bowl season needs
              its own mapping and does not have one yet.
            </li>
          </ul>
        </div>
      </SectionCard>

      {/* Tech Stack */}
      <SectionCard
        id="stack"
        title="Tech Stack"
        subtitle="Small tools, closed-form math, and parquet files all the way down"
      >
        <div className="space-y-5 text-sm">
          {stack.map(({ category, items }) => (
            <div key={category}>
              <p className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {category}
              </p>
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <Badge key={item} variant="outline" className="font-mono text-xs">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-2 rounded-sm border border-border bg-muted/50 p-3 text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">A note on model size:</strong> there is
            no machine learning framework anywhere in this system, but that is a
            statement about tooling, and the underlying model is still Bayesian. The
            rating engine puts Gaussian priors on every team&apos;s offense, defense,
            and the shared home-field term, updates them with each week&apos;s
            possessions, and carries the posterior covariance into every projection
            interval. Because the model is Gaussian throughout, the posterior has a
            closed form: what a NUTS sampler does for the MLB model on this site,
            plain NumPy linear algebra does here. The in-game layer is three
            parameters fit with a Nelder-Mead search. Nothing needs a GPU, every
            artifact is a parquet file, and any number on this site can be regenerated
            from raw data with one CLI command. When a model this small is calibrated
            across seven seasons, added complexity has to argue for itself on holdout.
            So far, momentum could not.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
