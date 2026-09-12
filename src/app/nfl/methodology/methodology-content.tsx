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
      <h2 className="font-heading text-xl tracking-tight">{title}</h2>
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
          The NFL model produces weekly power ratings and point spread
          projections for all 32 teams. The engine is a Bayesian regression
          refit from scratch every week on the season&apos;s play-by-play
          data. There is no Elo chain and nothing carried by hand from one
          week to the next. Around the engine sit four layers: a starting
          quarterback adjustment, a rest adjustment, an offseason prior built
          from mean reversion and the season win-total market, and a capped
          blend toward the betting market on the published line.
        </p>
        <p className={p}>
          Every published number keeps its provenance. The pure model line is
          stored next to the blended line, and both are graded against the
          closing spread, which is the strongest public benchmark I know of.
          The model also publishes picks under a versioned policy, graded at
          a flat one unit, so there is an actual ledger to judge it by. None
          of it is betting advice.
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
          All football data comes from the open source{" "}
          <span className={strongText}>nflverse</span> project: play-by-play
          with expected points added (EPA) per play, schedules with closing
          spread and total lines, and depth charts. Charted pressure data
          from Pro Football Reference and quarterback time-to-throw from
          Next Gen Stats feed the offensive line unit ratings. Spread, total
          and moneyline offers with prices come from The Odds API. History
          runs from 2015, with old team codes mapped to current franchises so
          the 32 teams are continuous across relocations.
        </p>
        <p className={p}>
          Garbage time is excluded from every rating input. The lead
          threshold shrinks by quarter, and a whole drive is kept or dropped
          based on the score when it started, so running up or conceding late
          points does not move a rating. Full-game scores still set the
          scoring environment, so the competitive filter never attributes a
          final score to fewer possessions than actually happened.
        </p>
      </Section>

      <Section id="engine" title="Rating Engine">
        <p className={p}>
          Each team carries an offense rating and a defense rating in points
          per drive, plus a pace rating in drives per game. A game
          contributes two observations, one per side: the home offense
          against the away defense and vice versa, with a fitted home-field
          parameter (prior of two points) split between them. The model is a
          conjugate Gaussian ridge, which is to say a closed-form Bayesian
          update. The posterior mean gives the ratings and the posterior
          covariance gives the uncertainty on every rating and every
          projection, without any sampling.
        </p>
        <p className={p}>
          The target fuses two signals: points per drive, which is what the
          scoreboard said, and EPA per drive, which is closer to how the
          team actually played. EPA is first rescaled onto points, then the
          two channels are combined in proportion to how informative each one
          has been, measured from their residual covariance. The fusion
          weights are estimated, not hand-picked.
        </p>
        <p className={p}>
          The fit is redone before every projected week using only games that
          started before the forecast, with a recency half-life of six weeks
          selected by calibration. Projections come out as a full Student-t
          distribution over the game margin and total, so the spread, the
          total and their uncertainties all come from one place.
        </p>
      </Section>

      <Section id="adjustments" title="QB and Rest Adjustments">
        <p className={p}>
          Team ratings already absorb the quarterback play that happened, so
          the QB layer exists for one case: the week the projected starter
          differs from the quarterback play baked into the rating. Every
          quarterback carries a rolling value in points per game, built from
          EPA per dropback and shrunk toward replacement level by sample size.
          Old evidence decays with two half-lives, 1,000 dropbacks and 52
          calendar weeks, so a quarterback who has not played in a while is
          not carried on stale numbers. The game adjustment is the projected
          starter&apos;s value minus the value embedded in the team&apos;s
          rating window. It is zero in the normal case and moves several
          points when a starter sits. Projected starters come from depth
          charts with a manual override file for game-day news.
        </p>
        <p className={p}>
          A rest adjustment from schedule rest days (byes, short weeks) is
          wired in the same way. Calibration currently tunes its coefficient
          to zero: at the selected market blend the line already carries the
          rest information, so the model does not count it twice.
        </p>
      </Section>

      <Section id="blend" title="Market Blend">
        <p className={p}>
          The published line is a weighted blend of the pure model margin and
          the market line. The weight is selected by calibration and
          hard-capped at one half, so the model can never become an echo of
          the market; the search landed on the cap. Ratings are never touched
          by the market. The blend is applied at the output only, and the
          pure model line is published alongside the blended one so the
          model&apos;s own opinion is always visible.
        </p>
        <p className={p}>
          Cover and push probabilities use a discrete margin distribution
          rather than a smooth curve, because NFL margins pile up on a few
          numbers (three and seven above all). Per-margin multipliers are
          learned from the development seasons and applied on top of each
          game&apos;s continuous location and scale before pricing. A
          continuous distribution misprices those key numbers and cannot
          price a push at all.
        </p>
      </Section>

      <Section id="preseason" title="Preseason">
        <p className={p}>
          Week one has no games to learn from, so the preseason prior blends
          two signals: last season&apos;s final ratings regressed halfway
          toward the league mean, and a rating implied by the sportsbook
          season win-total market, which prices offseason change
          (quarterback moves, coaching, roster) that reversion cannot see.
          The blend weights and the reversion strength were selected on
          early-season accuracy in the development seasons. The preseason
          ratings also serve as prior means and covariance for the in-season
          fits, so September ratings start from carried-over beliefs instead
          of zero and let the data take over as games accumulate.
        </p>
      </Section>

      <Section id="units" title="Unit Ratings">
        <p className={p}>
          The Units view shows opponent-adjusted ratings for rushing and
          passing offense and defense, pass blocking, run blocking, and
          special teams, each in points per game above league average. They
          are there for reading a team. They do not sum to the offense and
          defense numbers, and the engine does not consume them.
        </p>
        <p className={p}>
          The line ratings deserve their caveat, because offensive line play
          is not directly observable in public data. Pass blocking uses
          charted pressure rate, corrected for the quarterback&apos;s time to
          throw so a quarterback who holds the ball does not tank his
          line&apos;s grade. Run blocking credits the line for the short-area
          yards of each carry against a league baseline. Both attribute
          outcomes to units without snap-level film, so treat them as
          informed estimates.
        </p>
      </Section>

      <Section id="backtest" title="Backtest">
        <p className={p}>
          Every number on the History and Performance pages comes from a
          walk-forward backtest: each week of each season was projected using
          only information available at that time, including a preseason
          prior built only from earlier seasons. Model hyperparameters were
          selected on 2016 through 2021. Seasons 2022 through 2025 were not
          used for selection, but I have looked at them repeatedly while
          developing the model, so I call them retrospective validation
          rather than a clean holdout. The first prospective test of this
          revision is the 2026 season, graded live.
        </p>
        <p className={p}>
          The benchmark is the closing spread. On 2022 through 2025 the
          blended line runs about a tenth of a point behind the closing
          line&apos;s mean absolute error, and the pure model about four
          tenths behind. The historical close is a conditional benchmark, not
          a replay of what was available early in the week. Beating the close
          consistently is rare enough that I would suspect leakage before
          skill, my own included, so the gap is the number I report. Interval
          coverage on those seasons sits at the nominal rates.
        </p>
      </Section>

      <Section id="picks" title="Picks">
        <p className={p}>
          Picks come from a versioned policy, currently{" "}
          <span className="font-mono">nfl-picks-v2</span>, that selects at
          most one side per game and market across moneylines, spreads and
          totals. A pick needs at least 4.5 percentage points of probability
          above the recorded price&apos;s break-even, conditional on no push,
          plus positive estimated EV. Sides are priced off the published
          (blended) margin with the discrete key-number mass; totals use the
          model total shrunk toward the median posted total at the same
          weight. Every edge is measured after shrinking toward the market
          being bet into, so the policy has to clear the market twice.
        </p>
        <p className={p}>
          Stakes are a flat one unit. Each pick records the exact line, price,
          book and decision time, then settles at that frozen contract with
          confirmed final scores: spread and total pushes return the stake,
          and moneyline ties are void. The database rejects late insertions,
          edits to frozen picks and changes to settled results. A game with a
          missing quote, a stale forecast or an unidentified starting
          quarterback is a No Play, and No Plays are never backfilled. The
          4.5-point gate is where I started, and it has not been tuned on live
          outcomes. Estimated EV does not establish a real betting advantage.
          Record and ROI are on the{" "}
          <Link href="/nfl/performance" className={link}>
            Performance page
          </Link>
          .
        </p>
      </Section>

      <Section id="season-wins" title="Season Wins">
        <p className={p}>
          Season win projections apply the same ratings and current expected
          quarterbacks to the full remaining schedule, with no game-line
          blend. Expected wins are completed wins plus the sum of remaining
          Student-t win probabilities. The 10th, 50th and 90th percentiles
          come from 100,000 season draws through a Gaussian copula that
          shares the engine&apos;s team-strength and home-field uncertainty
          across games while keeping game residuals independent. Ratings and
          starters are held fixed through the schedule, so future injuries
          and roster changes are not modeled, and the ranges have not been
          coverage-calibrated. Because preseason ratings already use the
          sportsbook win totals, differences from that market are not edges.
        </p>
      </Section>

      <Section id="awards" title="Awards">
        <p className={p}>
          The awards board is a separate pipeline for MVP, Offensive and
          Defensive Player of the Year, the two Rookie awards, Comeback Player
          and Coach of the Year. Each award uses its own regularized
          winner-choice model, trained only on earlier seasons at the same
          point in the year, with official winners from 2010 onward as the
          labels. Offensive value is competitive-drive EPA credit split
          between passer and receiver against a positional baseline, shrunk
          on small samples. Defensive value is a standardized box-score index
          and should not be mistaken for a coverage grade. Neither feeds team
          ratings. Comeback
          Player currently serves a sourced injury-return watchlist rather
          than a fitted forecast, because the award&apos;s criteria changed
          in 2024 and there is not enough comparable history yet.
        </p>
      </Section>

      <Section id="limits" title="Limits">
        <p className={p}>
          The model does not know about injuries beyond the starting
          quarterback, weather, mid-season coaching changes, or motivation.
          Weeks one through four lean heavily on the preseason prior. The
          unit line ratings are proxies. The published line deliberately
          borrows from the market, so its accuracy partly reflects the
          market&apos;s; the pure line is the model alone. And the picks
          ledger is a few weeks old, so its record is a small sample.
        </p>
        <p className={p}>Nothing here is betting advice.</p>
      </Section>

      <Section id="stack" title="Tech Stack">
        <p className={p}>
          The backend is Python: pandas and numpy for the engine (the Bayesian
          update is a closed-form linear solve, so a weekly refit is
          effectively instant), scipy for the Student-t pricing, nflreadpy
          for nflverse data, and a publish step that writes the serving tables
          into Postgres on Supabase in one transaction. Supabase pg_cron owns
          the schedule and dispatches GitHub Actions: a weekly run on Tuesday
          after Monday Night Football, a daily refresh that only does work
          when a kickoff falls within the next 30 hours, and a Wednesday
          awards run. This site reads the published tables directly and
          renders on Vercel.
        </p>
      </Section>
    </div>
  );
}
