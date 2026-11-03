import Link from "next/link";

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
const list = "list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground";

export function MethodologyContent() {
  return (
    <div className="min-w-0">
      <Section id="overview" title="Overview">
        <p className={p}>
          The NHL model is a Poisson goal model that started as a spreadsheet
          I ran by hand for a few seasons. Each team&apos;s recent goals and
          expected goals become attack and defense strengths relative to the
          league; a matchup multiplies them into expected goals for each side;
          and a Poisson grid turns those into win probabilities and a total.
          It runs every day, freezes every decision before puck drop, and is
          graded in public.
        </p>
        <p className={p}>
          Since November 3, 2026 the strengths come from goals and MoneyPuck
          expected goals over each team&apos;s last 50 games, pulled toward
          the league average, which replaced the spreadsheet&apos;s
          shot-quality windows. Every game the books have priced publishes the
          market&apos;s win probability and a total blended halfway with the
          market. None of it is wagering advice.
        </p>
      </Section>

      <Section id="data" title="Data">
        <ul className={list}>
          <li>
            <span className={strongText}>Goals and expected goals.</span>{" "}
            <a className={link} href="https://moneypuck.com/data.htm">MoneyPuck</a>&apos;s
            team game-by-game file: goals and expected goals (MoneyPuck&apos;s
            shot-based scoring chances), for and against. The spreadsheet used
            Natural Stat Trick, which no longer serves automated requests.
          </li>
          <li>
            <span className={strongText}>Schedule, scores, teams.</span> The
            NHL&apos;s public API. A shootout win counts one goal for the
            winner, as the books settle it.
          </li>
          <li>
            <span className={strongText}>Prices.</span> The NHL&apos;s partner
            sportsbook feed, read each morning: DraftKings on the US feed and
            FanDuel on the Canadian feed. A prediction records the better of the
            two.
          </li>
          <li>
            <span className={strongText}>Historical lines.</span> Opening and
            closing moneylines and totals for the backtest seasons, from
            ESPN&apos;s public odds data. They are used to check the model
            against the market, never to price a prediction.
          </li>
        </ul>
      </Section>

      <Section id="windows" title="Windows">
        <p className={p}>
          Every team has one window: its last 50 games, home and road
          together, summing goals for and against (overtime included, the
          shootout not) and expected goals for and against. Windows end the
          day before the run and reach into the previous season, so opening
          night is priced off last season; Arizona&apos;s games count for
          Utah. A team with under ten games in its window is projected but
          never priced.
        </p>
      </Section>

      <Section id="matchup" title="Ratings and Matchup">
        <p className={p}>
          Attack strength averages two ratios to the league per-game average,
          goals for and expected goals for, each first padded with ten games
          of league-average play so a short hot or cold stretch moves it less.
          Defense strength does the same with goals and expected goals
          against, so 1.000 is average and a lower defense is better. League
          averages come from every completed season since 2021-22. The
          overall rating on the{" "}
          <Link className={link} href="/nhl/ratings">ratings page</Link> is
          twice attack minus twice defense, which keeps the spreadsheet&apos;s
          home-plus-road scale.
        </p>
        <p className={p}>
          The home team&apos;s expected goals equal its attack times the
          visitor&apos;s defense times the league average home goals per
          game; the visitor&apos;s use its attack, the home defense, and the
          league road average. Home ice comes from those two league averages,
          the same for every team. A team on the second night of a
          back-to-back scores about 7 percent fewer goals than that and its
          opponent about 5 percent more, as fitted on four seasons of
          backtest games. Each side&apos;s goals are independent
          Poisson counts: a win probability is the mass on that side of the
          diagonal plus half the tie mass, and the same grid gives over, under
          and push probabilities for a posted total.
        </p>
        <p className={p}>
          Through November 2, 2026 strengths came from the spreadsheet&apos;s
          windows: the last 25 home and 25 road games, summed by situation and
          turned into goals through a linear fit on ten shot-quality rates. On
          the 2025-26 backtest season the current method lowers log loss from
          0.709 to 0.685 and the average total miss from 1.90 to 1.84 goals.
          Separate home and road windows, weighting recent games more heavily,
          and a rolling league scoring rate did not improve it.
        </p>
      </Section>

      <Section id="market" title="Market Blend">
        <p className={p}>
          On its own the model does not beat the sportsbook market on winners.
          Checked against opening lines for the backtest seasons, once the
          price is known the model adds nothing to it, and neither do rest
          days or the quality of the expected or actual starting goalie. One thing does: a
          team that played the day before wins less often than its price says.
        </p>
        <p className={p}>
          So for every game the books have priced, the published win
          probability is the market&apos;s: the no-vig probability from each
          book that quotes both sides (the two implied probabilities scaled to
          sum to one), averaged over DraftKings and FanDuel, then moved 0.19 in
          log-odds against a team on the second night of a back-to-back. The
          model total is averaged halfway with the market&apos;s total, which
          reads the juice as well as the line: each book&apos;s no-vig over
          probability is turned into the average goal total that makes it
          true on a Poisson curve, and the median is taken across books. Even
          prices on 5.5 work out to about 5.67 goals; an over at -140 against an
          under at +120 moves it to about 6.05. On the 2025-26 opening lines that market total missed
          by 1.86 goals against 1.88 for the bare line.
        </p>
        <p className={p}>
          Each side&apos;s expected goals are then reset so the Poisson grid
          returns exactly that win probability and that total. Everything
          shown for the game, the expected goals, win probability, fair price,
          total, any prediction, and the opening point of the live win probability,
          comes from that one forecast.
        </p>
        <p className={p}>
          The partner feed only prices the current day&apos;s games, so games
          further out on the{" "}
          <Link className={link} href="/nhl/schedule">schedule</Link> show the
          model alone until the morning they are played. The halfway total
          weight is a choice, not a fitted value.
        </p>
      </Section>

      <Section id="picks" title="Pricing and Predictions">
        <p className={p}>
          The fair price is one over the published win probability, shown in
          American odds with the spreadsheet&apos;s minimum acceptable price
          beneath it: the fair decimal marked up by ten percent. The edge is
          the published probability minus the break-even probability of the
          partner-book price, vig included. Every prediction risks a flat one unit
          so results compare across sports; Kelly at ten percent of full is
          published for reference.
        </p>
        <p className={p}>
          One decision per game and market, recorded each morning for that
          day&apos;s slate and frozen at first publication. A moneyline
          qualifies when it has positive expected value at its price, which in
          practice means a back-to-back the price has not absorbed or a book
          off the consensus. A total qualifies when the published total
          differs from the posted line by at least half a goal, which is the
          spreadsheet&apos;s one-goal rule applied to the model&apos;s own
          total, and it has positive expected value at its price. A game
          without a two-sided price, or with prices older than 24 hours,
          produces No Play. A moved, postponed or cancelled game voids its
          prediction, totals push on the line, and the database rejects any
          change to a published prediction or a settled result. The record
          lives on the{" "}
          <Link className={link} href="/nhl/performance">performance page</Link>.
        </p>
        <p className={p}>
          The rules changed twice. Through October 9, 2026 predictions
          followed the spreadsheet: the model alone, 13 percentage points for
          a moneyline, and one goal for a total. From October 9 to November 2
          the forecast was the model blended halfway with the market and a
          moneyline needed 4.5 points of edge. The performance page separates
          the policies.
        </p>
      </Section>

      <Section id="backtest" title="Backtest">
        <p className={p}>
          A walk-forward replay of the 2022-23 through 2025-26 regular seasons
          prices every game from windows that end the day before it, with
          league averages from earlier seasons only (the two back-to-back
          effects are fitted on all four seasons). Across 5,248 games the
          model alone scores a log loss of 0.668 against 0.693 for a coin flip
          and predicts the winner 59 percent of the time; the model total
          misses by 1.85 goals on average. Between 40 and 70 percent, where most
          games fall, its probabilities land within a point of how often home
          teams won; the edges are rougher: games priced near 36 percent were
          won 33 percent of the time, and games near 73 percent 79 percent.
          It ran 0.14 goals low in 2025-26, when scoring rose.
        </p>
        <p className={p}>
          Over the 3,936 games from 2023-24 through 2025-26 the closing
          moneyline scores a log loss of 0.665 against 0.671 for the model, so
          the market is still better on winners. The closing total misses by
          1.87 goals on average against 1.86 for the model. Walk-forward over
          2024-25 and 2025-26, the current moneyline rule went 325-230 at the
          opening price, plus 5.3 percent per unit with an uncertainty of 4.0,
          and plus 0.8 percent at the closing price. The earlier
          spreadsheet model&apos;s totals showed no edge at any threshold, and
          the current model&apos;s totals have not shown one either.
        </p>
      </Section>

      <Section id="limits" title="Limits">
        <ul className={list}>
          <li>Overtime and the shootout are a coin flip on tied regulation scores, not a model.</li>
          <li>Home and away goals are independent, with no Dixon-Coles style correction for low scores.</li>
          <li>Home ice is the league&apos;s, not each team&apos;s.</li>
          <li>Goalies are not modeled; a backup start changes nothing.</li>
          <li>MoneyPuck can revise past expected goals, so the backtest reads today&apos;s version of earlier seasons.</li>
          <li>The puck line is read but not priced.</li>
          <li>Prices are the morning partner-feed quotes, not closing lines.</li>
          <li>The total blend weight and the prediction thresholds are choices, not fitted values.</li>
          <li>Games beyond the current day have no market price yet, so their forecast changes when the market is applied on game day.</li>
        </ul>
      </Section>

      <Section id="stack" title="Tech Stack">
        <p className={p}>
          Python with pandas, numpy and scipy in the{" "}
          <a className={link} href="https://github.com/renenunezg/momentumnhl">momentumnhl</a>{" "}
          repository, run each morning by GitHub Actions from the day before
          opening night through April. Outputs land in the{" "}
          <code className="font-mono text-xs">nhl</code> Postgres schema,
          where triggers archive every pregame forecast and enforce the ledger
          rules; this site reads only that schema.
        </p>
      </Section>
    </div>
  );
}
