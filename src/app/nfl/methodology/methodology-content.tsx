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
      <h2 className="type-section">{title}</h2>
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
          every Tuesday on the season&apos;s play-by-play, seeded by an
          offseason prior. Adjustments for
          a changed starting quarterback and for other regulars ruled out move
          each game&apos;s line, and a capped blend toward the sportsbook
          market sets the published line, total and projected scores. The pure
          and blended lines are both graded against the closing spread. That
          is the quote the live worker captured before kickoff, or the nflverse
          schedule value recorded after the game when the worker has none, and
          each is labeled by its source. Predictions are priced from the market and go
          into a frozen ledger at a flat one unit.
        </p>
      </Section>

      <Section id="example" title="Example: How a Prediction Is Priced">
        <p className={p}>
          This is the next prediction on the slate, rebuilt from its frozen row.
          Once every game has kicked off it shows the most recently settled
          prediction instead.
        </p>
        {example ? (
          <FootballPickExample example={example} />
        ) : (
          <p className={p}>
            No prediction is stored yet. This fills in once the Tuesday
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
          Odds API for a configured set of books. When its monthly credits run
          short, a switch moves pricing to DraftKings&apos; line on ESPN&apos;s
          scoreboard, and every prediction records which feed priced it.
          Rating inputs exclude garbage time. The lead that counts as garbage
          time shrinks each quarter, and a drive is kept or dropped whole based
          on the score when it started.
        </p>
      </Section>

      <Section id="engine" title="Rating Engine">
        <p className={p}>
          Each team carries an offense and a defense rating in points per
          drive, plus a pace rating in drives per game, with a fitted
          home-field parameter (prior of two points). The model is a conjugate
          Gaussian ridge, a closed-form Bayesian update that needs no sampling.
          The posterior mean gives the fitted ratings and the posterior
          covariance gives their uncertainty. The ratings shown on the site are
          these fitted ratings, as described under Market Blend.
        </p>
        <p className={p}>
          The target fuses points per drive, what the scoreboard said, with
          EPA per drive, closer to how the team played. The two channels are
          weighted by their estimated residual covariance. Each fit uses only
          games that started before the forecast, with a calibrated recency
          half-life of six weeks. Projections come out as a Student-t
          distribution over the game margin and total.
        </p>
        <p className={p}>
          For totals, league scoring and pace keep a preseason
          prior that fades with a six-week half-life, and a linear correction
          fitted on 2016 through 2021 pulls extreme totals toward 45. On 2022
          through 2025 that trimmed total error by about a hundredth of a
          point, inside noise. The published total then moves that model
          total halfway toward the sportsbook total, as described under Market
          Blend.
        </p>
      </Section>

      <Section id="adjustments" title="Quarterback and Injury Adjustments">
        <p className={p}>
          Team ratings already absorb the quarterback play that happened, so
          the quarterback layer matters only when the projected starter
          differs from the quarterback in the rating. Each quarterback carries
          a value in points per game from EPA per dropback, shrunk toward
          replacement level by sample size and decayed with half-lives of
          1,000 dropbacks and 52 calendar weeks. The adjustment is
          the starter&apos;s value minus the value embedded in the team&apos;s
          rating window, times a weight that depends on how reliably the
          starter was identified.
        </p>
        <p className={p}>
          Production names the starter from dated depth charts and injury
          reports, with a manual override for game-day news, and uses a weight
          of 0.90. The backtest has only undated prior-week charts, which name
          the wrong starter often enough that its weight is 0.45, or 0.89 when
          the incumbent is listed Out or Doubtful. Each weight is how far the
          closing line moved per point of quarterback gap in 2016 through 2021
          games, checked against results. Historical evaluation uses each
          game&apos;s pre-kickoff availability, so an undated chart cannot
          override a newer actual starter.
        </p>
        <p className={p}>
          Regulars ruled out at other positions are priced too. A player listed
          Out or Doubtful costs his team his shrunk EPA credit per game above a
          replacement at his position, scaled by his share of the team&apos;s
          recent games. A player who has been out for weeks is already missing
          from the rating and costs little more. Offensive linemen are graded
          only as a unit, so they are left out. The loss moves the line and
          leaves the total alone, at a weight of about one point per point of
          value, fit on 2016 through 2021 the same way.
        </p>
        <p className={p}>
          A rest adjustment for byes and short weeks is wired in, but
          calibration sets its coefficient to zero because the market line in
          the blend already carries it.
        </p>
      </Section>

      <Section id="blend" title="Market Blend">
        <p className={p}>
          The published line is an even blend of the pure model margin and the
          market line. The market&apos;s weight is capped at one half, and
          calibration landed on the cap. The pure line stays on the site
          wherever a number is labeled Pure. The engine&apos;s ratings are
          estimated with no market input, and market information enters only
          at the output layer.
        </p>
        <p className={p}>
          The published total and projected scores are blended the same way.
          The model total moves halfway toward the sportsbook total posted
          when the forecast was made, and the two published scores are the
          pair whose difference is the published line and whose sum is the
          published total.
        </p>
        <p className={p}>
          Published team ratings are the fitted ratings, and they move from
          one week to the next only through games played.
          A scheduled game&apos;s published line also carries the market,
          quarterback and injury adjustments, so it can sit a few points from
          the two teams&apos; rating difference plus home field.
        </p>
        <p className={p}>
          The Compare tab on the Ratings page uses the published line where
          one exists. When the selected away team, home team and venue match
          a published game, it shows that game&apos;s published forecast: the
          line, the market line at forecast time and the projected score. For
          any other pairing or venue it shows a ratings-based line: away
          rating minus home rating minus home-field advantage, which is zero
          on a neutral field.
        </p>
        <p className={p}>
          The Ratings page also shows a market-implied rating for each team,
          fit to earlier games&apos; closing spreads with recent games weighted
          more. The fit, the blend and the predictions do not read it. Its
          gap to the fitted rating shows where the model and the market
          disagree about a team.
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
          teams, in points per game above league average. They describe a
          team and do not feed the engine. Pass blocking is charted pressure
          rate corrected for the quarterback&apos;s time to throw, and run
          blocking uses the short-area yards of each carry.
        </p>
      </Section>

      <Section id="backtest" title="Backtest">
        <p className={p}>
          Each backtest week was projected using only information available
          at the time. Hyperparameters were
          selected on 2016 through 2021. Seasons 2022 through 2025 were not used for selection, but I
          have looked at them repeatedly, so I treat them as retrospective
          validation. The first prospective test
          is the 2026 season, graded live. Its weeks were published by several
          model versions, and each game is graded on the version published
          before its kickoff. The historical preseason prior uses each team&apos;s
          actual week 1 starter as its quarterback for 2016 to 2024, a small
          hindsight a live run would not have.
        </p>
        <p className={p}>
          On 2022 through 2025 the pure model runs about a third of a point of
          mean absolute error behind the closing spread. The backtest&apos;s
          published line used the closing line as half its input, so its gap
          to the close is left out. Beating the close
          consistently is rare enough that I would suspect leakage before
          skill, so the gap is the number I report. Interval coverage on those
          seasons sits at the nominal rates.
        </p>
      </Section>

      <Section id="picks" title="Predictions">
        <p className={p}>
          Predictions are priced from the market. For each game and market
          (moneyline, spread, total), the median line across books at decision
          time, with the vig removed, sets the probability. The model&apos;s
          forecast gets no weight in that price, because fits against 2016
          through 2021 closing lines found its added information too small to
          measure, and later seasons agreed. An offer is a prediction when its
          price beats that consensus, which happens when one book is out of
          line with the others.
        </p>
        <p className={p}>
          When fewer than five games have a positive-EV offer, the best-priced
          remaining spread or moneyline sides fill a five-game weekly slate as
          ranked leans, one per game. A lean is close to a coin flip and its
          estimated EV is near zero or negative. It is staked and counted in
          the record like any other prediction, and labeled so the two tiers
          grade apart. Probabilities use the spread of actual results around
          the priced line, 12.8 points on margins and 13.3 on totals, which is
          narrower than the engine&apos;s uncertainty.
        </p>
        <p className={p}>
          Each prediction records its exact line, price, book, feed and
          decision time and settles on that contract: pushes return the stake
          and moneyline ties are void. A pending prediction can be revised
          before kickoff only when the expected starting quarterback changes,
          and the database rejects insertions and edits once a game has
          started. A game with a missing quote, a stale forecast or an
          unidentified starting quarterback is a No Play and is not backfilled. The
          policy has not been tuned on live outcomes, and estimated EV does not
          establish a real advantage over the market. Record and ROI are on
          the{" "}
          <Link href="/nfl/performance" className={link}>
            Performance page
          </Link>
          .
        </p>
        <p className={p}>
          The current policy is{" "}
          <span className="font-mono">nfl-picks-v7</span>. Through November 1,
          2026, v5 priced spreads and totals from the published blended numbers,
          required a two-point edge, and promoted floor predictions to reach
          five a week. From November 2–6, v6 moved the market price 4.5
          percent of the way toward the model and filled the slate with the
          model&apos;s sides.
        </p>
      </Section>

      <Section id="live" title="Live Win Probability">
        <p className={p}>
          During games, win probability comes from nflfastR&apos;s published
          model, which reads the score, clock, possession, down and distance,
          field position and timeouts. That model was trained with the closing
          spread as its pregame input, and here the published pregame line
          takes its place. Extra points use a single make probability, and overtime
          runs the regulation model on the overtime clock.
        </p>
      </Section>

      <Section id="season-wins" title="Season Wins">
        <p className={p}>
          Season win projections simulate each remaining game from its
          published margin: games that already have a sportsbook line use the
          blended margin, and games without a line yet use the model&apos;s
          own margin. The
          10th, 50th and 90th percentiles come from 100,000 season draws that
          share the engine&apos;s team-strength uncertainty across games.
          Ratings and starters are held fixed, so the ranges leave out future
          injuries, and they have not been coverage-calibrated. Preseason
          ratings already use the sportsbook win totals, so a difference from
          that market is not a betting edge.
        </p>
      </Section>

      <Section id="awards" title="Awards">
        <p className={p}>
          The awards board is a separate pipeline for MVP, Offensive and
          Defensive Player of the Year, the two Rookie awards, Comeback Player
          and Coach of the Year. Each award has its own regularized
          winner-choice model, trained only on earlier seasons at the same
          point in the year, with official winners from 2010 onward as labels.
          Offensive value is EPA credit split between passer and receiver.
          Defensive value is a box-score production index. Comeback
          Player is a sourced injury-return watchlist, because the criteria
          changed in 2024 and there is too little comparable history to fit.
        </p>
      </Section>

      <Section id="limits" title="Limits">
        <p className={p}>
          The model does not know about weather, mid-season coaching changes
          or motivation. It prices players listed Out or Doubtful and ignores
          those listed Questionable. Weeks one through four lean heavily on the
          preseason prior. The published line&apos;s accuracy partly reflects
          the market&apos;s, while the pure line is the model alone. The
          prediction ledger covers part of one season, so its record is a
          small sample. This is not wagering advice.
        </p>
      </Section>
    </div>
  );
}
