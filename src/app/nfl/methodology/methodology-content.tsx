import Link from "next/link";
import { FootballPickExample } from "@/components/football-pick-example";
import type { PickExample } from "@/lib/football-pick-example";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 space-y-3 pb-10">
      <h2 className="font-heading text-xl">{title}</h2>
      {children}
    </section>
  );
}

const p = "text-sm leading-relaxed text-muted-foreground";
const strongText = "font-medium text-foreground";
const link = "underline underline-offset-2 hover:text-foreground";

export function MethodologyContent({ example }: { example: PickExample | null }) {
  return (
    <div className="min-w-0">
      <Section id="overview" title="Overview">
        <p className={p}>
          The NFL model produces weekly power ratings, spreads and totals for
          all 32 teams. The engine is a Bayesian regression refit from scratch
          every Tuesday on the season&apos;s play-by-play: no Elo chain,
          nothing carried by hand. Around it sit a starting quarterback
          adjustment, an offseason prior, and a capped blend toward the
          betting market. The pure and blended lines are both graded against
          the closing spread, and picks go into a frozen ledger at a flat one
          unit.
        </p>
      </Section>

      <Section id="example" title="Example: How a Pick Is Priced">
        <p className={p}>
          The next recommended pick on the slate, rebuilt from its frozen row.
          Once every game has kicked off it shows the most recently settled
          pick instead.
        </p>
        {example ? (
          <FootballPickExample example={example} />
        ) : (
          <p className={p}>
            No recommended pick is stored yet. This fills in once the Tuesday
            run publishes a slate with a qualifying edge.
          </p>
        )}
      </Section>

      <Section id="data" title="Data">
        <p className={p}>
          Football data comes from the open source{" "}
          <span className={strongText}>nflverse</span> project: play-by-play
          with expected points added (EPA), schedules with closing lines,
          depth charts and injury reports, from 2015 on. Prices come from The
          Odds API. Garbage time is excluded from every rating input: the lead
          threshold shrinks by quarter, and a whole drive is kept or dropped
          based on the score when it started.
        </p>
      </Section>

      <Section id="engine" title="Rating Engine">
        <p className={p}>
          Each team carries an offense and a defense rating in points per
          drive, plus a pace rating in drives per game, with a fitted
          home-field parameter (prior of two points). The model is a conjugate
          Gaussian ridge, a closed-form Bayesian update: the posterior mean
          gives the ratings and the posterior covariance gives their
          uncertainty, with no sampling.
        </p>
        <p className={p}>
          The target fuses points per drive, what the scoreboard said, with
          EPA per drive, closer to how the team played. The two channels are
          weighted by their residual covariance, so the fusion weights are
          estimated, not hand-picked. Each fit uses only
          games that started before the forecast, with a calibrated recency
          half-life of six weeks. Projections come out as a Student-t
          distribution over the game margin and total.
        </p>
        <p className={p}>
          Totals get one extra step: league scoring and pace keep a preseason
          prior that fades with a six-week half-life, and a linear correction
          fitted on 2016 through 2021 pulls extreme totals toward 45. On 2022
          through 2025 that cut total error from 10.62 to 10.54 points. The
          published total is not blended with the market.
        </p>
      </Section>

      <Section id="adjustments" title="QB and Rest Adjustments">
        <p className={p}>
          Team ratings already absorb the quarterback play that happened, so
          the QB layer exists for one case: the projected starter differs from
          the quarterback baked into the rating. Every quarterback carries a
          value in points per game from EPA per dropback, shrunk toward
          replacement level by sample size and decayed with two half-lives:
          1,000 dropbacks and 52 calendar weeks. The adjustment is
          the starter&apos;s value minus the value embedded in the team&apos;s
          rating window, applied at a weight of 0.25 selected on the
          development seasons. Starters come from depth
          charts, skipping anyone listed Out or Doubtful, with a manual
          override for game-day news.
        </p>
        <p className={p}>
          A rest adjustment for byes and short weeks is wired in, but
          calibration tunes its coefficient to zero: the market line in the
          blend already carries that information.
        </p>
      </Section>

      <Section id="blend" title="Market Blend">
        <p className={p}>
          The published line is an even blend of the pure model margin and the
          market line. The weight is hard-capped at one half so the model can
          never become an echo of the market, and calibration landed on the
          cap. The market never touches the ratings.
        </p>
        <p className={p}>
          Spread and moneyline probabilities use a discrete margin
          distribution, because NFL margins pile up on three and seven and a
          smooth curve cannot price a push. Per-margin multipliers learned
          from the development seasons sit on top of each game&apos;s
          location and scale. Totals are priced on the plain Student-t.
        </p>
      </Section>

      <Section id="preseason" title="Preseason">
        <p className={p}>
          Week one has no games to learn from, so the preseason prior blends
          two signals equally: last season&apos;s final ratings regressed
          halfway toward the league mean, and a rating implied by the
          sportsbook season win-total market, which prices offseason change
          that reversion cannot see. Both weights were selected on the
          development seasons. The prior also seeds the in-season fits, and
          the data takes over as games accumulate.
        </p>
      </Section>

      <Section id="units" title="Unit Ratings">
        <p className={p}>
          The Units view shows opponent-adjusted ratings for rushing and
          passing offense and defense, pass and run blocking, and special
          teams, in points per game above league average. They are there for
          reading a team; the engine does not consume them. The line ratings
          are proxies: charted pressure rate corrected for the
          quarterback&apos;s time to throw, and the short-area yards of each
          carry.
        </p>
      </Section>

      <Section id="backtest" title="Backtest">
        <p className={p}>
          Every backtest number is walk-forward: each week was projected
          using only information available at the time. Hyperparameters were
          selected on 2016 through 2021. Seasons 2022 through 2025 were not used for selection, but I
          have looked at them repeatedly, so I call them retrospective
          validation rather than a clean holdout. The first prospective test
          is the 2026 season, graded live.
        </p>
        <p className={p}>
          On 2022 through 2025 the blended line runs about a tenth of a point
          behind the closing spread&apos;s mean absolute error, and the pure
          model about four tenths behind. Beating the close consistently is
          rare enough that I would suspect leakage before skill, so the gap is
          the number I report. Interval coverage on those seasons sits at the
          nominal rates.
        </p>
      </Section>

      <Section id="picks" title="Picks">
        <p className={p}>
          Picks come from a versioned policy, currently{" "}
          <span className="font-mono">nfl-picks-v4</span>, that selects at
          most one side per game and market across moneylines, spreads and
          totals. A pick needs the priced line to sit at least two points
          beyond the offered price&apos;s break-even line, plus positive
          estimated EV. An edge in points holds favorites and underdogs to the
          same standard.
        </p>
        <p className={p}>
          Spreads are priced off the published margin. Moneylines start from
          the market line and move only 20 percent of the way toward the pure
          model, because on 2019 through 2025 the model added nothing to the
          market on who wins outright. Totals use the model total moved
          halfway toward the median posted total. All three use the spread of
          actual results around the priced line (12.8 points on margins, 13.3
          on totals), not the engine&apos;s wider uncertainty. If fewer than
          five picks clear the gate in a week, the highest-edge positive-EV
          offers fill the slate and are recorded as floor picks.
        </p>
        <p className={p}>
          Each pick freezes its exact line, price, book and decision time and
          settles on that contract: pushes return the stake and moneyline ties
          are void. The database rejects late insertions and edits. A game
          with a missing quote, a stale forecast or an unidentified starting
          quarterback is a No Play, never backfilled. The gate has not been
          tuned on live outcomes, and estimated EV does not establish a real
          betting advantage. Record and ROI are on the{" "}
          <Link href="/nfl/performance" className={link}>
            Performance page
          </Link>
          .
        </p>
      </Section>

      <Section id="season-wins" title="Season Wins">
        <p className={p}>
          Season win projections apply the same ratings and expected
          quarterbacks to the remaining schedule, with no market blend. The
          10th, 50th and 90th percentiles come from 100,000 season draws that
          share the engine&apos;s team-strength uncertainty across games.
          Ratings and starters are held fixed, so future injuries are not
          modeled, and the ranges have not been coverage-calibrated. Preseason
          ratings already use the sportsbook win totals, so differences from
          that market are not edges.
        </p>
      </Section>

      <Section id="awards" title="Awards">
        <p className={p}>
          The awards board is a separate pipeline for MVP, Offensive and
          Defensive Player of the Year, the two Rookie awards, Comeback Player
          and Coach of the Year. Each award has its own regularized
          winner-choice model, trained only on earlier seasons at the same
          point in the year, with official winners from 2010 onward as labels.
          Offensive value is EPA credit split between passer and receiver;
          defensive value is a box-score index, not a coverage grade. Comeback
          Player is a sourced injury-return watchlist, because the criteria
          changed in 2024 and there is too little comparable history to fit.
        </p>
      </Section>

      <Section id="limits" title="Limits">
        <p className={p}>
          The model does not know about injuries beyond the starting
          quarterback, weather, mid-season coaching changes, or motivation.
          Weeks one through four lean heavily on the preseason prior. The
          published line&apos;s accuracy partly reflects the market&apos;s;
          the pure line is the model alone. The picks ledger is a few weeks
          old, so its record is a small sample. Nothing here is betting
          advice.
        </p>
      </Section>
    </div>
  );
}
