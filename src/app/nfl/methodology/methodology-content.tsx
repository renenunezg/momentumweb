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

export function MethodologyContent() {
  return (
    <div className="min-w-0">
      <Section id="overview" title="Overview">
        <p className={p}>
          The NFL model produces weekly power ratings and point spread
          projections for all 32 teams. Its engine is a Bayesian regression
          fit from scratch every week on the season&apos;s play-by-play data:
          no Elo chains, no manual adjustments carried between weeks. Around
          that engine sit four layers: a starting quarterback adjustment, a
          rest adjustment, an offseason prior built from mean reversion and
          the season win-total market, and a capped blend toward the betting
          market on the published line.
        </p>
        <p className={p}>
          Every published number keeps its provenance: the pure model line is
          stored next to the blended line, and the backtest grades the model
          against the closing spread, the strongest public benchmark there
          is. Nothing on this site is betting advice.
        </p>
      </Section>

      <Section id="data" title="Data">
        <p className={p}>
          All football data comes from the open source{" "}
          <span className={strongText}>nflverse</span> project: play-by-play
          with expected points added (EPA) per play, schedules with closing
          spread and total lines, depth charts, and injuries. Charted pressure
          data from Pro Football Reference and quarterback time-to-throw from
          Next Gen Stats feed the offensive line unit ratings. Live spread and
          total offers with prices come from The Odds API. History runs from
          2015; historical team codes are normalized to current franchises so
          the 32 teams are continuous.
        </p>
        <p className={p}>
          Plays in garbage time (large leads scaled by quarter) are excluded
          from every rating input, so running up or conceding late points does
          not move a team&apos;s rating.
        </p>
      </Section>

      <Section id="engine" title="Rating Engine">
        <p className={p}>
          Each team carries an offense rating and a defense rating in points
          per drive, plus a pace rating in drives per game. A game
          contributes two observations, one per side: the home offense
          against the away defense and vice versa, with a fitted home-field
          parameter (prior of two points) split between them. The model is a
          conjugate Gaussian ridge: a closed-form Bayesian update whose
          posterior mean gives the ratings and whose posterior covariance
          gives honest uncertainty for every rating and every projection.
        </p>
        <p className={p}>
          The target fuses two signals: points per drive (what happened on
          the scoreboard) and EPA per drive (the quality of the underlying
          process). EPA is first rescaled onto points, then the two channels
          are combined in proportion to how informative each one is, measured
          from their residual covariance. The fusion weights are estimated,
          not hand-picked.
        </p>
        <p className={p}>
          The fit is refit from scratch before every projected week using
          only games that started before the forecast, with a recency
          half-life of six weeks selected by calibration. Projections come
          out as a full distribution over the game margin and total, so the
          spread, the total, and their uncertainties all come from one place.
        </p>
      </Section>

      <Section id="adjustments" title="QB and Rest Adjustments">
        <p className={p}>
          Team ratings absorb the quarterback play that actually happened, so
          the QB layer exists for one case: the week the projected starter
          differs from the quarterback play baked into the rating. Every
          quarterback carries a rolling value in points per game, built from
          career EPA per dropback, shrunk toward replacement level by sample
          size. The game adjustment is the projected starter&apos;s value
          minus the value embedded in the team&apos;s rating window. It is
          zero in the normal case and moves several points when a starter
          sits. Projected starters come from depth charts with a manual
          override file for game-day news.
        </p>
        <p className={p}>
          A rest adjustment from schedule rest days (byes, short weeks) is
          wired in the same way. Calibration currently tunes its coefficient
          to zero: at the selected market blend the line already carries the
          rest information, so the model does not double count it.
        </p>
      </Section>

      <Section id="blend" title="Market Blend">
        <p className={p}>
          The published line is a weighted blend of the pure model margin and
          the market line, with the market weight selected by calibration and
          hard-capped at one half so the model can never become an echo of
          the market. Ratings are never touched by the market: the blend is
          applied at the output only, and the pure model line is published
          alongside the blended one so the model&apos;s own opinion is always
          visible.
        </p>
        <p className={p}>
          Cover and push probabilities for priced offers use a discrete
          margin distribution rather than a smooth curve, because NFL margins
          pile up on three, six, seven and ten. A continuous distribution
          misprices those key numbers and cannot price a push at all.
        </p>
      </Section>

      <Section id="preseason" title="Preseason">
        <p className={p}>
          Week one has no games to learn from, so the preseason prior blends
          two signals: last season&apos;s final ratings regressed halfway
          toward the league mean, and a rating implied by the Vegas season
          win-total market, which prices offseason change (quarterback moves,
          coaching, roster) that reversion cannot see. The blend weights and
          the reversion strength were selected on early-season accuracy in
          the development seasons. The preseason ratings also serve as prior
          means for the in-season fits, so September ratings start from
          carried-over beliefs instead of zero and let the data take over as
          games accumulate.
        </p>
      </Section>

      <Section id="units" title="Unit Ratings">
        <p className={p}>
          The Units view shows opponent-adjusted ratings for rushing and
          passing offense and defense, pass blocking, run blocking, and
          special teams, each in points per game above league average. They
          are companions for reading a team, not components of the engine:
          they do not sum to the offense and defense numbers, and the model
          does not consume them.
        </p>
        <p className={p}>
          The line ratings deserve their caveat: offensive line play is not
          directly observable in public data. Pass blocking uses charted
          pressures and sacks allowed, corrected for the quarterback&apos;s
          time to throw so a quarterback who holds the ball does not tank his
          line&apos;s grade. Run blocking credits the line for the short-area
          yards of each carry. Both attribute outcomes to units without
          snap-level film, so treat them as informed estimates.
        </p>
      </Section>

      <Section id="backtest" title="Backtest">
        <p className={p}>
          Every number on the History and Performance pages comes from a
          walk-forward backtest: each week of each season was projected using
          only information available at that time, including the preseason
          prior built only from earlier seasons. Model hyperparameters were
          selected on 2016 through 2021; the seasons from 2022 onward were
          never touched by selection and are the honest read on accuracy.
        </p>
        <p className={p}>
          The benchmark is the closing spread. The blended model line runs
          within a few tenths of a point of the closing line&apos;s mean
          absolute error on the holdout seasons; the pure model runs about
          three quarters of a point behind. Beating the close consistently is
          rare, and claiming to is usually a sign of leakage, which is why
          the gap is reported rather than hidden.
        </p>
      </Section>

      <Section id="limits" title="Limits">
        <p className={p}>
          The model does not know about injuries beyond the starting
          quarterback, weather, coaching changes mid-season, or motivation.
          Its interval coverage runs slightly narrow at the selected
          calibration. Week one to four ratings lean heavily on the preseason
          prior. The unit line ratings are proxies. And the published line
          deliberately borrows from the market, so its accuracy partly
          reflects the market&apos;s; the pure line is the model alone.
        </p>
        <p className={p}>
          Nothing here is betting advice, and the pipeline never recommends
          a bet.
        </p>
      </Section>

      <Section id="stack" title="Tech Stack">
        <p className={p}>
          The backend is Python: pandas and numpy for the engine (the
          Bayesian update is a closed-form linear solve, so a full weekly
          refit takes milliseconds), nflreadpy for nflverse data, and a
          six-table publish into Postgres on Supabase. GitHub Actions runs
          the pipeline on a Tuesday full run and Sunday and Thursday
          refreshes that re-check starters and lines. This site reads the
          published tables directly and renders on Vercel.
        </p>
      </Section>
    </div>
  );
}
