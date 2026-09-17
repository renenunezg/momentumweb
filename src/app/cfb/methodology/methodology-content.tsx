import type { ReactNode } from "react";
import { Notice } from "@/components/notice";
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
import { FootballPickExample } from "@/components/football-pick-example";
import type { PickExample } from "@/lib/football-pick-example";

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
      { label: "CFBD play-by-play", sub: "Every D1 game, 2019+" },
      { label: "CFBD API", sub: "Games, lines, talent, portal, returning" },
      { label: "The Odds API", sub: "Priced moneylines, spreads and totals" },
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
      { label: "Picks", sub: "One side per game per market, flat unit" },
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
  { input: "Previous season rating", weight: "0.87", note: "Multiplier on last season's final rating, in points" },
  { input: "Talent composite (prior season)", weight: "3.70", note: "CFBD roster talent" },
  { input: "Talent composite (current season)", weight: "3.30", note: "Zero until CFBD publishes it" },
  { input: "Returning production", weight: "1.70", note: "Percent of team PPA returning" },
  { input: "Transfer portal quality balance", weight: "1.00", note: "Rated arrivals minus departures" },
  { input: "Transfer portal count balance", weight: "0.35", note: "Headcount in minus out" },
  { input: "Coach continuity", weight: "±0.35", note: "Same head coach as last season, or not" },
  { input: "QB continuity", weight: "0.00", note: "Feeds the scoring environment only" },
  { input: "Recruiting class points", weight: "0.00", note: "Fit to zero; kept for the uncertainty budget" },
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
    items: ["CFBD API", "The Odds API", "parquet (pyarrow)"],
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
    items: ["Supabase pg_cron dispatch", "GitHub Actions", "Append-only live odds capture"],
  },
];

export function MethodologyContent({ example }: { example: PickExample | null }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Overview */}
      <SectionCard
        id="overview"
        title="Overview"
        subtitle="Possession-based power ratings, calibrated score distributions, and a market-anchored in-game win probability model"
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            This model rates every Division 1 college football team on one scale:
            expected scoring margin against an average FBS opponent on a neutral
            field. From those ratings it projects a spread and a total for every
            game with a probability distribution around each, and an in-game
            layer turns any game state into a home win probability.
          </p>
          <p>
            <strong>The pregame model does not beat the closing spread.</strong>{" "}
            Across 3,853 backtested games from 2021 through 2025 its average margin
            error is 13.40 points against the closing line&apos;s 12.14, and the
            market wins every season. So picks are priced from a margin shrunk
            halfway to the market, and the in-game model anchors on the closing
            spread instead of the model&apos;s own number.
          </p>
          <p>
            What the model offers is coverage and calibration. It rates all 266 D1
            teams, including FCS programs the market barely prices, its 50/80/95%
            intervals were checked on three holdout seasons, and every prediction
            is frozen before kickoff and graded in public on the{" "}
            <Link href="/cfb/performance" className="underline underline-offset-2 hover:text-foreground">
              Performance page
            </Link>
            .
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: "Prediction target", val: "Home margin and game total, joint distribution" },
              { label: "Rating unit", val: "Points per possession, offense and defense per team" },
              { label: "Rating engine", val: "Bayesian linear model blended with a points-only rating" },
              { label: "Training data", val: "2019–2025 play-by-play; holdout 2023–2025" },
              { label: "Home field", val: "Refit weekly from a 2.5 ± 1.5 point prior" },
              { label: "In-game model", val: "3-parameter Gaussian on the final margin" },
              { label: "Kickoff anchor", val: "Market closing spread, sd 15.45 points" },
              { label: "Picks", val: "Moneyline, spread and total at a flat unit (cfb-picks-v6)" },
            ].map(({ label, val }) => (
              <Card key={label} size="sm"><CardContent>
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-sm font-medium">{val}</p>
              </CardContent></Card>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Example pick */}
      <SectionCard
        id="example"
        title="Example: How a Pick Is Priced"
        subtitle="The next recommended pick on the slate, rebuilt from its frozen row"
      >
        {example ? (
          <FootballPickExample example={example} />
        ) : (
          <p className="text-sm text-muted-foreground">
            No recommended pick is stored yet. This fills in once the weekly
            update publishes a slate with a qualifying edge.
          </p>
        )}
      </SectionCard>

      {/* Architecture */}
      <SectionCard
        id="flow"
        title="System Architecture"
        subtitle="From raw play-by-play to a live win probability, in four layers"
      >
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            A rating engine learns team strength from possession-level data, a
            projection layer turns ratings into calibrated game distributions, and
            an in-game layer consumes a pregame anchor plus a play feed. Each layer
            sees only what it would have known at the time.
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
              Everything runs as batch CLI commands over parquet files. Supabase
              pg_cron dispatches GitHub Actions: a Monday update that refits, projects and
              publishes the next slate and grades the finished week, and a
              kickoff-capture window that restores that frozen forecast and records
              the final pregame market without refitting. Odds capture is
              append-only. Live in-game serving is built but not connected to a
              live feed.
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
                {["CFBD API", "The Odds API", "Supabase"].map((src) => (
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
        subtitle="A Bayesian linear model over points per possession, blended with a points-only rating"
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            The engine works on possessions rebuilt from CFBD play-by-play, with
            garbage time excluded: a play stops counting once the margin exceeds
            43 points in the 1st quarter, 38 in the 2nd, 28 in the 3rd, or 22
            late. The target is points per possession, and the model is one
            offense and one defense number per team, a shift per conference (FCS
            is one pool), and a shared home-field term.
          </p>
          <FormulaBlock>
            E[ppp_home] = base + off_home − def_away + 0.5 · hfa
            <br />
            E[ppp_away] = base + off_away − def_home − 0.5 · hfa
            <br />
            <span className="text-muted-foreground">{"//"} hfa applies only off neutral sites; prior 2.5 ± 1.5 points, refit weekly</span>
          </FormulaBlock>
          <p>
            It is solved as a ridge regression in closed form, which is a Bayesian
            update with Gaussian priors, so the posterior covariance comes out of
            the same solve and feeds projection uncertainty. Offense and defense
            priors are correlated at 0.5, which shrinks scoring environment harder
            than net strength and keeps totals calibrated. Scoreboard points are
            noisy, so the fit runs twice: against a 50/50 blend of points and an
            EPA-derived process score, then against their precision-weighted
            combination. Pace comes from a separate small ridge, and strength
            scales with a game&apos;s expected possessions.
          </p>
          <p>
            That blend discounts blowout scoring, which under-projects games
            between distant pools, so a crossover gain adds a share of the
            pool-level gap to the stronger side. On the 2020&ndash;2025
            walk-forward it cut the FBS over FCS bias from +6.1 to +1.3 points.
            Zero always means an average FBS team.
          </p>
          <p>
            The published margin is half this fit and half a points-only ridge
            rating over every completed game with a final score, including FCS
            games with no play-by-play, carried across seasons with a 9-point
            prior. On the 2023&ndash;2025 holdout the blend cut margin error by
            0.19 points on Division I games with a closing line, and the
            score-only games cut another 0.06. Two frozen corrections come last,
            fitted on 2020&ndash;2022 and checked on 2023&ndash;2025: a small
            margin adjustment from 14 process features of each team&apos;s earlier
            games, and a 0.8-point reduction to the total.
          </p>
          <p>
            Hyperparameters were chosen on development seasons only, and the
            search preferred no recency decay: college seasons are short, and
            throwing away September to sharpen November costs more than it buys.
          </p>
        </div>
      </SectionCard>

      {/* Unit ratings */}
      <SectionCard
        id="units"
        title="Unit Ratings"
        subtitle="Six opponent-adjusted companions that describe how each team produced its results"
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            The Ratings page also publishes rush offense, pass offense, rush
            defense, pass defense, pass blocking, and run blocking. Each is an
            opponent-adjusted ridge over games strictly before the forecast week,
            centered so zero is an average FBS unit and positive is better. They
            are descriptive: they never feed the scoring engine and do not add up
            to the headline ratings.
          </p>
          <p>
            Rush and pass units use competitive-play PPA. Pass blocking is sack
            PPA relative to the expected sack cost for the team&apos;s dropbacks,
            and run blocking is adjusted line yards on a PPA-equivalent scale;
            both reflect the whole offense, not film grades of the line.
            Preseason forecasts carry last season&apos;s final unit ratings.
            Special teams is omitted because CFBD has no reliable PPA for routine
            kicks.
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
            Week 1 arrives with no current-season games, so the preseason rating
            starts from last season&apos;s final fit and adds offseason signals.
            Each input is a z-score across D1 multiplied by a weight in points of
            rating. The weights were fit by least squares on 364 FBS games from
            weeks 1 and 2 of 2022 through 2025 against the closing margin, and
            validated leaving one season out. Recruiting points and QB continuity
            fit to zero once talent and returning production were in:
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Input</TableHead>
                <TableHead className="text-right">Points per SD</TableHead>
                <TableHead className="hidden whitespace-normal sm:table-cell">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preseasonWeights.map((row) => (
                <TableRow key={row.input}>
                  <TableCell className="whitespace-normal text-xs">
                    {row.input}
                    <span className="mt-0.5 block text-muted-foreground sm:hidden">{row.note}</span>
                  </TableCell>
                  <TableCell className="text-right align-top font-mono text-xs">{row.weight}</TableCell>
                  <TableCell className="hidden whitespace-normal text-xs text-muted-foreground sm:table-cell">{row.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p>
            Service academies do not sign rated recruiting classes, so their talent
            is treated as missing, not as a near-zero roster. A parallel equation
            projects each team&apos;s scoring environment from QB continuity, QB
            transfers and returning receiving production, which lets two teams
            with the same power rating project different totals.
          </p>
          <p>
            Uncertainty is an explicit budget. Every rating starts at 6.05 points
            of standard deviation and grows in quadrature for each missing input:
            3.0 with no previous rating, 3.0 for FCS teams, 1.5 for missing
            returning production, down to 0.75 for recruiting. Injury availability
            has no feed, so its term is always on. This is the SD column on the{" "}
            <Link href="/cfb/ratings" className="underline underline-offset-2 hover:text-foreground">
              Ratings page
            </Link>
            , and it becomes each team&apos;s prior width when the in-season
            engine takes over after week 1.
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
            Power rating is offense plus defense and scoring environment is
            offense minus defense, so the projection is short:
          </p>
          <FormulaBlock>
            joint_margin = power_home − power_away + home_field + crossover
            <br />
            home_margin = 0.5 · joint_margin + 0.5 · points_only_margin + process_correction
            <br />
            model_total = league_base + environment_home + environment_away − 0.8
            <br />
            <span className="text-muted-foreground">{"//"} league_base = league scoring rate × the teams&apos; blended pace</span>
          </FormulaBlock>
          <p>
            A team rated +10 is roughly a 10-point favorite over an average FBS
            team on a neutral field. The published spread is the negated margin,
            following the sportsbook sign convention.
          </p>
          <p>
            Around that point sits a bivariate Student-t distribution over margin
            and total, built from the fit&apos;s residual covariance plus
            parameter uncertainty, including both teams&apos; rating SDs. The
            margin SD is scaled by 0.915, which brought 80% interval coverage from
            0.85 back to 0.81, and lands near 16 points for a typical game.
            College football is that noisy.
          </p>
          <p>
            The market comparison view flags any offer where the pure model sees
            at least 4 points of edge with positive EV. Those flags are review
            diagnostics, not picks: the biggest raw edges usually involve FCS
            opponents with thin data.
          </p>
        </div>
      </SectionCard>

      {/* Picks */}
      <SectionCard
        id="picks"
        title="Picks"
        subtitle="A versioned policy that shrinks toward the market before it measures an edge, graded at a flat unit"
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            Picks come from a separate policy, currently{" "}
            <span className="font-mono">cfb-picks-v6</span>, that selects at most
            one side per game and market, and every edge is measured after
            shrinking toward the market being bet into. Spreads are priced from a
            market-informed margin: the pure margin mixed with a rating fitted to
            the closing lines of earlier games (weight 0.55 through week 3, 0.35
            after), then averaged with the consensus spread. Totals are averaged
            with the median posted total. Moneylines keep only 0.2 of the
            model&apos;s disagreement with the market. Probabilities use the
            measured dispersion of results around these lines (15.35 points for
            margin, 15.93 for total), not the pure model&apos;s wider spread.
          </p>
          <p>
            A pick needs the priced line at least 2 points beyond the
            price&apos;s break-even line, plus positive EV, from a forecast no
            more than a week old with no missing input beyond the always-on
            injury flag, a paired two-sided quote and a price under an hour old.
            If fewer than 15 picks clear the gate in a week, the highest-edge
            positive-EV offers fill the gap and are labeled as volume-floor
            picks, which is a product choice and not a calibration result.
            Anything else is a No Play.
          </p>
          <p>
            Every pick records the exact line, price, book and decision time, then
            settles at that frozen contract at a flat one unit, along with the
            CFBD median closing line and the points by which the pick beat it. If
            a newer model version no longer makes an open pick, the fresh decision
            replaces it before kickoff; line movement alone never does. The
            half-market blend improved holdout margin error from 13.28 to 12.31
            points while the closing line stayed better at 11.99, so it is not
            independent skill, and the gates have not been tuned on live
            outcomes. Results are on the{" "}
            <Link href="/cfb/performance" className="underline underline-offset-2 hover:text-foreground">
              Performance page
            </Link>
            .
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
            Every backtested prediction was made walking forward through each
            season using only games from strictly earlier weeks, then frozen. The
            table is mean absolute error of the projected home margin, model
            versus closing spread, on the same games:
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
            The market wins every season, as expected: the closing line
            aggregates injury news, weather and sharper private models. The table
            is the frozen walk-forward of the base engine; the later points-only
            blend trimmed about a quarter point of holdout error and the closing
            line is still ahead. What the model can claim is calibration: on the
            untouched 2023&ndash;2025 holdout (2,258 games) the 50/80/95% margin
            intervals covered 51.6%, 80.1% and 94.2% of outcomes.
          </p>
          <p>
            A backtest describes seasons that already happened, and the portal,
            NIL, realignment and playoff expansion keep changing the sport, so
            these error levels should be expected to drift. The 2026 season is
            graded live against the projection published before kickoff and the
            CFBD closing line, and that record supersedes this table as it
            accumulates.
          </p>
          <p className="text-muted-foreground">
            The weak segment is early season: games where either team has fewer
            than two prior games grade around 15 points of margin MAE.
            Season-by-season detail is on the{" "}
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
            At every play boundary the in-game model asks: given the score, the
            clock, who has the ball and where, and what was believed before
            kickoff, how likely is the home team to win? The state for play N uses
            only plays 1 through N−1 plus the pre-snap situation. The form is a
            Gaussian over the final margin whose mean decays from the pregame
            expectation toward the live score as the clock runs out:
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
            The three parameters were fit on play-level log loss over the
            2019&ndash;2022 development seasons: possession is worth 0.306 points
            at a team&apos;s own 25, field position adds 0.0565 points per yard
            (first and goal at the 5 is worth about +4.3), and a 3.35-point floor
            keeps the distribution from collapsing as time expires.
          </p>
          <p>
            On the 2023&ndash;2025 holdout (400,878 play states across 2,258 games)
            the model scores 0.4073 log loss and 0.1328 Brier and passes
            calibration checks in every quarter and score-margin bucket. There
            are no momentum or streak features; this is the reference any such
            idea has to beat.
          </p>
          <p>
            Serving reads only a four-column anchor (<span className="font-mono">game_id,
            model_week, home_margin, margin_sd</span>), the three parameters and
            the play feed, so no outcome can leak in. Replaying all 759 games of
            2025 as a simulated live feed, 135,662 served events matched the
            stored batch predictions exactly, at a median of 8.9 ms per event
            against a 1-second budget.
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
            should start from it. One closing spread per game, the median across
            priced providers, enters the equation as{" "}
            <span className="font-mono">pregame_margin = −closing_spread</span>. The
            market prices no uncertainty, so{" "}
            <span className="font-mono">margin_sd</span> is a frozen constant,
            15.445 points: the standard deviation of actual margins around the
            closing spread over 3,794 development-season games. Rescoring the
            frozen baseline on identical play boundaries with only the anchor
            swapped, on the 2023&ndash;2025 holdout:
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
            The anchor&apos;s weight decays with the clock, so the log loss gain
            is largest early and vanishes late:
          </p>
          <div className="flex flex-wrap gap-2">
            {anchorPhaseRows.map((row) => (
              <Card key={row.phase} size="sm" className="py-2"><CardContent>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{row.phase}</p>
                <p className="font-mono text-sm">{row.delta}</p>
              </CardContent></Card>
            ))}
          </div>
          <p className="text-muted-foreground">
            The pregame anchor is the binding constraint on in-game accuracy; this
            does not show an independent model beating the market. At kickoff the
            served win probability is essentially the market&apos;s line; by the
            fourth quarter it is almost entirely the scoreboard. Without a market
            anchor, the model&apos;s own projection fills in.
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
            The project is named after momentum, so this section is a little
            painful to write. The hypothesis was that process evidence carries
            signal the scoreboard has not absorbed yet. Eight evidence families
            (sustained stops, drive efficiency, turnovers, field position,
            fourth-down outcomes, missed kicks, success rate, tempo) were allowed
            to shift the expected final margin on top of the frozen baseline.
          </p>
          <p>
            Version one used cumulative totals and improved the development
            seasons by 0.0030 of log loss; on holdout it was worse by 0.0004.
            Version two weighted recent plays with a 120-play half-life and was
            worse on holdout by 0.0006. My read is that whatever is real in a hot
            streak reaches the scoreboard quickly, and the scoreboard is already
            in the model. Momentum work is paused until I have a structurally
            different formulation.
          </p>
        </div>
      </SectionCard>

      {/* Players */}
      <SectionCard
        id="players"
        title="Player Values and the Heisman Board"
        subtitle="Opponent-adjusted value above replacement, and a conditional-logit vote-share model on top of it"
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            The Heisman page runs on a separate player layer that never feeds team
            ratings. Every credited play is measured against what an average
            player produces against that opponent unit, using rush and pass unit
            ratings fit strictly before the game&apos;s week. Early in the season
            those ratings start from a frozen previous-season prior, so opening
            opponents are not treated as average. How a play&apos;s EPA is split
            among credited players is a fixed, documented table, because there is
            no ground truth for responsibility that could fit it. Defensive credit
            covers only tagged disruption plays (sacks, interceptions, breakups,
            fumbles) plus box-score tackles for loss and passes defended. Rates
            shrink toward the position mean with a four-game prior, FCS opponents
            count half, and a 30th-percentile replacement baseline is subtracted.
          </p>
          <p>
            The Heisman board is a conditional logit trained on 2010 through 2025
            ballots: predicted vote share is a softmax across each season&apos;s
            candidate pool, which sums to one the way a ballot does. Pools are
            chosen from statistics available that week, and evaluation uses later
            seasons only, counting winners missing from the pool as misses. The
            shares are conditional on the pool, not calibrated win probabilities.
          </p>
        </div>
      </SectionCard>

      {/* Limits */}
      <SectionCard
        id="limits"
        title="What the Model Does Not Do"
        subtitle="The boundaries are design decisions too"
      >
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            Injuries are never inferred from play-by-play or line movement. The
            one availability input is a hand-entered, sourced and timestamped
            report that a starting quarterback is out or doubtful, which lowers
            that team&apos;s expected points by a fixed 1.5 (4.0 in the
            postseason). Everything else stays flagged as missing and widens
            uncertainty.
          </p>
          <p>
            Estimated EV does not establish a real betting advantage, and nothing
            on this site is betting advice.
          </p>
          <p>
            There is no live production feed yet: the in-game serving path
            replays stored plays, and bowl season has no anchor mapping. FCS teams
            with sparse data carry the widest uncertainty and the largest
            model-market gaps.
          </p>
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

          <Notice className="mt-2 bg-muted/50 text-xs text-muted-foreground leading-relaxed">
<strong className="text-foreground">A note on model size:</strong> there is
            no machine learning framework here, but the model is still Bayesian.
            Because it is Gaussian throughout, the posterior has a closed form:
            what a NUTS sampler does for the MLB model on this site, NumPy linear
            algebra does here. Nothing needs a GPU, every artifact is a parquet
            file, and added complexity has to win on holdout. So far, momentum
            could not.
          </Notice>
        </div>
      </SectionCard>
    </div>
  );
}
