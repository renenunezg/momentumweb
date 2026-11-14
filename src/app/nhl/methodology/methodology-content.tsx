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
          league. A matchup multiplies them into expected goals for each side,
          and a Poisson grid turns those into win probabilities and a total.
          It runs each morning, and its decisions freeze before puck drop and
          are graded in public.
        </p>
        <p className={p}>
          The strengths come from goals and MoneyPuck expected goals over
          each team&apos;s last 50 games, pulled toward the league average.
          For games the books have priced, the published win probability is
          the market&apos;s and the total is blended halfway with the
          market&apos;s. None of it is wagering advice.
        </p>
      </Section>

      <Section id="data" title="Data">
        <ul className={list}>
          <li>
            <a className={link} href="https://moneypuck.com/data.htm">MoneyPuck</a>&apos;s
            team game-by-game file supplies goals and expected goals
            (MoneyPuck&apos;s shot-based scoring chances), for and against. The
            spreadsheet used Natural Stat Trick, which no longer serves
            automated requests.
          </li>
          <li>
            Schedule, scores and teams come from the NHL&apos;s public API. A
            shootout win counts as one goal for the winner, which is how the
            books settle it.
          </li>
          <li>
            Prices come from the NHL&apos;s partner sportsbook feed, read each
            morning: DraftKings on the US feed and FanDuel on the Canadian feed.
            A prediction records the better of the two. The feed also carries
            the puck line and a three-way line on the result after regulation,
            and both are stored without being priced.
          </li>
          <li>
            As puck drop approaches, the live worker keeps the latest two-sided
            partner quote stamped in the last 15 minutes before the start and
            freezes it as that game&apos;s closing line. A game with no such
            quote has no close. Closes are used only to grade the forecast and
            the recorded prices.
          </li>
          <li>
            Opening and closing moneylines and totals for the backtest seasons
            come from ESPN&apos;s public odds data and are used only to check
            the model against the market.
          </li>
        </ul>
      </Section>

      <Section id="windows" title="Windows">
        <p className={p}>
          Each team has one window: its last 50 games, home and road together,
          with goals for and against (overtime included, shootout goals
          excluded) and expected goals for and against. Windows end the day
          before the run and reach into the previous season, so opening night
          is priced off last season. Arizona&apos;s games count for Utah. A
          team with under ten games in its window is projected but not
          priced.
        </p>
      </Section>

      <Section id="matchup" title="Ratings and Matchup">
        <p className={p}>
          Attack strength averages two ratios to the league per-game average,
          goals for and expected goals for, each first padded with ten games
          of league-average play so a short hot or cold stretch moves it less.
          Defense strength does the same with goals and expected goals
          against, so 1.000 is average and a lower defense is better. League
          averages come from all completed seasons since 2021-22. The
          overall rating on the{" "}
          <Link className={link} href="/nhl/ratings">ratings page</Link> is
          twice attack minus twice defense, which keeps the spreadsheet&apos;s
          home-plus-road scale.
        </p>
        <p className={p}>
          The home team&apos;s expected goals equal its attack times the
          visitor&apos;s defense times the league average home goals per
          game. The visitor&apos;s use its attack, the home defense and the
          league road average. Home ice comes from those two league averages,
          so it is the same for all teams. A team on the second night of a
          back-to-back scores about 7 percent fewer goals than that and its
          opponent about 5 percent more, as fitted on four seasons of
          backtest games. Each side&apos;s goals are independent
          Poisson counts. A win probability is the mass on that side of the
          diagonal plus half the tie mass, and the same grid gives over, under
          and push probabilities for a posted total.
        </p>
        <p className={p}>
          The spreadsheet built strengths from different windows: the last 25 home and 25 road games, summed by situation and
          turned into goals through a linear fit on ten shot-quality rates. On
          the 2025-26 backtest season the 50-game method lowers log loss from
          0.709 to 0.685 and the average total miss from 1.90 to 1.84 goals.
          Separate home and road windows, weighting recent games more heavily,
          and a rolling league scoring rate did not improve it.
        </p>
      </Section>

      <Section id="market" title="Market Blend">
        <p className={p}>
          On its own the model does not beat the sportsbook market on winners.
          Against opening lines for the backtest seasons, the model added no
          information to the price, and neither did rest days or the quality
          of the expected or actual starting goalie. The exception is a team
          that played the day before, which wins less often than its price
          says.
        </p>
        <p className={p}>
          For games the books have priced, the published win probability is
          the market&apos;s no-vig probability from each book that quotes both
          sides (the two implied probabilities scaled to sum to one), averaged
          over DraftKings and FanDuel and moved 0.19 in log-odds against a
          team on the second night of a back-to-back. The model total is
          averaged halfway with a market total that reads the juice as well as
          the line. Each book&apos;s no-vig over probability is converted to
          the average goal total that makes it true on a Poisson curve, and
          the median is taken across books. Even prices on 5.5 work out to
          about 5.67 goals, and an over at -140 against an under at +120 to
          about 6.05. On the 2025-26 opening lines that market total missed by
          1.86 goals against 1.88 for the bare line.
        </p>
        <p className={p}>
          Each side&apos;s expected goals are then reset so the Poisson grid
          returns that win probability and that total. The expected goals, win
          probability, fair price, total, any prediction and the opening point
          of the live win probability all come from that forecast.
        </p>
        <p className={p}>
          The partner feed only prices the current day&apos;s games, so games
          further out on the{" "}
          <Link className={link} href="/nhl/schedule">schedule</Link> show the
          model alone until the morning they are played. The halfway total
          weight is my choice and was not fitted.
        </p>
      </Section>

      <Section id="picks" title="Pricing and Predictions">
        <p className={p}>
          The fair price is one over the published win probability, shown in
          American odds with the spreadsheet&apos;s minimum acceptable price
          beneath it, which is the fair decimal price marked up by ten
          percent. The edge is
          the published probability minus the break-even probability of the
          partner-book price, vig included. Each prediction risks a flat one
          unit so results compare across sports. Kelly at ten percent of full
          is published for reference.
        </p>
        <p className={p}>
          Each game gets one decision per market, recorded each morning for
          that day&apos;s slate and frozen at first publication. A moneyline
          qualifies when it has positive expected value at its price, which in
          practice means a back-to-back the price has not absorbed or a book
          off the consensus. A total qualifies when the published total
          differs from the posted line by at least half a goal, which is the
          spreadsheet&apos;s one-goal rule applied to the model&apos;s own
          total, and it has positive expected value at its price. A game
          without a two-sided price produces No Play, and so does a price the
          feed stamped more than 24 hours earlier, unless it is a DraftKings
          price found unchanged on DraftKings&apos; public betting listing
          within 15 minutes of the decision. FanDuel prices have no such
          check. A moved, postponed or cancelled game voids its
          prediction, totals push on the line, and the database rejects any
          change to a published prediction or a settled result.
        </p>
        <p className={p}>
          The{" "}
          <Link className={link} href="/nhl/performance">performance page</Link>{" "}
          has the record by market, month, edge and pick rule, how the recorded
          prices compare with the closing line, and the forecast&apos;s log
          loss and total error against the market, for the live season and the
          backtest. On the{" "}
          <Link className={link} href="/nhl/games">games page</Link>, each game
          in progress opens its live win probability and how it is computed.
        </p>
        <p className={p}>
          Earlier pick rules, kept apart on the performance page:
        </p>
        <ul className={list}>
          <li>
            nhl-picks-v1 and v1.1 (to October 9, 2026): the spreadsheet&apos;s
            rules on the model alone, 13 percentage points for a moneyline and
            one goal for a total. v1.1 added the DraftKings listing check.
          </li>
          <li>
            nhl-picks-v2 (October 9 to November 2): the model blended halfway
            with the market, and a moneyline needed 4.5 points of edge.
          </li>
          <li>
            nhl-picks-v2.1 (36 minutes on November 2): totals also needed
            positive expected value.
          </li>
          <li>
            nhl-picks-v3 (current): the rules described above, with moneylines
            priced at the market consensus and its back-to-back shift.
          </li>
        </ul>
      </Section>

      <Section id="backtest" title="Backtest">
        <p className={p}>
          A walk-forward replay of the 2022-23 through 2025-26 regular seasons
          prices each game from windows that end the day before it, with
          league averages from earlier seasons only (the two back-to-back
          effects are fitted on all four seasons). Across 5,248 games the
          model alone scores a log loss of 0.668 against 0.693 for a coin flip
          and predicts the winner 59 percent of the time. The model total
          misses by 1.85 goals on average. Between 40 and 70 percent, where most
          games fall, its probabilities land within a point of how often home
          teams won. The edges are rougher: games priced near 36 percent were
          won 33 percent of the time, and games near 73 percent 79 percent.
          Its totals ran 0.16 goals low in 2025-26, when scoring rose.
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
          <li>Overtime and the shootout are treated as a coin flip on tied regulation scores.</li>
          <li>Home and away goals are independent, with no Dixon-Coles style correction for low scores.</li>
          <li>Home ice is one league-wide value for all teams.</li>
          <li>Goalies are not modeled, so a backup start does not change the forecast.</li>
          <li>MoneyPuck can revise past expected goals, so the backtest reads today&apos;s version of earlier seasons.</li>
          <li>The puck line and the three-way regulation line are stored but not priced.</li>
          <li>Predictions take the morning partner-feed price. The closing line is recorded only to grade them.</li>
          <li>The total blend weight and the prediction thresholds are my choices and were not fitted.</li>
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
          where triggers archive each pregame forecast and enforce the ledger
          rules. This site reads only that schema.
        </p>
      </Section>
    </div>
  );
}
